"""Unit tests for app/resume/engine.py -- the thin wrapper that calls
app.providers.gemini.rewrite_resume_bullet and meters it. The anti-
hallucination guarantee itself is tested where it's enforced
(tests/providers/test_gemini.py); this file only checks the wrapper's
own job: passing the result through and logging one real usage_events
row with the right feature tag.
"""

from __future__ import annotations

import pytest

from app.providers import gemini
from app.resume import engine as resume_engine

USER_ID = "33333333-3333-3333-3333-333333333333"
COLLEGE_ID = "44444444-4444-4444-4444-444444444444"


async def test_rewrite_bullet_passes_through_a_rewritten_result(monkeypatch: pytest.MonkeyPatch) -> None:
    async def fake_rewrite(bullet: str) -> gemini.BulletRewriteResult:
        return gemini.BulletRewriteResult(
            kind="rewritten",
            text="Reduced page load time by 40%.",
            question=None,
            model_id="gemini-3.5-flash-lite",
            input_tokens=20,
            output_tokens=10,
        )

    monkeypatch.setattr(gemini, "rewrite_resume_bullet", fake_rewrite)

    logged: list[dict] = []

    async def fake_log_usage_event(**kwargs):
        logged.append(kwargs)

    monkeypatch.setattr(resume_engine, "log_usage_event", fake_log_usage_event)

    result = await resume_engine.rewrite_bullet(
        "made the site 40% faster", user_id=USER_ID, college_id=COLLEGE_ID
    )

    assert result.kind == "rewritten"
    assert result.text == "Reduced page load time by 40%."
    assert len(logged) == 1
    assert logged[0]["feature"] == "resume_parse"
    assert logged[0]["provider"] == "gemini"
    assert logged[0]["user_id"] == USER_ID
    assert logged[0]["college_id"] == COLLEGE_ID


async def test_rewrite_bullet_passes_through_a_needs_metric_result(monkeypatch: pytest.MonkeyPatch) -> None:
    async def fake_rewrite(bullet: str) -> gemini.BulletRewriteResult:
        return gemini.BulletRewriteResult(
            kind="needs_metric",
            text=None,
            question="How many users did this affect?",
            model_id="gemini-3.5-flash-lite",
            input_tokens=15,
            output_tokens=8,
        )

    monkeypatch.setattr(gemini, "rewrite_resume_bullet", fake_rewrite)

    async def fake_log_usage_event(**kwargs):
        return None

    monkeypatch.setattr(resume_engine, "log_usage_event", fake_log_usage_event)

    result = await resume_engine.rewrite_bullet("built a new onboarding flow", user_id=USER_ID, college_id=None)

    assert result.kind == "needs_metric"
    assert result.text is None
    assert result.question == "How many users did this affect?"
