"""The one genuinely real integration test for the resume scanner: no
`FakeClient` -- `app/resume/engine.py` talks to the real, live Supabase
project (`rhynjyamkeqsdvymmzhc`) via the real service-role client from
`app/db.py`. Only the paid LLM call itself (`gemini.scan_resume`) is
mocked, per BUILD_SPEC Part 6 ("Never call paid provider APIs in
automated tests") -- the live, real-Gemini round trip for this feature
was instead verified manually against four hand-built PDF fixtures
(see docs/PROGRESS.md), which is not something to re-run on every test
pass.

This proves the real `resume_scans`/`usage_events` column names and
shapes are correct against the live schema, and specifically that
`resume_engine.scan_resume`'s "prefer the student's own structured data
over Gemini's echo of it" override (app/resume/engine.py's
`_parse_health_for_structured_resume`) survives a real jsonb round
trip -- including the frontend-generated `id` fields nested inside it,
which a real Postgres jsonb column could in principle normalize or
reorder even though Python dicts wouldn't.

Everything this test creates (a scratch `resumes` row, one
`resume_scans` row and its `usage_events` row) is deleted again at the
end, in FK-safe order, whether the test passes or fails.
"""

from __future__ import annotations

import contextlib
import uuid

from app.costs.tracking import compute_cost_paise
from app.db import get_client, reset_client
from app.providers import gemini
from app.resume import engine as resume_engine


async def test_scan_resume_writes_real_rows_against_the_live_supabase_project(monkeypatch):
    # Each test function gets its own event loop under pytest-asyncio's
    # default "auto" mode, but app/db.py caches its AsyncClient at module
    # scope -- without this, a client created (and bound to an HTTP
    # connection pool) by an earlier live-db test on an already-closed
    # loop would leak into this one and fail with "Event loop is closed".
    await reset_client()
    client = await get_client()
    suffix = uuid.uuid4().hex[:12]

    profiles_res = await client.table("profiles").select("id, college_id").limit(1).execute()
    assert profiles_res.data, (
        "no rows in the live `profiles` table to borrow a user_id from -- "
        "this test needs at least one real profile to reference, it does not create one"
    )
    profile = profiles_res.data[0]
    user_id = profile["id"]
    college_id = profile.get("college_id")

    resume_row_id: str | None = None
    scan_id: str | None = None

    resume_data = {
        "basics": {
            "name": f"pytest live-db smoke {suffix}",
            "label": "",
            "email": "",
            "phone": "",
            "location": "",
            "summary": "",
            "profiles": [],
        },
        "education": [
            {"id": f"edu-{suffix}", "institution": "Test University", "area": "CS", "studyType": "B.Tech", "startDate": "2022", "endDate": "2026", "score": "8.5"}
        ],
        "work": [
            {"id": f"work-{suffix}", "name": "TestCo", "position": "Intern", "startDate": "2025", "endDate": "2025", "summary": "", "highlights": ["Improved test coverage by 20%"]}
        ],
        "projects": [],
        "skills": [{"id": f"skill-{suffix}", "name": "Languages", "keywords": ["Python"]}],
        "certificates": [],
        "awards": [],
    }

    try:
        resume_res = await (
            client.table("resumes")
            .insert(
                {
                    "user_id": user_id,
                    "title": f"pytest-live-db-smoke-{suffix}",
                    "template": "minimal-professional",
                    "data": resume_data,
                    "version": 1,
                    "is_primary": False,
                }
            )
            .execute()
        )
        resume_row_id = resume_res.data[0]["id"]

        # Only the paid LLM call is mocked -- everything downstream
        # (the resume_scans insert, the usage_events insert, the
        # parse_health override) is the real wrapper logic.
        async def fake_scan_resume(**_kwargs) -> gemini.ScanResult:
            return gemini.ScanResult(
                parsed_resume={"note": "Gemini's own echo -- must NOT be what gets stored"},
                parse_health={"status": "poor", "sections_detected": [], "sections_missing": [], "notes": ["should be overridden"]},
                jd_match=None,
                bullet_quality={
                    "bullets": [
                        {
                            "section": "Experience",
                            "text": "Improved test coverage by 20%",
                            "issues": [],
                            "suggestion": None,
                        }
                    ],
                    "overall_notes": ["(pytest live-db smoke test)"],
                },
                formatting_risks={"risks": []},
                model_id="gemini-3.5-flash-lite",
                input_tokens=321,
                output_tokens=123,
            )

        monkeypatch.setattr(gemini, "scan_resume", fake_scan_resume)

        result = await resume_engine.scan_resume(
            user_id=user_id,
            college_id=college_id,
            resume_id=resume_row_id,
            job_description_id=None,
            resume_data=resume_data,
            pdf_base64=None,
            job_description_text=None,
        )
        scan_id = result.scan_id

        # The override: stored/returned parsed_resume is the original
        # structured data (ids intact), never Gemini's own echo.
        assert result.parsed_resume == resume_data
        assert result.parse_health["status"] == "clean"
        assert result.bullet_quality["bullets"][0]["suggestion"] is None

        scan_row = (
            await client.table("resume_scans").select("*").eq("id", scan_id).execute()
        ).data[0]
        assert scan_row["user_id"] == user_id
        assert scan_row["resume_id"] == resume_row_id
        assert scan_row["parsed_resume"] == resume_data
        assert scan_row["parsed_resume"]["education"][0]["id"] == f"edu-{suffix}"
        assert scan_row["parse_health"]["status"] == "clean"

        usage_rows = (
            await client.table("usage_events").select("*").eq("resume_scan_id", scan_id).execute()
        ).data
        assert len(usage_rows) == 1
        assert usage_rows[0]["feature"] == "resume_scan"
        assert usage_rows[0]["user_id"] == user_id
        expected_cost = compute_cost_paise(
            provider="gemini", model="gemini-3.5-flash-lite", units={"input_tokens": 321, "output_tokens": 123}
        )
        assert usage_rows[0]["cost_paise"] == expected_cost

    finally:
        if scan_id:
            with contextlib.suppress(Exception):
                await client.table("usage_events").delete().eq("resume_scan_id", scan_id).execute()
            with contextlib.suppress(Exception):
                await client.table("resume_scans").delete().eq("id", scan_id).execute()
        if resume_row_id:
            with contextlib.suppress(Exception):
                await client.table("resumes").delete().eq("id", resume_row_id).execute()
