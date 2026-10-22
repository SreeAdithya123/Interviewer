"""The AI interview turn-based state machine.

Implements docs/BUILD_SPEC.md Part 4.5 steps 1-9: the engine owns stage
order and all hard limits; the LLM (via `app/providers/gemini.py`) only ever
decides whether a single in-stage follow-up question is warranted — it
never picks the next stage, never skips a stage, and never extends the
interview past its time caps. Every provider call this module makes is
logged to `usage_events` via `app/costs/tracking.py` (BUILD_SPEC Part 5).

`interview_templates.stages` shape (not pinned by BUILD_SPEC's data model,
so documented here and in docs/DECISIONS.md): an ordered JSON array of
`{"stage": <one of the 5 stage names>, "question_count": <int>}` objects.
The array's order is the literal stage order this engine follows — nothing
in this module ever hardcodes that order itself.

Resume-specific question generation (BUILD_SPEC step 2: "resume-specific
questions generated from the student's projects") is explicitly out of
scope for this build: `question_bank.question_source` already supports a
`'resume_specific'` value for when that lands, but nothing here produces
one yet (see docs/DECISIONS.md).
"""

from __future__ import annotations

import hashlib
import random
import time
from dataclasses import dataclass
from datetime import UTC, datetime
from typing import Any

from app.costs.tracking import compute_cost_paise, log_usage_event
from app.db import get_client
from app.providers import gemini, r2, sarvam
from app.providers.stt import transcribe_with_fallback

EVALUATION_PROMPT_VERSION = "interview_evaluation_v1"

# Sarvam's own vocabulary-hint cap (app/providers/sarvam.py); kept in sync
# here since the same hint list is passed to both STT providers.
_MAX_VOCABULARY_HINT_TERMS = 50

# One fixed voice for every question/follow-up (BUILD_SPEC doesn't ask for
# voice selection); part of the TTS cache key, same as every other call
# site that calls Sarvam TTS in this codebase (app/providers/sarvam.py's
# own tests/callers default to "shubh").
_QUESTION_TTS_VOICE = "shubh"
_QUESTION_TTS_LANGUAGE_CODE = "en-IN"


class InterviewEngineError(Exception):
    """Base class for state errors the caller (a FastAPI route, or a test)
    should handle explicitly rather than treat as an unexpected crash."""


class InterviewNotFoundError(InterviewEngineError):
    """No `interviews` row exists for the given id."""


class TurnNotFoundError(InterviewEngineError):
    """No `interview_turns` row exists for the given id, or it belongs to a
    different interview than the one named alongside it."""


class ReportNotFoundError(InterviewNotFoundError):
    """No `interview_reports` row exists for the given interview id yet
    (e.g. the interview hasn't been finished). Subclasses
    `InterviewNotFoundError` deliberately, not `InterviewEngineError`
    directly, so it gets the same 404 mapping in `app/main.py` for free."""


class NoActiveTemplateError(InterviewEngineError):
    """No active `interview_templates` row exists for the requested
    `interview_type` — the caller asked to start an interview this engine
    has no question plan for."""


class InvalidInterviewStateError(InterviewEngineError):
    """The interview exists but is not in a state this call is valid for
    (e.g. already completed, or its template is missing/misconfigured)."""


class AnswerTooLongError(InterviewEngineError):
    """The reported answer duration exceeds the template's
    `max_answer_seconds`. The answer is rejected outright rather than
    truncating the audio: this module never decodes compressed audio
    (opus/webm) to find a byte offset to cut at, and transcribing past the
    limit anyway would make the hard cap meaningless. See
    docs/DECISIONS.md."""


class QuotaExhaustedError(InterviewEngineError):
    """The user or their college has exhausted their interview quota for the current billing period."""


