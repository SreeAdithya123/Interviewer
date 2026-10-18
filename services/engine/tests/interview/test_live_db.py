"""The one genuinely real integration test: no mocked provider-client
functions except the paid LLM call itself (`gemini.evaluate_interview` —
BUILD_SPEC Part 6: "Never call paid provider APIs in automated tests"), and
no `FakeClient` -- `app/interview/engine.py` talks to the real, live
Supabase project (`rhynjyamkeqsdvymmzhc`) via the real service-role client
from `app/db.py`.

This proves the actual table/column names and query shapes `engine.py`
uses are correct against the real schema, not just against this repo's own
mocked assumptions about it. Everything this test creates (a scratch
`interview_templates` row, a scratch `question_bank` row, one `interviews`
row and everything the real engine writes off of it) is deleted again at
the end, in FK-safe order, whether the test passes or fails.
"""

from __future__ import annotations

import contextlib
import uuid

from app.costs.tracking import compute_cost_paise
from app.db import get_client
from app.interview import engine
from app.providers import gemini


async def test_engine_writes_real_rows_against_the_live_supabase_project(monkeypatch):
    client = await get_client()
    suffix = uuid.uuid4().hex[:12]
    scoped_role = f"pytest-live-db-smoke-{suffix}"

    profiles_res = await client.table("profiles").select("id, college_id").limit(1).execute()
    assert profiles_res.data, (
        "no rows in the live `profiles` table to borrow a user_id from -- "
        "this test needs at least one real profile to reference, it does not create one"
    )
    profile = profiles_res.data[0]
    user_id = profile["id"]
    college_id = profile.get("college_id")

    template_id: str | None = None
    question_id: str | None = None
    interview_id: str | None = None

    try:
        template_res = await (
            client.table("interview_templates")
            .insert(
                {
                    "name": f"pytest-live-db-smoke-{suffix}",
                    "interview_type": "technical",
                    "stages": [{"stage": "intro", "question_count": 1}],
                    "max_follow_ups_per_question": 1,
                    "max_answer_seconds": 180,
                    "max_duration_seconds": 1500,
                    "is_active": True,
                }
            )
            .execute()
        )
        template_id = template_res.data[0]["id"]

        question_res = await (
            client.table("question_bank")
            .insert(
                {
                    "stage": "intro",
                    "interview_type": "technical",
                    "company_type": scoped_role,
                    "role": scoped_role,
                    "difficulty": "easy",
                    "question_text": "(pytest live-db smoke test) Tell me about yourself.",
                    "status": "reviewed",
                }
            )
            .execute()
        )
        question_id = question_res.data[0]["id"]

        interview_res = await (
            client.table("interviews")
            .insert(
                {
                    "user_id": user_id,
                    "college_id": college_id,
                    "template_id": template_id,
                    "interview_type": "technical",
                    "target_role": scoped_role,
                    "company_type": scoped_role,
                    "difficulty": "easy",
                    "status": "pending",
                }
            )
            .execute()
        )
        interview_id = interview_res.data[0]["id"]

        # Real engine call #1: starts the interview and must pick exactly
        # the scratch question_bank row seeded above (scoped_role makes it
        # the only possible match), writing a real interview_turns row.
        next_turn = await engine.get_next_turn(interview_id)

        assert next_turn.interview_finished is False
        assert next_turn.stage == "intro"
        assert next_turn.question_source == "question_bank"
        assert next_turn.question_bank_id == question_id
        assert next_turn.question_text == "(pytest live-db smoke test) Tell me about yourself."

        interview_row = (
            await client.table("interviews").select("*").eq("id", interview_id).execute()
        ).data[0]
        assert interview_row["status"] == "in_progress"
        assert interview_row["current_stage"] == "intro"

        turn_rows = (
            await client.table("interview_turns")
            .select("*")
            .eq("interview_id", interview_id)
            .execute()
        ).data
        assert len(turn_rows) == 1
        assert turn_rows[0]["question_bank_id"] == question_id

        # Real engine call #2: finish_interview, with only the paid LLM
        # call itself mocked, exercising the real interview_reports/
        # weak_areas/usage_events write paths end to end.
        async def fake_evaluate_interview(**_kwargs):
            return gemini.EvaluationResult(
                scores={"communication_clarity": {"score": 70, "evidence": ["pytest"]}},
                overall_score=70,
                strengths=["(pytest live-db smoke test)"],
                weak_areas=[{"skill": "pytest-smoke-skill", "severity": "low", "notes": "n/a"}],
                practice_actions=["a", "b", "c"],
                model_id="gemini-4-argon",
                input_tokens=10,
                output_tokens=5,
            )

        monkeypatch.setattr(gemini, "evaluate_interview", fake_evaluate_interview)

        await engine.finish_interview(interview_id)

        interview_row = (
            await client.table("interviews").select("*").eq("id", interview_id).execute()
        ).data[0]
        assert interview_row["status"] == "completed"

        report_row = (
            await client.table("interview_reports")
            .select("*")
            .eq("interview_id", interview_id)
            .execute()
        ).data[0]
        assert report_row["status"] == "completed"
        assert report_row["overall_score"] == 70
        assert report_row["prompt_version"] == "interview_evaluation_v1"

        weak_area_rows = (
            await client.table("weak_areas")
            .select("*")
            .eq("source_interview_id", interview_id)
            .execute()
        ).data
        assert len(weak_area_rows) == 1
        assert weak_area_rows[0]["skill"] == "pytest-smoke-skill"

        usage_rows = (
            await client.table("usage_events")
            .select("*")
            .eq("interview_id", interview_id)
            .execute()
        ).data
        assert len(usage_rows) == 1
        expected_cost = compute_cost_paise(
            provider="gemini", model="gemini-4-argon", units={"input_tokens": 10, "output_tokens": 5}
        )
        assert usage_rows[0]["cost_paise"] == expected_cost
        assert interview_row["total_cost_paise"] == expected_cost

    finally:
        # Clean up everything created, in FK-safe (children-first) order.
        # Each delete is independently best-effort so one failure never
        # stops the rest from still being attempted.
        if interview_id:
            for table in ("weak_areas",):
                with contextlib.suppress(Exception):
                    await client.table(table).delete().eq("source_interview_id", interview_id).execute()
            for table in ("usage_events", "interview_reports", "interview_turns"):
                with contextlib.suppress(Exception):
                    await client.table(table).delete().eq("interview_id", interview_id).execute()
            with contextlib.suppress(Exception):
                await client.table("interviews").delete().eq("id", interview_id).execute()
        if question_id:
            with contextlib.suppress(Exception):
                await client.table("question_bank").delete().eq("id", question_id).execute()
        if template_id:
            with contextlib.suppress(Exception):
                await client.table("interview_templates").delete().eq("id", template_id).execute()
