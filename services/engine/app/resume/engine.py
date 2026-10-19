"""Resume-related AI calls (BUILD_SPEC Part 4.3/4.4).

Thin wrappers around `app/providers/gemini.py`, following the same shape
as `app/interview/engine.py`: this module owns cost logging and any
request-shaping; the provider client owns the actual Gemini call and the
anti-hallucination contract.

Only bullet rewriting (Part 4.3) is here so far. The resume scanner
(Part 4.4: PDF parsing, JD match, bullet quality, formatting risks) is
separate, larger work, not yet built.
"""

from __future__ import annotations

from dataclasses import dataclass

from app.costs.tracking import compute_cost_paise, log_usage_event
from app.providers import gemini


@dataclass(frozen=True)
class BulletRewriteResult:
    kind: str  # 'rewritten' | 'needs_metric'
    text: str | None
    question: str | None


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
