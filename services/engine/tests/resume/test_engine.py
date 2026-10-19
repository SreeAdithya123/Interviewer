"""Unit tests for app/resume/engine.py -- the thin wrapper that calls
app.providers.gemini.rewrite_resume_bullet/scan_resume and meters them.
The anti-hallucination guarantee itself is tested where it's enforced
(tests/providers/test_gemini.py); this file only checks the wrapper's
own job: passing results through, writing the real `resume_scans` row,
and logging one real usage_events row with the right feature tag.
"""

from __future__ import annotations

import pytest

from app.providers import gemini
from app.resume import engine as resume_engine
from tests.interview.fakes import FakeClient

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


def _fake_scan_result(**overrides) -> gemini.ScanResult:
    defaults: dict = {
        "parsed_resume": {"basics": {"name": "Gemini's own echo"}},
        "parse_health": {"status": "clean", "sections_detected": [], "sections_missing": [], "notes": []},
        "jd_match": None,
        "bullet_quality": {"bullets": [], "overall_notes": []},
        "formatting_risks": {"risks": []},
        "model_id": "gemini-3.5-flash-lite",
        "input_tokens": 500,
        "output_tokens": 200,
    }
    defaults.update(overrides)
    return gemini.ScanResult(**defaults)


async def test_scan_resume_with_structured_data_preserves_the_students_own_ids(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """The one rule this wrapper enforces on top of the provider call:
    when the student already had structured `resume_data`, the stored
    `parsed_resume` must be that exact data back -- never Gemini's own
    echo of it -- because only the original still has the frontend's
    `id` fields and is guaranteed not to have drifted in wording."""

    async def fake_scan(**kwargs) -> gemini.ScanResult:
        return _fake_scan_result()

    monkeypatch.setattr(gemini, "scan_resume", fake_scan)

    fake_client = FakeClient()

    async def _get_client():
        return fake_client

    monkeypatch.setattr(resume_engine, "get_client", _get_client)

    logged: list[dict] = []

    async def fake_log_usage_event(**kwargs):
        logged.append(kwargs)

    monkeypatch.setattr(resume_engine, "log_usage_event", fake_log_usage_event)

    resume_data = {
        "basics": {"name": "Asha Rao"},
        "education": [{"id": "edu-1", "institution": "IIT Delhi"}],
        "work": [{"id": "work-1", "name": "Acme Corp", "highlights": ["Shipped a feature"]}],
        "projects": [],
        "skills": [{"id": "skill-1", "name": "Languages"}],
        "certificates": [],
        "awards": [],
    }

    result = await resume_engine.scan_resume(
        user_id=USER_ID,
        college_id=COLLEGE_ID,
        resume_id="55555555-5555-5555-5555-555555555555",
        job_description_id=None,
        resume_data=resume_data,
        pdf_base64=None,
        job_description_text=None,
    )

    assert result.parsed_resume == resume_data
    assert result.parsed_resume["education"][0]["id"] == "edu-1"
    assert result.parse_health["status"] == "clean"
    assert "Education" in result.parse_health["sections_detected"]
    assert "Experience" in result.parse_health["sections_detected"]
    assert "Projects" not in result.parse_health["sections_detected"]

    stored = fake_client.tables["resume_scans"][0]
    assert stored["parsed_resume"] == resume_data
    assert stored["user_id"] == USER_ID
    assert stored["resume_id"] == "55555555-5555-5555-5555-555555555555"

    assert len(logged) == 1
    assert logged[0]["feature"] == "resume_scan"
    assert logged[0]["resume_scan_id"] == result.scan_id
    assert logged[0]["user_id"] == USER_ID


async def test_scan_resume_with_pdf_uses_geminis_own_parsed_resume(monkeypatch: pytest.MonkeyPatch) -> None:
    """With no pre-existing structured data, there is nothing to prefer
    over Gemini's own parse -- it's the only parse that exists."""

    async def fake_scan(**kwargs) -> gemini.ScanResult:
        return _fake_scan_result(
            parsed_resume={"basics": {"name": "Parsed from the PDF"}},
            parse_health={"status": "partial", "sections_detected": [], "sections_missing": ["Skills"], "notes": ["scanned image"]},
        )

    monkeypatch.setattr(gemini, "scan_resume", fake_scan)

    async def _get_client():
        return FakeClient()

    monkeypatch.setattr(resume_engine, "get_client", _get_client)

    async def fake_log_usage_event(**kwargs):
        return None

    monkeypatch.setattr(resume_engine, "log_usage_event", fake_log_usage_event)

    result = await resume_engine.scan_resume(
        user_id=USER_ID,
        college_id=COLLEGE_ID,
        resume_id=None,
        job_description_id=None,
        resume_data=None,
        pdf_base64="ZmFrZQ==",
        job_description_text=None,
    )

    assert result.parsed_resume == {"basics": {"name": "Parsed from the PDF"}}
    assert result.parse_health["status"] == "partial"
    assert result.parse_health["sections_missing"] == ["Skills"]
