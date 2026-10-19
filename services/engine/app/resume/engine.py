"""Resume-related AI calls (BUILD_SPEC Part 4.3/4.4).

Thin wrappers around `app/providers/gemini.py`, following the same shape
as `app/interview/engine.py`: this module owns cost logging and any
request-shaping; the provider client owns the actual Gemini call and the
anti-hallucination contract.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from app.costs.tracking import compute_cost_paise, log_usage_event
from app.db import get_client
from app.providers import gemini


@dataclass(frozen=True)
class BulletRewriteResult:
    kind: str  # 'rewritten' | 'needs_metric'
    text: str | None
    question: str | None


@dataclass(frozen=True)
class ScanResult:
    scan_id: str
    parsed_resume: dict[str, Any]
    parse_health: dict[str, Any]
    jd_match: dict[str, Any] | None
    bullet_quality: dict[str, Any]
    formatting_risks: dict[str, Any]


async def rewrite_bullet(bullet: str, *, user_id: str, college_id: str | None) -> BulletRewriteResult:
    """Rewrite one resume bullet, or ask for a metric — BUILD_SPEC Part
    4.3. Meters the call under `feature='resume_parse'` (no more specific
    enum value exists for this in `usage_events.feature`'s check
    constraint; it's resume-AI-processing-that-isn't-a-full-scan, the
    closest real fit)."""
    result = await gemini.rewrite_resume_bullet(bullet)

    units = {
        "input_tokens": result.input_tokens,
        "output_tokens": result.output_tokens,
        "thoughts_tokens": result.thoughts_tokens,
    }
    cost_paise = compute_cost_paise(provider="gemini", model=result.model_id, units=units)
    await log_usage_event(
        feature="resume_parse",
        provider="gemini",
        model=result.model_id,
        units=units,
        cost_paise=cost_paise,
        user_id=user_id,
        college_id=college_id,
    )

    return BulletRewriteResult(kind=result.kind, text=result.text, question=result.question)


async def scan_resume(
    *,
    user_id: str,
    college_id: str | None,
    resume_id: str | None,
    job_description_id: str | None,
    resume_data: dict[str, Any] | None,
    pdf_base64: str | None,
    job_description_text: str | None,
) -> ScanResult:
    """Run the resume scanner (BUILD_SPEC Part 4.4) and write the real
    `resume_scans` row ourselves, via the service-role client — RLS
    deliberately gives the `authenticated` role SELECT/DELETE only on
    this table (see supabase/migrations/20261015120007_row_level_security.sql:
    "A scan is produced by the engine"), so the student's own session can
    never insert one. This also replaces the temporary
    `create_stub_resume_scan` RPC bridge, which that same migration's
    comments already called out for removal once this real path existed.

    `resume_id`/`job_description_id` are passed straight through to the
    inserted row (both nullable: an ad hoc PDF upload has no `resumes`
    row, and no job description may have been pasted at all).

    When `resume_data` was given, `parsed_resume`/`parse_health` in the
    stored row and the returned result are *not* Gemini's own echo of
    them — they're the original `resume_data` verbatim and a
    deterministic, non-LLM `parse_health` computed below. Asking the
    model to "parse" data that's already in exactly the shape it would
    parse it into is pure downside: it risks subtly rewording the
    student's own summary/bullets on the round-trip, and it could never
    reproduce the frontend-generated `id` field every nested item needs
    for React keys. `jd_match`/`bullet_quality`/`formatting_risks` still
    come from Gemini either way — those are genuine judgment calls, not
    an extraction step.
    """
    result = await gemini.scan_resume(
        resume_data=resume_data,
        pdf_base64=pdf_base64,
        job_description_text=job_description_text,
    )

    if resume_data is not None:
        parsed_resume = resume_data
        parse_health = _parse_health_for_structured_resume(resume_data)
    else:
        parsed_resume = result.parsed_resume
        parse_health = result.parse_health

    client = await get_client()
    row = {
        "user_id": user_id,
        "resume_id": resume_id,
        "job_description_id": job_description_id,
        "parsed_resume": parsed_resume,
        "parse_health": parse_health,
        "jd_match": result.jd_match,
        "bullet_quality": result.bullet_quality,
        "formatting_risks": result.formatting_risks,
    }
    res = await client.table("resume_scans").insert(row).execute()
    scan_id = res.data[0]["id"]

    units = {
        "input_tokens": result.input_tokens,
        "output_tokens": result.output_tokens,
        "thoughts_tokens": result.thoughts_tokens,
    }
    cost_paise = compute_cost_paise(provider="gemini", model=result.model_id, units=units)
    await log_usage_event(
        feature="resume_scan",
        provider="gemini",
        model=result.model_id,
        units=units,
        cost_paise=cost_paise,
        user_id=user_id,
        college_id=college_id,
        resume_scan_id=scan_id,
    )

    return ScanResult(
        scan_id=scan_id,
        parsed_resume=parsed_resume,
        parse_health=parse_health,
        jd_match=result.jd_match,
        bullet_quality=result.bullet_quality,
        formatting_risks=result.formatting_risks,
    )


def _parse_health_for_structured_resume(resume_data: dict[str, Any]) -> dict[str, Any]:
    """Deterministic `parse_health` for a resume that was built directly
    in the structured editor — there is no extraction step to judge, so
    this never calls Gemini. Mirrors the section-presence logic
    apps/web's retired scan-resume stub used, now real instead of
    preview-labeled."""
    detected: list[str] = []
    missing: list[str] = []

    if (resume_data.get("basics") or {}).get("name"):
        detected.append("Contact info")
    else:
        missing.append("Contact info")

    if resume_data.get("education"):
        detected.append("Education")
    else:
        missing.append("Education")

    if resume_data.get("work"):
        detected.append("Experience")
    if resume_data.get("projects"):
        detected.append("Projects")

    if resume_data.get("skills"):
        detected.append("Skills")
    else:
        missing.append("Skills")

    if resume_data.get("certificates"):
        detected.append("Certificates")
    if resume_data.get("awards"):
        detected.append("Awards")

    has_any_experience = bool(resume_data.get("work")) or bool(resume_data.get("projects"))
    status = "clean" if detected and has_any_experience else "partial"
    return {
        "status": status,
        "sections_detected": detected,
        "sections_missing": missing,
        "notes": ["Parsed directly from your saved resume data — no text extraction was needed."],
    }
