"""FastAPI entrypoint for the Vyoman Interviewer engine service.

Phase 0 scope was project skeleton + health check only. This phase adds the
interview turn-based loop (docs/BUILD_SPEC.md Part 4.5) as thin wrappers
around `app/interview/engine.py` — request/response validation and HTTP
status mapping live here; all state-machine logic lives in the engine
module. No auth middleware yet: "the engine trusts its caller" (the engine
service role is the only writer, per BUILD_SPEC Part 4.1/Part 5) — these
routes instead validate that the ids given actually exist and that the
interview/turn is in a sane state for the requested action (translated into
404/409/422 below).
"""

from __future__ import annotations

from dataclasses import asdict
import hmac
import os
from typing import Any

from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from pydantic import BaseModel
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse

from app.chat import engine as chat_engine
from app.internal.manual_test_harness import router as internal_test_interview_router
from app.interview import engine
from app.providers import r2
from app.providers.gemini import GeminiError
from app.providers.redis_client import check_rate_limit
from app.resume import engine as resume_engine

app = FastAPI(title="Vyoman Interviewer Engine")


class EngineAuthMiddleware(BaseHTTPMiddleware):
    """Enforces shared-secret API authentication on incoming engine requests.

    When ENGINE_API_SECRET is set in the environment (e.g. in Cloud Run production),
    all non-public routes require a matching 'Authorization: Bearer <secret>' or
    'X-Engine-Secret: <secret>' header. Health checks and docs remain exempt.
    """

    async def dispatch(self, request: Request, call_next):
        # Exclude liveness/readiness probes and API docs
        if request.url.path in (
            "/health",
            "/docs",
            "/openapi.json",
            "/redoc",
            "/internal/test-interview",
        ):
            return await call_next(request)

        secret = os.environ.get("ENGINE_API_SECRET", "").strip()
        if not secret:
            # Pass-through when no secret configured (local dev/offline testing)
            return await call_next(request)

        auth_header = request.headers.get("authorization", "")
        x_secret = request.headers.get("x-engine-secret", "")

        token = ""
        if auth_header.lower().startswith("bearer "):
            token = auth_header[7:].strip()
        elif x_secret:
            token = x_secret.strip()

        if not token or not hmac.compare_digest(token, secret):
            return JSONResponse(
                status_code=401,
                content={"error": "Unauthorized: valid engine secret required."},
            )

        return await call_next(request)


app.add_middleware(EngineAuthMiddleware)

app.include_router(internal_test_interview_router)


@app.get("/health")
def health() -> dict[str, str]:
    """Liveness/readiness check used by Cloud Run and local tooling."""
    return {"status": "ok"}


# ---------------------------------------------------------------------------
# Interview turn loop (BUILD_SPEC Part 4.5)
# ---------------------------------------------------------------------------


class CreateInterviewRequest(BaseModel):
    user_id: str
    interview_type: str
    difficulty: str
    target_role: str | None = None
    company_type: str | None = None
    college_id: str | None = None


class CreateInterviewResponse(BaseModel):
    id: str
    status: str


class ReportResponse(BaseModel):
    status: str
    scores: dict | None = None
    overall_score: float | None = None
    strengths: list[str] = []
    weak_areas_summary: list[dict] = []
    practice_actions: list[str] = []
    model_id: str | None = None
    prompt_version: str | None = None
    error_message: str | None = None


class NextTurnResponse(BaseModel):
    interview_finished: bool
    turn_id: str | None = None
    turn_number: int | None = None
    stage: str | None = None
    question_text: str | None = None
    question_source: str | None = None
    question_bank_id: str | None = None
    is_follow_up: bool = False
    follow_up_of_turn_id: str | None = None
    question_audio_url: str | None = None


class SubmitAnswerResponse(BaseModel):
    turn_id: str
    transcript: str
    stt_provider: str
    stt_fallback_used: bool
    next_turn: NextTurnResponse


class FinishInterviewRequest(BaseModel):
    eye_contact_pct: float | None = None
    posture_stability_pct: float | None = None


class FinishInterviewResponse(BaseModel):
    status: str = "completed"


class UploadUrlResponse(BaseModel):
    upload_url: str
    audio_key: str


def _as_next_turn_response(result: engine.NextTurnResult) -> NextTurnResponse:
    return NextTurnResponse(**asdict(result))


def _raise_for_engine_error(exc: engine.InterviewEngineError) -> None:
    """Translate an engine state error into the matching HTTP status."""
    if isinstance(exc, engine.QuotaExhaustedError):
        raise HTTPException(status_code=403, detail=str(exc)) from exc
    if isinstance(exc, (engine.InterviewNotFoundError, engine.TurnNotFoundError)):
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    if isinstance(exc, (engine.AnswerTooLongError, engine.NoActiveTemplateError)):
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    if isinstance(exc, engine.InvalidInterviewStateError):
        raise HTTPException(status_code=409, detail=str(exc)) from exc
    raise HTTPException(status_code=400, detail=str(exc)) from exc


