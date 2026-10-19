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

from fastapi import FastAPI, Form, HTTPException, UploadFile
from pydantic import BaseModel

from app.internal.manual_test_harness import router as internal_test_interview_router
from app.interview import engine
from app.providers.gemini import GeminiError
from app.resume import engine as resume_engine

app = FastAPI(title="Vyoman Interviewer Engine")

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


class FinishInterviewResponse(BaseModel):
    status: str = "completed"


def _as_next_turn_response(result: engine.NextTurnResult) -> NextTurnResponse:
    return NextTurnResponse(**asdict(result))


def _raise_for_engine_error(exc: engine.InterviewEngineError) -> None:
    """Translate an engine state error into the matching HTTP status."""
    if isinstance(exc, (engine.InterviewNotFoundError, engine.TurnNotFoundError)):
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    if isinstance(exc, (engine.AnswerTooLongError, engine.NoActiveTemplateError)):
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    if isinstance(exc, engine.InvalidInterviewStateError):
        raise HTTPException(status_code=409, detail=str(exc)) from exc
    raise HTTPException(status_code=400, detail=str(exc)) from exc


@app.post("/interviews", response_model=CreateInterviewResponse)
async def post_create_interview(body: CreateInterviewRequest) -> CreateInterviewResponse:
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
    "/interviews/{interview_id}/turns/{turn_id}/answer",
    response_model=SubmitAnswerResponse,
)
async def post_submit_answer(
    interview_id: str,
    turn_id: str,
    audio: UploadFile,
    answer_duration_seconds: float = Form(...),
) -> SubmitAnswerResponse:
    audio_bytes = await audio.read()
    try:
        result = await engine.submit_answer(
            interview_id, turn_id, audio_bytes, answer_duration_seconds
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
async def post_finish_interview(interview_id: str) -> FinishInterviewResponse:
    try:
        await engine.finish_interview(interview_id)
    except engine.InterviewEngineError as exc:
        _raise_for_engine_error(exc)
        raise  # unreachable: _raise_for_engine_error always raises
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