@dataclass(frozen=True)
class NextTurnResult:
    """What the caller should do next. `interview_finished=True` means the
    interview has just been (or already was) completed — there is no next
    question; the caller should route to the report instead."""

    interview_finished: bool
    turn_id: str | None = None
    turn_number: int | None = None
    stage: str | None = None
    question_text: str | None = None
    question_source: str | None = None  # 'question_bank' | 'follow_up'
    question_bank_id: str | None = None
    is_follow_up: bool = False
    follow_up_of_turn_id: str | None = None
    question_audio_url: str | None = None


@dataclass(frozen=True)
class SubmitAnswerResult:
    """Result of transcribing and storing one answer, plus what comes next."""

    turn_id: str
    transcript: str
    stt_provider: str
    stt_fallback_used: bool
    next_turn: NextTurnResult


@dataclass(frozen=True)
class StageConfig:
    stage: str
    question_count: int


@dataclass(frozen=True)
class CreateInterviewResult:
    interview_id: str
    status: str


@dataclass(frozen=True)
class ReportResult:
    """Mirrors the subset of `interview_reports` columns a report page
    needs to render (BUILD_SPEC Part 4.5 step 9). `status='pending'` means
    the interview hasn't been finished (or finishing hasn't completed its
    evaluation call) yet — not an error; the caller decides how to poll or
    present that."""

    status: str
    scores: dict[str, Any] | None
    overall_score: float | None
    strengths: list[str]
    weak_areas_summary: list[dict[str, Any]]
    practice_actions: list[str]
    model_id: str | None
    prompt_version: str | None
    error_message: str | None


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------


async def create_interview(
    *,
    user_id: str,
    interview_type: str,
    difficulty: str,
    target_role: str | None = None,
    company_type: str | None = None,
    college_id: str | None = None,
) -> CreateInterviewResult:
    """Create a real `interviews` row, status `pending`, per BUILD_SPEC
    Part 4.5 step 1 ("Student picks interview type, target role, company
    type, difficulty"). No HTTP route called this before today —
    `apps/web`'s setup form instead wrote straight to Supabase via the
    temporary `create_stub_interview` RPC
    (supabase/migrations/20261017160925_interview_stub_bridge.sql), which
    never set `template_id` at all, since it predates any seeded
    `interview_templates` row to pick. This is that real engine-side path.

    `template_id` is picked by `interview_type` alone — the only key
    `supabase/seed/001_interview_templates_and_question_bank.sql` seeds
    templates by (one shared stage plan per type, per that file's own
    docstring); `target_role`/`company_type`/`difficulty` do not affect
    which template is used, only which questions `_pick_question` later
    matches within it.
    """
    client = await get_client()

    # Resolve college_id from student profile if not explicitly supplied
    if not college_id:
        try:
            prof_res = await client.table("profiles").select("college_id").eq("id", user_id).execute()
            if prof_res.data and prof_res.data[0].get("college_id"):
                college_id = prof_res.data[0]["college_id"]
        except Exception:  # noqa: BLE001, S110
            pass

    today_str = datetime.now(UTC).date().isoformat()

    # Enforce user interview quota
    user_quota_res = (
        await client.table("quotas")
        .select("id, used_units, limit_units")
        .eq("scope", "user")
        .eq("user_id", user_id)
        .eq("feature", "interview")
        .lte("period_start", today_str)
        .gte("period_end", today_str)
        .execute()
    )
    for q in user_quota_res.data or []:
        if q["used_units"] >= q["limit_units"]:
            raise QuotaExhaustedError(
                f"You have reached your interview limit ({q['used_units']}/{q['limit_units']}) for this period."
            )

    # Enforce college interview quota
    college_quota_rows: list[dict[str, Any]] = []
    if college_id:
        college_quota_res = (
            await client.table("quotas")
            .select("id, used_units, limit_units")
            .eq("scope", "college")
            .eq("college_id", college_id)
            .eq("feature", "interview")
            .lte("period_start", today_str)
            .gte("period_end", today_str)
            .execute()
        )
        college_quota_rows = college_quota_res.data or []
        for q in college_quota_rows:
            if q["used_units"] >= q["limit_units"]:
                raise QuotaExhaustedError(
                    f"College interview quota reached ({q['used_units']}/{q['limit_units']}) for this period."
                )

    template_res = (
        await client.table("interview_templates")
        .select("id")
        .eq("interview_type", interview_type)
        .eq("is_active", True)
        .execute()
    )
    if not template_res.data:
        raise NoActiveTemplateError(
            f"no active interview_templates row for interview_type={interview_type!r}"
        )
    template_id = template_res.data[0]["id"]

    row = {
        "user_id": user_id,
        "college_id": college_id,
        "template_id": template_id,
        "interview_type": interview_type,
        "target_role": target_role,
        "company_type": company_type,
        "difficulty": difficulty,
        "status": "pending",
    }
    res = await client.table("interviews").insert(row).execute()
    inserted = res.data[0]

    # Increment quotas after successful interview record creation
    now_iso = datetime.now(UTC).isoformat()
    for q in user_quota_res.data or []:
        await (
            client.table("quotas")
            .update({"used_units": q["used_units"] + 1, "updated_at": now_iso})
            .eq("id", q["id"])
            .execute()
        )
    for q in college_quota_rows:
        await (
            client.table("quotas")
            .update({"used_units": q["used_units"] + 1, "updated_at": now_iso})
            .eq("id", q["id"])
            .execute()
        )

    return CreateInterviewResult(interview_id=inserted["id"], status=inserted["status"])