@app.post("/interviews", response_model=CreateInterviewResponse)
async def post_create_interview(body: CreateInterviewRequest) -> CreateInterviewResponse:
    allowed = await check_rate_limit(f"ratelimit:create_interview:{body.user_id}", limit=10, window_seconds=600)
    if not allowed:
        raise HTTPException(
            status_code=429,
            detail="Rate limit exceeded. Please wait a few minutes before starting another interview.",
        )
    try:
        result = await engine.create_interview(
            user_id=body.user_id,
            interview_type=body.interview_type,
            difficulty=body.difficulty,
            target_role=body.target_role,
            company_type=body.company_type,
            college_id=body.college_id,
        )
    except engine.InterviewEngineError as exc:
        _raise_for_engine_error(exc)
        raise  # unreachable: _raise_for_engine_error always raises
    return CreateInterviewResponse(id=result.interview_id, status=result.status)


@app.get("/interviews/{interview_id}/report", response_model=ReportResponse)
async def get_interview_report(interview_id: str) -> ReportResponse:
    try:
        result = await engine.get_report(interview_id)
    except engine.InterviewEngineError as exc:
        _raise_for_engine_error(exc)
        raise  # unreachable: _raise_for_engine_error always raises
    return ReportResponse(**asdict(result))


@app.post("/interviews/{interview_id}/turns/next", response_model=NextTurnResponse)
async def post_next_turn(interview_id: str) -> NextTurnResponse:
    try:
        result = await engine.get_next_turn(interview_id)
    except engine.InterviewEngineError as exc:
        _raise_for_engine_error(exc)
        raise  # unreachable: _raise_for_engine_error always raises
    return _as_next_turn_response(result)


@app.post(
    "/interviews/{interview_id}/turns/{turn_id}/upload-url",
    response_model=UploadUrlResponse,
)
async def post_turn_upload_url(interview_id: str, turn_id: str) -> UploadUrlResponse:
    audio_key = f"answers/{interview_id}/{turn_id}.webm"
    try:
        upload_url = r2.generate_upload_url(audio_key)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to generate upload URL: {exc}") from exc
    return UploadUrlResponse(upload_url=upload_url, audio_key=audio_key)


@app.get("/interviews/{interview_id}/turns")
async def get_interview_turns(interview_id: str) -> list[dict[str, Any]]:
    try:
        return await engine.get_interview_turns(interview_id)
    except engine.InterviewEngineError as exc:
        _raise_for_engine_error(exc)
        raise


@app.post(
    "/interviews/{interview_id}/turns/{turn_id}/answer",
    response_model=SubmitAnswerResponse,
)
async def post_submit_answer(
    interview_id: str,
    turn_id: str,
    audio: UploadFile | None = File(None),  # noqa: B008
    audio_key: str | None = Form(None),
    answer_duration_seconds: float = Form(...),
    candidate_code: str | None = Form(None),
    code_language: str | None = Form(None),
) -> SubmitAnswerResponse:
    audio_bytes = await audio.read() if audio is not None else None
    if not audio_bytes and not audio_key:
        raise HTTPException(status_code=422, detail="Either audio file or audio_key must be provided")

    try:
        result = await engine.submit_answer(
            interview_id,
            turn_id,
            audio_bytes=audio_bytes,
            answer_duration_seconds=answer_duration_seconds,
            audio_key=audio_key,
            candidate_code=candidate_code,
            code_language=code_language,
        )
    except engine.InterviewEngineError as exc:
        _raise_for_engine_error(exc)
        raise  # unreachable: _raise_for_engine_error always raises
    return SubmitAnswerResponse(
        turn_id=result.turn_id,
        transcript=result.transcript,
        stt_provider=result.stt_provider,
        stt_fallback_used=result.stt_fallback_used,
        next_turn=_as_next_turn_response(result.next_turn),
    )


@app.post("/interviews/{interview_id}/finish", response_model=FinishInterviewResponse)
async def post_finish_interview(
    interview_id: str,
    body: FinishInterviewRequest | None = None,
) -> FinishInterviewResponse:
    eye_contact = body.eye_contact_pct if body else None
    posture = body.posture_stability_pct if body else None
    try:
        await engine.finish_interview(
            interview_id,
            eye_contact_pct=eye_contact,
            posture_stability_pct=posture,
        )
    except engine.InterviewEngineError as exc:
        _raise_for_engine_error(exc)
        raise  # unreachable: _raise_for_engine_error always raises
    return FinishInterviewResponse()


@app.post("/interviews/{interview_id}/report/retry", response_model=FinishInterviewResponse)
async def post_retry_report(interview_id: str) -> FinishInterviewResponse:
    from app.db import get_client
    from app.reports.worker import evaluate_and_save_report

    client = await get_client()
    ok = await evaluate_and_save_report(interview_id, client=client)
    if not ok:
        raise HTTPException(status_code=500, detail="Failed to evaluate interview report after retries")
    return FinishInterviewResponse()


