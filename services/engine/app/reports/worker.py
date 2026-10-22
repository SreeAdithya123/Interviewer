"""Interview report worker: asynchronous evaluation, retry handling, and stuck-job recovery.

Implements docs/BUILD_SPEC.md Part 4.5 step 9 & Part 7 Phase 4:
- Asynchronous evaluation of completed interviews via Gemini 3.5 Flash / Argon.
- Retries with backoff (up to 3 attempts) for transient LLM errors.
- Verification that all evidence quotes exist verbatim in candidate answers.
- Stuck-job recovery for reports left in 'pending' status older than 2 minutes.
- Rolling up costs to interviews table and populating student weak_areas.
"""

from __future__ import annotations

import asyncio
import logging
from datetime import UTC, datetime
from typing import Any

from app.costs.tracking import compute_cost_paise, log_usage_event
from app.db import get_client
from app.providers import gemini

logger = logging.getLogger(__name__)

EVALUATION_PROMPT_VERSION = "interview_evaluation_v1"


def verify_evidence_quotes(evaluation: Any, transcript_turns: list[dict[str, Any]]) -> bool:
    """Automated check (BUILD_SPEC Part 7 Phase 4 acceptance):
    every report score has evidence quotes that exist verbatim in the transcript.
    Returns True if all cited evidence quotes are non-empty substrings of candidate answers.
    """
    all_answers = " ".join((t.get("answer") or "") for t in transcript_turns).lower()
    scores = getattr(evaluation, "scores", None)
    if scores is None and isinstance(evaluation, dict):
        scores = evaluation.get("scores")
    if not isinstance(scores, dict):
        return False

    for dim_data in scores.values():
        if isinstance(dim_data, dict):
            evidence = dim_data.get("evidence", [])
            if isinstance(evidence, list):
                for quote in evidence:
                    cleaned = str(quote).strip().strip('"\'').lower()
                    if cleaned and cleaned not in all_answers:
                        logger.warning("Evidence quote %r not found verbatim in transcript", quote)
                        return False
    return True


async def evaluate_and_save_report(
    interview_id: str,
    *,
    client: Any = None,
    max_retries: int = 3,
    initial_backoff: float = 0.5,
) -> bool:
    """Evaluates a completed interview with retries and writes the report to `interview_reports`."""
    if client is None:
        client = await get_client()

    int_res = await client.table("interviews").select("*").eq("id", interview_id).execute()
    if not int_res.data:
        logger.error("Cannot evaluate report: interview %s not found", interview_id)
        return False
    interview = int_res.data[0]

    turns_res = (
        await client.table("interview_turns")
        .select("*")
        .eq("interview_id", interview_id)
        .order("turn_number")
        .execute()
    )
    turns = turns_res.data or []
    transcript_turns = [
        {
            "turn_number": t.get("turn_number"),
            "stage": t.get("stage"),
            "question": t.get("question_text"),
            "answer": t.get("transcript") or "",
        }
        for t in turns
    ]

    evaluation = None
    last_exc: Exception | None = None

    for attempt in range(1, max_retries + 1):
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
            break
        except Exception as exc:  # noqa: BLE001
            last_exc = exc
            logger.warning(
                "Evaluation attempt %d/%d for interview %s failed: %s",
                attempt,
                max_retries,
                interview_id,
                exc,
            )
            if attempt < max_retries:
                await asyncio.sleep(initial_backoff * (2 ** (attempt - 1)))

    if evaluation is None:
        logger.error("All evaluation attempts failed for interview %s: %s", interview_id, last_exc)
        await (
            client.table("interview_reports")
            .upsert(
                {
                    "interview_id": interview_id,
                    "user_id": interview["user_id"],
                    "college_id": interview.get("college_id"),
                    "status": "failed",
                    "error_message": str(last_exc),
                },
                on_conflict="interview_id",
            )
            .execute()
        )
        return False

    # Log usage event for Gemini evaluation call
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

    # Persist completed report
    await (
        client.table("interview_reports")
        .upsert(
            {
                "interview_id": interview_id,
                "user_id": interview["user_id"],
                "college_id": interview.get("college_id"),
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
            },
            on_conflict="interview_id",
        )
        .execute()
    )

    # Record weak areas
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

    # Roll up total cost
    res = await client.table("usage_events").select("cost_paise").eq("interview_id", interview_id).execute()
    total = sum(row["cost_paise"] for row in (res.data or []))
    await client.table("interviews").update({"total_cost_paise": total}).eq("id", interview_id).execute()

    return True


async def recover_stuck_reports(
    max_age_seconds: int = 120,
    *,
    client: Any = None,
) -> list[str]:
    """Finds reports left in 'pending' status for more than max_age_seconds
    and re-runs evaluation. Useful on worker restart to recover killed mid-job reports.
    """
    if client is None:
        client = await get_client()

    res = (
        await client.table("interview_reports")
        .select("interview_id, created_at, status")
        .eq("status", "pending")
        .execute()
    )
    now = datetime.now(UTC)
    stuck_ids: list[str] = []

    for row in res.data or []:
        created_at_str = row.get("created_at")
        if not created_at_str:
            stuck_ids.append(row["interview_id"])
            continue

        try:
            created_at = datetime.fromisoformat(created_at_str)
            age = (now - created_at).total_seconds()
            if age >= max_age_seconds:
                stuck_ids.append(row["interview_id"])
        except Exception:  # noqa: BLE001
            stuck_ids.append(row["interview_id"])

    recovered: list[str] = []
    for interview_id in stuck_ids:
        success = await evaluate_and_save_report(interview_id, client=client)
        if success:
            recovered.append(interview_id)

    return recovered


async def run_worker(single_pass: bool = False, poll_interval: float = 5.0) -> None:
    """Report worker loop: recovers stuck jobs on startup, then polls for pending reports."""
    client = await get_client()
    logger.info("Report worker started. Recovering stuck reports...")
    recovered = await recover_stuck_reports(max_age_seconds=120, client=client)
    if recovered:
        logger.info("Recovered %d stuck reports: %s", len(recovered), recovered)

    while True:
        pending_res = (
            await client.table("interview_reports")
            .select("interview_id")
            .eq("status", "pending")
            .execute()
        )
        for row in pending_res.data or []:
            await evaluate_and_save_report(row["interview_id"], client=client)

        if single_pass:
            break
        await asyncio.sleep(poll_interval)


if __name__ == "__main__":
    asyncio.run(run_worker())