async def get_next_turn(interview_id: str) -> NextTurnResult:
    """Pick the next thing to ask: an in-stage follow-up, the next
    question-bank question for the current stage, or the first question of
    the next stage — or finish the interview once every stage is done or
    the 25-minute cap has elapsed. The LLM is only ever consulted for the
    follow-up decision; this function alone decides stage order."""
    client = await get_client()
    interview = await _load_interview(client, interview_id)

    if interview["status"] in ("completed", "abandoned"):
        raise InvalidInterviewStateError(f"interview {interview_id} has already ended")

    template = await _load_template(client, interview.get("template_id"))
    stage_plan = _stage_plan(template)

    now = datetime.now(UTC)
    if interview["status"] == "pending":
        first_stage = stage_plan[0].stage
        await (
            client.table("interviews")
            .update(
                {
                    "status": "in_progress",
                    "started_at": now.isoformat(),
                    "current_stage": first_stage,
                }
            )
            .eq("id", interview_id)
            .execute()
        )
        interview = {**interview, "status": "in_progress", "started_at": now.isoformat(),
                      "current_stage": first_stage}

    if _elapsed_seconds(interview, now) >= template["max_duration_seconds"]:
        await finish_interview(interview_id)
        return NextTurnResult(interview_finished=True)

    turns = await _load_turns(client, interview_id)
    current_stage = interview["current_stage"]
    stage_index = _stage_index(stage_plan, current_stage)
    stage_config = stage_plan[stage_index]
    stage_turns = [t for t in turns if t["stage"] == current_stage]
    primary_turns = [t for t in stage_turns if not t["is_follow_up"]]

    # The most recently asked turn in this stage (primary or follow-up)
    # hasn't been answered yet -- re-ask it rather than falling through to
    # the follow-up/next-question/stage-advance logic below, all of which
    # assume the current question is already answered. Without this, a
    # second `get_next_turn` call before an answer is submitted (a page
    # refresh, a retried request, a frontend that re-fetches "the current
    # question" instead of only ever consuming the response it already
    # got) silently skips the unanswered question and jumps the stage
    # forward -- caught by a real call against the live database, not a
    # mocked test, which is exactly the kind of bug mocks can't catch.
    if stage_turns and stage_turns[-1].get("transcript") is None:
        return _turn_row_to_next_turn_result(stage_turns[-1])

    if primary_turns:
        last_primary = primary_turns[-1]
        if last_primary.get("transcript") is not None:
            follow_ups_so_far = [
                t
                for t in stage_turns
                if t["is_follow_up"] and t["follow_up_of_turn_id"] == last_primary["id"]
            ]
            if len(follow_ups_so_far) < template["max_follow_ups_per_question"]:
                follow_up_text = await _maybe_generate_followup(interview, last_primary, current_stage)
                if follow_up_text:
                    return await _write_turn(
                        client,
                        interview_id,
                        len(turns),
                        stage=current_stage,
                        question_text=follow_up_text,
                        question_source="follow_up",
                        is_follow_up=True,
                        follow_up_of_turn_id=last_primary["id"],
                        user_id=interview["user_id"],
                        college_id=interview.get("college_id"),
                    )

    if len(primary_turns) < stage_config.question_count:
        asked_question_bank_ids = {t["question_bank_id"] for t in stage_turns if t["question_bank_id"]}
        question = await _pick_question(client, interview, current_stage, asked_question_bank_ids)
        if question is not None:
            return await _write_turn(
                client,
                interview_id,
                len(turns),
                stage=current_stage,
                question_text=question["question_text"],
                question_source="question_bank",
                question_bank_id=question["id"],
                user_id=interview["user_id"],
                college_id=interview.get("college_id"),
            )
        # Question bank exhausted for this stage/filter combination: treat
        # the stage as done rather than getting stuck:

    next_index = stage_index + 1
    if next_index >= len(stage_plan):
        await finish_interview(interview_id)
        return NextTurnResult(interview_finished=True)

    next_stage = stage_plan[next_index].stage
    await (
        client.table("interviews")
        .update({"current_stage": next_stage})
        .eq("id", interview_id)
        .execute()
    )
    return await get_next_turn(interview_id)