# ---------------------------------------------------------------------------
# Resume (BUILD_SPEC Part 4.3/4.4): bullet rewriting and the scanner.
# ---------------------------------------------------------------------------


class RewriteBulletRequest(BaseModel):
    bullet: str
    user_id: str
    college_id: str | None = None


class RewriteBulletResponse(BaseModel):
    kind: str
    text: str | None = None
    question: str | None = None


@app.post("/resume/bullet/rewrite", response_model=RewriteBulletResponse)
async def post_rewrite_bullet(body: RewriteBulletRequest) -> RewriteBulletResponse:
    if not body.bullet.strip():
        raise HTTPException(status_code=422, detail="bullet must not be empty")
    try:
        result = await resume_engine.rewrite_bullet(
            body.bullet, user_id=body.user_id, college_id=body.college_id
        )
    except GeminiError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc
    return RewriteBulletResponse(kind=result.kind, text=result.text, question=result.question)


class ScanResumeRequest(BaseModel):
    user_id: str
    college_id: str | None = None
    resume_id: str | None = None
    job_description_id: str | None = None
    resume_data: dict | None = None
    pdf_base64: str | None = None
    job_description_text: str | None = None


class ScanResumeResponse(BaseModel):
    scan_id: str
    parsed_resume: dict
    parse_health: dict
    jd_match: dict | None = None
    bullet_quality: dict
    formatting_risks: dict


@app.post("/resume/scan", response_model=ScanResumeResponse)
async def post_scan_resume(body: ScanResumeRequest) -> ScanResumeResponse:
    """BUILD_SPEC Part 4.4. Exactly one of `resume_data`/`pdf_base64` must
    be given — `resume_engine.scan_resume` raises `ValueError` otherwise,
    translated to 422 here rather than letting FastAPI 500 on it."""
    allowed = await check_rate_limit(f"ratelimit:scan_resume:{body.user_id}", limit=15, window_seconds=60)
    if not allowed:
        raise HTTPException(
            status_code=429,
            detail="Rate limit exceeded for resume scanning. Please wait a moment.",
        )
    try:
        result = await resume_engine.scan_resume(
            user_id=body.user_id,
            college_id=body.college_id,
            resume_id=body.resume_id,
            job_description_id=body.job_description_id,
            resume_data=body.resume_data,
            pdf_base64=body.pdf_base64,
            job_description_text=body.job_description_text,
        )
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    except GeminiError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc
    return ScanResumeResponse(
        scan_id=result.scan_id,
        parsed_resume=result.parsed_resume,
        parse_health=result.parse_health,
        jd_match=result.jd_match,
        bullet_quality=result.bullet_quality,
        formatting_risks=result.formatting_risks,
    )


# ---------------------------------------------------------------------------
# Knowledge Base & Prep Assistant (BUILD_SPEC Part 4.6 / Part 4.8)
# ---------------------------------------------------------------------------


class EmbedDocumentRequest(BaseModel):
    reviewer_id: str | None = None


class EmbedDocumentResponse(BaseModel):
    ok: bool
    document_id: str
    chunks_created: int


@app.post("/kb/documents/{document_id}/embed", response_model=EmbedDocumentResponse)
async def post_embed_document(
    document_id: str,
    body: EmbedDocumentRequest | None = None,
) -> EmbedDocumentResponse:
    reviewer_id = body.reviewer_id if body else None
    try:
        result = await chat_engine.embed_and_save_document(
            document_id=document_id,
            reviewer_id=reviewer_id,
        )
    except chat_engine.DocumentNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except GeminiError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc
    return EmbedDocumentResponse(
        ok=result["ok"],
        document_id=result["document_id"],
        chunks_created=result["chunks_created"],
    )


class ChatRespondRequest(BaseModel):
    session_id: str
    user_id: str
    message: str
    college_id: str | None = None


class ChatRespondResponse(BaseModel):
    content: str
    citations: list[dict]
    declined: bool
    model_id: str


@app.post("/chat/respond", response_model=ChatRespondResponse)
async def post_chat_respond(body: ChatRespondRequest) -> ChatRespondResponse:
    if not body.message.strip():
        raise HTTPException(status_code=422, detail="message must not be empty")
    try:
        result = await chat_engine.respond_to_chat(
            session_id=body.session_id,
            user_id=body.user_id,
            message=body.message,
            college_id=body.college_id,
        )
    except chat_engine.ChatQuotaExhaustedError as exc:
        raise HTTPException(status_code=429, detail=str(exc)) from exc
    except chat_engine.RateLimitExceededError as exc:
        raise HTTPException(status_code=429, detail=str(exc)) from exc
    except GeminiError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc
    return ChatRespondResponse(
        content=result["content"],
        citations=result["citations"],
        declined=result["declined"],
        model_id=result["model_id"],
    )
