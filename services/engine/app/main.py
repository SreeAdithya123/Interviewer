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

app = FastAPI(title="Vyoman Interviewer Engine")

app.include_router(internal_test_interview_router)


@app.get("/health")
def health() -> dict[str, str]:
    """Liveness/readiness check used by Cloud Run and local tooling."""
    return {"status": "ok"}


# ---------------------------------------------------------------------------
# Interview turn loop (BUILD_SPEC Part 4.5)
# ---------------------------------------------------------------------------


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
    if isinstance(exc, engine.AnswerTooLongError):
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    if isinstance(exc, engine.InvalidInterviewStateError):
        raise HTTPException(status_code=409, detail=str(exc)) from exc
    raise HTTPException(status_code=400, detail=str(exc)) from exc


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