async def submit_answer(
    interview_id: str,
    turn_id: str,
    audio_bytes: bytes | None = None,
    answer_duration_seconds: float = 0.0,
    *,
    audio_key: str | None = None,
    candidate_code: str | None = None,
    code_language: str | None = None,
) -> SubmitAnswerResult:
    """Transcribe one answer (Groq, falling back to Sarvam), store it, and
    return what comes next. `answer_duration_seconds` is the browser's own
    MediaRecorder duration for this clip — required, both to enforce the
    180-second-per-answer hard limit server-side and because the STT
    clients never decode audio to find their own duration (see
    `app/providers/types.py`)."""
    client = await get_client()
    interview = await _load_interview(client, interview_id)
    if interview["status"] != "in_progress":
        raise InvalidInterviewStateError(f"interview {interview_id} is not in progress")

    turn = await _load_turn(client, turn_id)
    if turn["interview_id"] != interview_id:
        raise TurnNotFoundError(f"turn {turn_id} does not belong to interview {interview_id}")
    if turn.get("transcript") is not None:
        raise InvalidInterviewStateError(f"turn {turn_id} already has an answer")

    template = await _load_template(client, interview.get("template_id"))
    max_answer_seconds = template["max_answer_seconds"]
    if answer_duration_seconds > max_answer_seconds:
        raise AnswerTooLongError(
            f"answer is {answer_duration_seconds:.1f}s, over this template's "
            f"{max_answer_seconds}s per-answer limit; rejected, not transcribed"
        )

    # If audio_key provided and audio_bytes not, fetch from R2
    if audio_key and (audio_bytes is None or len(audio_bytes) == 0):
        audio_bytes = await r2.get_object_bytes(audio_key)
    elif audio_bytes and not audio_key:
        audio_key = f"answers/{interview_id}/{turn_id}.webm"
        try:
            await r2.put_object_bytes(audio_key, audio_bytes, content_type="audio/webm")
        except Exception:  # noqa: BLE001
            audio_key = None

    vocabulary_hint = await _vocabulary_hint(client, interview["user_id"])

    started = time.monotonic()
    fallback_result = await transcribe_with_fallback(audio_bytes or b"", vocabulary_hint)
    latency_ms = int((time.monotonic() - started) * 1000)

    cost_paise = compute_cost_paise(
        provider=fallback_result.stt_provider,
        model=fallback_result.result.model_id,
        units={"audio_seconds": answer_duration_seconds},
    )
    await log_usage_event(
        feature="stt",
        provider=fallback_result.stt_provider,
        model=fallback_result.result.model_id,
        units={"audio_seconds": answer_duration_seconds},
        cost_paise=cost_paise,
        interview_id=interview_id,
        user_id=interview["user_id"],
        college_id=interview.get("college_id"),
    )

    full_transcript = fallback_result.result.text
    if candidate_code and candidate_code.strip():
        lang_tag = code_language or "code"
        full_transcript = f"{full_transcript}\n\n[Candidate Code ({lang_tag})]:\n```{lang_tag}\n{candidate_code.strip()}\n```"

    update_payload: dict[str, Any] = {
        "transcript": full_transcript,
        "answer_duration_seconds": answer_duration_seconds,
        "stt_provider": fallback_result.stt_provider,
        "stt_fallback_used": fallback_result.fallback_used,
        "latency_ms": latency_ms,
    }
    if audio_key:
        update_payload["answer_audio_key"] = audio_key

    await (
        client.table("interview_turns")
        .update(update_payload)
        .eq("id", turn_id)
        .execute()
    )

    next_turn = await get_next_turn(interview_id)

    return SubmitAnswerResult(
        turn_id=turn_id,
        transcript=full_transcript,
        stt_provider=fallback_result.stt_provider,
        stt_fallback_used=fallback_result.fallback_used,
        next_turn=next_turn,
    )


