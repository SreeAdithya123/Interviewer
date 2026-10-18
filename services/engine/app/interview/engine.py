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

import random
import time
from dataclasses import dataclass
from datetime import UTC, datetime
from typing import Any

from app.costs.tracking import compute_cost_paise, log_usage_event
from app.db import get_client
from app.providers import gemini
from app.providers.stt import transcribe_with_fallback

EVALUATION_PROMPT_VERSION = "interview_evaluation_v1"

# Sarvam's own vocabulary-hint cap (app/providers/sarvam.py); kept in sync
# here since the same hint list is passed to both STT providers.
_MAX_VOCABULARY_HINT_TERMS = 50


class InterviewEngineError(Exception):
    """Base class for state errors the caller (a FastAPI route, or a test)
    should handle explicitly rather than treat as an unexpected crash."""


class InterviewNotFoundError(InterviewEngineError):
    """No `interviews` row exists for the given id."""


class TurnNotFoundError(InterviewEngineError):
    """No `interview_turns` row exists for the given id, or it belongs to a
    different interview than the one named alongside it."""


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


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------


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
    audio_bytes: bytes,
    answer_duration_seconds: float,
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

    vocabulary_hint = await _vocabulary_hint(client, interview["user_id"])

    started = time.monotonic()
    fallback_result = await transcribe_with_fallback(audio_bytes, vocabulary_hint)
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

    await (
        client.table("interview_turns")
        .update(
            {
                "transcript": fallback_result.result.text,
                "answer_duration_seconds": answer_duration_seconds,
                "stt_provider": fallback_result.stt_provider,
                "stt_fallback_used": fallback_result.fallback_used,
                "latency_ms": latency_ms,
            }
        )
        .eq("id", turn_id)
        .execute()
    )

    next_turn = await get_next_turn(interview_id)

    return SubmitAnswerResult(
        turn_id=turn_id,
        transcript=fallback_result.result.text,
        stt_provider=fallback_result.stt_provider,
        stt_fallback_used=fallback_result.fallback_used,
        next_turn=next_turn,
    )


async def finish_interview(interview_id: str) -> None:
    """End the interview and run the evaluation report synchronously (a
    real queue is Phase 4 polish, not required here — BUILD_SPEC Part 7).
    Idempotent: calling this on an already-ended interview is a no-op."""
    client = await get_client()
    interview = await _load_interview(client, interview_id)
    if interview["status"] in ("completed", "abandoned"):
        return

    now = datetime.now(UTC)
    started_at_raw = interview.get("started_at")
    started_at = _parse_timestamp(started_at_raw) if started_at_raw else now
    duration_seconds = max(int((now - started_at).total_seconds()), 0)

    await (
        client.table("interviews")
        .update({"status": "completed", "ended_at": now.isoformat(), "duration_seconds": duration_seconds})
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
            },
            on_conflict="interview_id",
        )
        .execute()
    )

    turns = await _load_turns(client, interview_id)
    transcript_turns = [
        {
            "turn_number": t["turn_number"],
            "stage": t["stage"],
            "question": t["question_text"],
            "answer": t.get("transcript") or "",
        }
        for t in turns
    ]

    try:
        evaluation = await gemini.evaluate_interview(
            transcript_turns=transcript_turns,
            eye_contact_pct=interview.get("eye_contact_pct"),
            posture_stability_pct=interview.get("posture_stability_pct"),
            interview_type=interview["interview_type"],
            target_role=interview.get("target_role"),
            company_type=interview.get("company_type"),
            difficulty=interview["difficulty"],
        )
    except Exception as exc:  # noqa: BLE001 - any evaluation failure must still record a failed report
        await (
            client.table("interview_reports")
            .update({"status": "failed", "error_message": str(exc)})
            .eq("interview_id", interview_id)
            .execute()
        )
        return

    units = {
        "input_tokens": evaluation.input_tokens,
        "output_tokens": evaluation.output_tokens,
        "thoughts_tokens": evaluation.thoughts_tokens,
    }
    cost_paise = compute_cost_paise(provider="gemini", model=evaluation.model_id, units=units)
    await log_usage_event(
        feature="interview",
        provider="gemini",
        model=evaluation.model_id,
        units=units,
        cost_paise=cost_paise,
        interview_id=interview_id,
        user_id=interview["user_id"],
        college_id=interview.get("college_id"),
    )

    await (
        client.table("interview_reports")
        .update(
            {
                "status": "completed",
                "scores": evaluation.scores,
                "overall_score": evaluation.overall_score,
                "strengths": evaluation.strengths,
                "weak_areas_summary": evaluation.weak_areas,
                "practice_actions": evaluation.practice_actions,
                "eye_contact_pct": interview.get("eye_contact_pct"),
                "posture_stability_pct": interview.get("posture_stability_pct"),
                "model_id": evaluation.model_id,
                "prompt_version": EVALUATION_PROMPT_VERSION,
                "error_message": None,
            }
        )
        .eq("interview_id", interview_id)
        .execute()
    )

    if evaluation.weak_areas:
        rows = [
            {
                "user_id": interview["user_id"],
                "college_id": interview.get("college_id"),
                "skill": weak_area["skill"],
                "severity": weak_area.get("severity", "medium"),
                "source": "interview_report",
                "source_interview_id": interview_id,
                "notes": weak_area.get("notes"),
            }
            for weak_area in evaluation.weak_areas
        ]
        await client.table("weak_areas").insert(rows).execute()

    await _rollup_interview_cost(client, interview_id)


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
    query = (
        client.table("question_bank")
        .select("*")
        .eq("stage", stage)
        .eq("interview_type", interview["interview_type"])
        .eq("difficulty", interview["difficulty"])
        .eq("status", "reviewed")
    )
    if interview.get("company_type"):
        query = query.eq("company_type", interview["company_type"])
    if interview.get("target_role"):
        query = query.eq("role", interview["target_role"])
    res = await query.execute()
    candidates = [q for q in res.data if q["id"] not in exclude_ids]
    if not candidates:
        return None
    return random.choice(candidates)


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


async def _write_turn(
    client: Any,
    interview_id: str,
    existing_turn_count: int,
    *,
    stage: str,
    question_text: str,
    question_source: str,
    question_bank_id: str | None = None,
    is_follow_up: bool = False,
    follow_up_of_turn_id: str | None = None,
) -> NextTurnResult:
    row = {
        "interview_id": interview_id,
        "turn_number": existing_turn_count + 1,
        "stage": stage,
        "question_text": question_text,
        "question_source": question_source,
        "question_bank_id": question_bank_id,
        "is_follow_up": is_follow_up,
        "follow_up_of_turn_id": follow_up_of_turn_id,
    }
    res = await client.table("interview_turns").insert(row).execute()
    inserted = res.data[0]
    return NextTurnResult(
        interview_finished=False,
        turn_id=inserted["id"],
        turn_number=inserted["turn_number"],
        stage=stage,
        question_text=question_text,
        question_source=question_source,
        question_bank_id=question_bank_id,
        is_follow_up=is_follow_up,
        follow_up_of_turn_id=follow_up_of_turn_id,
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