async def finish_interview(
    interview_id: str,
    *,
    eye_contact_pct: float | None = None,
    posture_stability_pct: float | None = None,
) -> None:
    """End the interview and run the evaluation report with retries and recovery.
    Idempotent: calling this on an already-ended interview is a no-op."""
    client = await get_client()
    interview = await _load_interview(client, interview_id)
    if interview["status"] in ("completed", "abandoned"):
        return

    now = datetime.now(UTC)
    started_at_raw = interview.get("started_at")
    started_at = _parse_timestamp(started_at_raw) if started_at_raw else now
    duration_seconds = max(int((now - started_at).total_seconds()), 0)

    update_payload: dict[str, Any] = {
        "status": "completed",
        "ended_at": now.isoformat(),
        "duration_seconds": duration_seconds,
    }
    if eye_contact_pct is not None:
        update_payload["eye_contact_pct"] = eye_contact_pct
    if posture_stability_pct is not None:
        update_payload["posture_stability_pct"] = posture_stability_pct

    await (
        client.table("interviews")
        .update(update_payload)
        .eq("id", interview_id)
        .execute()
    )

    await (
        client.table("interview_reports")
        .upsert(
            {
                "interview_id": interview_id,
                "user_id": interview["user_id"],
                "college_id": interview.get("college_id"),
                "status": "pending",
                "eye_contact_pct": eye_contact_pct if eye_contact_pct is not None else interview.get("eye_contact_pct"),
                "posture_stability_pct": posture_stability_pct if posture_stability_pct is not None else interview.get("posture_stability_pct"),
            },
            on_conflict="interview_id",
        )
        .execute()
    )

    from app.reports.worker import evaluate_and_save_report

    await evaluate_and_save_report(interview_id, client=client)


async def get_interview_turns(interview_id: str) -> list[dict[str, Any]]:
    """Fetch turns for an interview, resolving signed download URLs for question and answer audio."""
    client = await get_client()
    turns = await _load_turns(client, interview_id)
    results: list[dict[str, Any]] = []
    for turn in turns:
        t = dict(turn)
        q_key = turn.get("question_audio_key")
        a_key = turn.get("answer_audio_key")
        try:
            t["question_audio_url"] = r2.generate_download_url(q_key) if q_key else None
        except Exception:  # noqa: BLE001
            t["question_audio_url"] = None
        try:
            t["answer_audio_url"] = r2.generate_download_url(a_key) if a_key else None
        except Exception:  # noqa: BLE001
            t["answer_audio_url"] = None
        results.append(t)
    return results


async def get_report(interview_id: str) -> ReportResult:
    """Read back one interview's report, per BUILD_SPEC Part 4.5 step 9.
    Raises `ReportNotFoundError` (404) if `finish_interview` has never run
    for this interview — there is no report row to be pending or failed
    yet, which is a different condition than a report that exists with
    `status='pending'` (finished, evaluation not yet resolved)."""
    client = await get_client()
    res = (
        await client.table("interview_reports")
        .select("*")
        .eq("interview_id", interview_id)
        .execute()
    )
    if not res.data:
        raise ReportNotFoundError(f"no report yet for interview {interview_id}")
    row = res.data[0]
    return ReportResult(
        status=row["status"],
        scores=row.get("scores"),
        overall_score=row.get("overall_score"),
        strengths=row.get("strengths") or [],
        weak_areas_summary=row.get("weak_areas_summary") or [],
        practice_actions=row.get("practice_actions") or [],
        model_id=row.get("model_id"),
        prompt_version=row.get("prompt_version"),
        error_message=row.get("error_message"),
    )


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------


async def _load_interview(client: Any, interview_id: str) -> dict[str, Any]:
    res = await client.table("interviews").select("*").eq("id", interview_id).execute()
    if not res.data:
        raise InterviewNotFoundError(f"interview {interview_id} not found")
    return res.data[0]


async def _load_template(client: Any, template_id: str | None) -> dict[str, Any]:
    if not template_id:
        raise InvalidInterviewStateError("interview has no template_id set")
    res = await client.table("interview_templates").select("*").eq("id", template_id).execute()
    if not res.data:
        raise InvalidInterviewStateError(f"template {template_id} not found")
    return res.data[0]


async def _load_turn(client: Any, turn_id: str) -> dict[str, Any]:
    res = await client.table("interview_turns").select("*").eq("id", turn_id).execute()
    if not res.data:
        raise TurnNotFoundError(f"turn {turn_id} not found")
    return res.data[0]


async def _load_turns(client: Any, interview_id: str) -> list[dict[str, Any]]:
    res = (
        await client.table("interview_turns")
        .select("*")
        .eq("interview_id", interview_id)
        .order("turn_number")
        .execute()
    )
    return res.data


def _stage_plan(template: dict[str, Any]) -> list[StageConfig]:
    stages = template.get("stages") or []
    plan = [
        StageConfig(stage=s["stage"], question_count=int(s.get("question_count", 1))) for s in stages
    ]
    if not plan:
        raise InvalidInterviewStateError(
            f"template {template.get('id')} has an empty or missing stages plan"
        )
    return plan


def _stage_index(stage_plan: list[StageConfig], stage: str) -> int:
    for index, config in enumerate(stage_plan):
        if config.stage == stage:
            return index
    raise InvalidInterviewStateError(f"stage {stage!r} is not in this template's stage plan")


def _elapsed_seconds(interview: dict[str, Any], now: datetime) -> float:
    started_at = interview.get("started_at")
    if not started_at:
        return 0.0
    return (now - _parse_timestamp(started_at)).total_seconds()


def _parse_timestamp(value: str) -> datetime:
    return datetime.fromisoformat(value)


async def _pick_question(
    client: Any, interview: dict[str, Any], stage: str, exclude_ids: set[str]
) -> dict[str, Any] | None:
    """Picks a reviewed question_bank row for this stage, trying the most
    specific personalization first (company_type + role) and falling back
    to progressively broader matches, down to no personalization filter at
    all, before giving up.

    This fallback is required, not a nicety: `get_next_turn`'s caller
    treats "no candidates for this stage" as "this stage is exhausted,
    skip to the next one" (see its own comment), recursively, all the way
    to finishing the interview if every remaining stage also comes up
    empty. Found live: a student who filled in `target_role`/
    `company_type` with real values (which `question_bank` seed data
    almost never matches exactly -- see supabase/seed/
    001_interview_templates_and_question_bank.sql's own header) got a
    same-second "completed" interview with zero questions ever asked,
    because the single exact-match query returned nothing for every stage
    in a row. Falling back to broader matches here means personalization
    is used when real matching content exists, and silently ignored
    (never a broken interview) when it doesn't -- never the reverse.
    """

    def build_query(*, company_type: str | None, role: str | None):
        query = (
            client.table("question_bank")
            .select("*")
            .eq("stage", stage)
            .eq("interview_type", interview["interview_type"])
            .eq("difficulty", interview["difficulty"])
            .eq("status", "reviewed")
        )
        if company_type:
            query = query.eq("company_type", company_type)
        if role:
            query = query.eq("role", role)
        return query

    interview_company_type = interview.get("company_type")
    interview_role = interview.get("target_role")

    attempts: list[dict[str, str | None]] = []
    if interview_company_type and interview_role:
        attempts.append({"company_type": interview_company_type, "role": interview_role})
    if interview_company_type:
        attempts.append({"company_type": interview_company_type, "role": None})
    if interview_role:
        attempts.append({"company_type": None, "role": interview_role})
    attempts.append({"company_type": None, "role": None})

    for attempt in attempts:
        res = await build_query(**attempt).execute()
        candidates = [q for q in res.data if q["id"] not in exclude_ids]
        if candidates:
            return random.choice(candidates)
    return None


async def _maybe_generate_followup(
    interview: dict[str, Any], primary_turn: dict[str, Any], stage: str
) -> str | None:
    result = await gemini.generate_followup(
        question=primary_turn["question_text"],
        answer=primary_turn["transcript"],
        stage=stage,
        interview_type=interview["interview_type"],
        target_role=interview.get("target_role"),
        company_type=interview.get("company_type"),
        difficulty=interview["difficulty"],
    )
    units = {
        "input_tokens": result.input_tokens,
        "output_tokens": result.output_tokens,
        "thoughts_tokens": result.thoughts_tokens,
    }
    cost_paise = compute_cost_paise(provider="gemini", model=result.model_id, units=units)
    await log_usage_event(
        feature="interview",
        provider="gemini",
        model=result.model_id,
        units=units,
        cost_paise=cost_paise,
        interview_id=interview["id"],
        user_id=interview["user_id"],
        college_id=interview.get("college_id"),
    )
    return result.follow_up_question


async def _get_or_synthesize_question_audio(
    client: Any, text: str, *, interview_id: str, user_id: str, college_id: str | None
) -> str:
    """Returns an R2 object key with this question/follow-up's audio,
    reusing a `tts_cache` row keyed by hash(text, voice) when one already
    exists (BUILD_SPEC Part 4.5 step 3: "question audio plays ... from TTS
    cache when available") instead of re-synthesizing and re-paying Sarvam
    for text this engine has already spoken before -- the question bank's
    own questions get asked across many different interviews, so this is
    the main real cost lever in the whole per-interview budget (see
    docs/PROGRESS.md's cost breakdown). Follow-ups are LLM-generated and
    essentially never repeat verbatim, so they're still cached (consistent
    behavior, zero cost either way) but never actually hit.
    """
    text_hash = hashlib.sha256(text.encode("utf-8")).hexdigest()
    cache_key = f"{_QUESTION_TTS_VOICE}:{text_hash}"

    existing = await client.table("tts_cache").select("*").eq("cache_key", cache_key).execute()
    if existing.data:
        cached = existing.data[0]
        await (
            client.table("tts_cache")
            .update({"hit_count": cached["hit_count"] + 1, "last_used_at": datetime.now(UTC).isoformat()})
            .eq("cache_key", cache_key)
            .execute()
        )
        return cached["audio_key"]

    speech = await sarvam.synthesize_speech(text, _QUESTION_TTS_VOICE, language_code=_QUESTION_TTS_LANGUAGE_CODE)
    audio_key = f"tts-cache/{text_hash}.wav"
    await r2.put_object_bytes(audio_key, speech.audio_bytes, content_type="audio/wav")

    cost_paise = compute_cost_paise(
        provider="sarvam", model=speech.model_id, units={"characters": speech.characters}
    )
    await log_usage_event(
        feature="tts",
        provider="sarvam",
        model=speech.model_id,
        units={"characters": speech.characters},
        cost_paise=cost_paise,
        interview_id=interview_id,
        user_id=user_id,
        college_id=college_id,
    )
    await (
        client.table("tts_cache")
        .insert(
            {
                "cache_key": cache_key,
                "text_hash": text_hash,
                "voice": _QUESTION_TTS_VOICE,
                "audio_key": audio_key,
                "characters": speech.characters,
                "provider": "sarvam",
                "hit_count": 0,
            }
        )
        .execute()
    )
    return audio_key


async def _write_turn(
    client: Any,
    interview_id: str,
    existing_turn_count: int,
    *,
    stage: str,
    question_text: str,
    question_source: str,
    user_id: str,
    college_id: str | None,
    question_bank_id: str | None = None,
    is_follow_up: bool = False,
    follow_up_of_turn_id: str | None = None,
) -> NextTurnResult:
    audio_key = await _get_or_synthesize_question_audio(
        client, question_text, interview_id=interview_id, user_id=user_id, college_id=college_id
    )
    row = {
        "interview_id": interview_id,
        "turn_number": existing_turn_count + 1,
        "stage": stage,
        "question_text": question_text,
        "question_source": question_source,
        "question_bank_id": question_bank_id,
        "is_follow_up": is_follow_up,
        "follow_up_of_turn_id": follow_up_of_turn_id,
        "question_audio_key": audio_key,
    }
    res = await client.table("interview_turns").insert(row).execute()
    return _turn_row_to_next_turn_result(res.data[0])


def _turn_row_to_next_turn_result(turn: dict[str, Any]) -> NextTurnResult:
    """Builds the same `NextTurnResult` shape from either a freshly
    inserted `interview_turns` row (`_write_turn`) or an existing one being
    re-asked verbatim (`get_next_turn`'s not-yet-answered guard above) --
    one place that knows the column -> field mapping, so the two call
    sites can't drift apart on it. Signing a fresh download URL from the
    stored key (rather than storing the URL itself) is cheap -- pure local
    HMAC signing, no network call -- and URLs expire while the key doesn't."""
    audio_key = turn.get("question_audio_key")
    return NextTurnResult(
        interview_finished=False,
        turn_id=turn["id"],
        turn_number=turn["turn_number"],
        stage=turn["stage"],
        question_text=turn["question_text"],
        question_source=turn["question_source"],
        question_bank_id=turn.get("question_bank_id"),
        is_follow_up=turn["is_follow_up"],
        question_audio_url=r2.generate_download_url(audio_key) if audio_key else None,
        follow_up_of_turn_id=turn.get("follow_up_of_turn_id"),
    )


async def _vocabulary_hint(client: Any, user_id: str) -> list[str] | None:
    """BUILD_SPEC Part 4.5 step 5: "transcribe (Groq, with resume skills and
    tech terms passed as a vocabulary hint...)". Pulls skill names/keywords
    off the student's primary resume (JSON Resume shape, `resumes.data`);
    returns `None` (no hint) when there is no primary resume yet."""
    res = (
        await client.table("resumes")
        .select("data")
        .eq("user_id", user_id)
        .eq("is_primary", True)
        .execute()
    )
    if not res.data:
        return None
    data = res.data[0].get("data") or {}
    terms: list[str] = []
    for skill in data.get("skills") or []:
        name = skill.get("name")
        if name:
            terms.append(str(name))
        for keyword in skill.get("keywords") or []:
            terms.append(str(keyword))
    return terms[:_MAX_VOCABULARY_HINT_TERMS] if terms else None


async def _rollup_interview_cost(client: Any, interview_id: str) -> None:
    res = await client.table("usage_events").select("cost_paise").eq("interview_id", interview_id).execute()
    total = sum(row["cost_paise"] for row in res.data)
    await client.table("interviews").update({"total_cost_paise": total}).eq("id", interview_id).execute()
