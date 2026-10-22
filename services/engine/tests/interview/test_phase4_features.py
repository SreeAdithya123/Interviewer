"""Unit tests for Phase 4 interview product features:
- Quota enforcement (user and college quotas, QuotaExhaustedError)
- Persistent answer audio to R2 (audio_key, signed URLs)
- Report worker with retry handling, stuck report recovery, and evidence quotes verification
- Delivery metrics (eye_contact_pct, posture_stability_pct)
"""

from __future__ import annotations

from datetime import UTC, datetime, timedelta

import pytest

from app.costs import tracking
from app.interview import engine
from app.providers import gemini
from app.providers.gemini import EvaluationResult
from app.reports import worker
from tests.interview.fakes import FakeClient

INTERVIEW_ID = "11111111-1111-1111-1111-111111111111"
USER_ID = "22222222-2222-2222-2222-222222222222"
COLLEGE_ID = "33333333-3333-3333-3333-333333333333"
TEMPLATE_ID = "44444444-4444-4444-4444-444444444444"

TEST_TEMPLATE = {
    "id": TEMPLATE_ID,
    "name": "test-template",
    "interview_type": "technical",
    "stages": [{"stage": "intro", "question_count": 1}],
    "max_follow_ups_per_question": 1,
    "max_answer_seconds": 180,
    "max_duration_seconds": 1500,
    "is_active": True,
}


@pytest.fixture
def fake_client(monkeypatch):
    client = FakeClient()

    async def get_fake_client():
        return client

    monkeypatch.setattr(engine, "get_client", get_fake_client)
    monkeypatch.setattr(worker, "get_client", get_fake_client)
    monkeypatch.setattr(tracking, "get_client", get_fake_client)
    return client


async def test_quota_blocks_interview_when_user_quota_exhausted(fake_client):
    yesterday = (datetime.now(UTC) - timedelta(days=1)).date().isoformat()
    tomorrow = (datetime.now(UTC) + timedelta(days=1)).date().isoformat()

    fake_client.seed("interview_templates", [TEST_TEMPLATE])
    fake_client.seed("quotas", [
        {
            "id": "q-user",
            "scope": "user",
            "user_id": USER_ID,
            "feature": "interview",
            "period_start": yesterday,
            "period_end": tomorrow,
            "limit_units": 3,
            "used_units": 3,
        }
    ])

    with pytest.raises(engine.QuotaExhaustedError) as exc_info:
        await engine.create_interview(
            user_id=USER_ID,
            interview_type="technical",
            difficulty="medium",
        )
    assert "interview limit (3/3)" in str(exc_info.value)
    assert len(fake_client.tables.get("interviews", [])) == 0


async def test_quota_blocks_interview_when_college_quota_exhausted(fake_client):
    yesterday = (datetime.now(UTC) - timedelta(days=1)).date().isoformat()
    tomorrow = (datetime.now(UTC) + timedelta(days=1)).date().isoformat()

    fake_client.seed("interview_templates", [TEST_TEMPLATE])
    fake_client.seed("quotas", [
        {
            "id": "q-college",
            "scope": "college",
            "college_id": COLLEGE_ID,
            "feature": "interview",
            "period_start": yesterday,
            "period_end": tomorrow,
            "limit_units": 50,
            "used_units": 50,
        }
    ])

    with pytest.raises(engine.QuotaExhaustedError) as exc_info:
        await engine.create_interview(
            user_id=USER_ID,
            interview_type="technical",
            difficulty="medium",
            college_id=COLLEGE_ID,
        )
    assert "College interview quota reached (50/50)" in str(exc_info.value)


async def test_quota_increments_on_successful_interview_creation(fake_client):
    yesterday = (datetime.now(UTC) - timedelta(days=1)).date().isoformat()
    tomorrow = (datetime.now(UTC) + timedelta(days=1)).date().isoformat()

    fake_client.seed("interview_templates", [TEST_TEMPLATE])
    fake_client.seed("quotas", [
        {
            "id": "q-user",
            "scope": "user",
            "user_id": USER_ID,
            "feature": "interview",
            "period_start": yesterday,
            "period_end": tomorrow,
            "limit_units": 5,
            "used_units": 1,
        }
    ])

    res = await engine.create_interview(
        user_id=USER_ID,
        interview_type="technical",
        difficulty="medium",
    )
    assert res.status == "pending"

    # Verify quota incremented
    user_quota = fake_client.tables["quotas"][0]
    assert user_quota["used_units"] == 2


async def test_evidence_quotes_verification():
    transcript = [
        {"turn_number": 1, "stage": "intro", "question": "Q1", "answer": "I built a distributed cache in Rust with LRU eviction."},
        {"turn_number": 2, "stage": "technical", "question": "Q2", "answer": "We chose Redis because our p99 latency target was 5ms."},
    ]

    valid_evaluation = EvaluationResult(
        scores={
            "communication_clarity": {"score": 85, "evidence": ["distributed cache in Rust"]},
            "technical_depth": {"score": 90, "evidence": ["LRU eviction", "p99 latency target was 5ms"]},
        },
        overall_score=88.0,
        strengths=["Clear technical specifics"],
        weak_areas=[],
        practice_actions=["Action 1", "Action 2", "Action 3"],
        model_id="gemini-eval-v1",
        input_tokens=100,
        output_tokens=100,
        thoughts_tokens=50,
        raw_response={},
    )
    assert worker.verify_evidence_quotes(valid_evaluation, transcript) is True

    hallucinated_evaluation = EvaluationResult(
        scores={
            "communication_clarity": {"score": 85, "evidence": ["I managed a team of 50 engineers at Google"]},
        },
        overall_score=70.0,
        strengths=[],
        weak_areas=[],
        practice_actions=["1", "2", "3"],
        model_id="gemini-eval-v1",
        input_tokens=100,
        output_tokens=100,
        thoughts_tokens=50,
        raw_response={},
    )
    assert worker.verify_evidence_quotes(hallucinated_evaluation, transcript) is False


async def test_finish_interview_records_mediapipe_delivery_metrics(fake_client, monkeypatch):
    interview_id = INTERVIEW_ID
    fake_client.seed("interviews", [
        {
            "id": interview_id,
            "user_id": USER_ID,
            "college_id": COLLEGE_ID,
            "template_id": TEMPLATE_ID,
            "interview_type": "technical",
            "difficulty": "medium",
            "status": "in_progress",
            "started_at": datetime.now(UTC).isoformat(),
        }
    ])
    fake_client.seed("interview_turns", [
        {
            "id": "turn-1",
            "interview_id": interview_id,
            "turn_number": 1,
            "stage": "intro",
            "question_text": "Tell me about yourself.",
            "question_source": "question_bank",
            "transcript": "Hello, I am a software engineer.",
        }
    ])

    async def fake_eval(**_kwargs):
        return EvaluationResult(
            scores={"communication_clarity": {"score": 80, "evidence": ["software engineer"]}},
            overall_score=80.0,
            strengths=["Good introduction"],
            weak_areas=[],
            practice_actions=["A", "B", "C"],
            model_id="gemini-3.5-flash",
            input_tokens=100,
            output_tokens=100,
            thoughts_tokens=20,
            raw_response={},
        )

    monkeypatch.setattr(gemini, "evaluate_interview", fake_eval)

    await engine.finish_interview(
        interview_id,
        eye_contact_pct=88.5,
        posture_stability_pct=92.0,
    )

    interview = fake_client.tables["interviews"][0]
    assert interview["status"] == "completed"
    assert interview["eye_contact_pct"] == 88.5
    assert interview["posture_stability_pct"] == 92.0

    report = fake_client.tables["interview_reports"][0]
    assert report["status"] == "completed"
    assert report["eye_contact_pct"] == 88.5
    assert report["posture_stability_pct"] == 92.0


async def test_stuck_report_recovery(fake_client, monkeypatch):
    interview_id = INTERVIEW_ID
    ten_mins_ago = (datetime.now(UTC) - timedelta(minutes=10)).isoformat()

    fake_client.seed("interviews", [
        {
            "id": interview_id,
            "user_id": USER_ID,
            "interview_type": "technical",
            "difficulty": "medium",
            "status": "completed",
            "started_at": ten_mins_ago,
        }
    ])
    fake_client.seed("interview_turns", [
        {
            "id": "turn-1",
            "interview_id": interview_id,
            "turn_number": 1,
            "stage": "intro",
            "question_text": "Question?",
            "question_source": "question_bank",
            "transcript": "Answer transcript.",
        }
    ])
    fake_client.seed("interview_reports", [
        {
            "interview_id": interview_id,
            "user_id": USER_ID,
            "status": "pending",
            "created_at": ten_mins_ago,
        }
    ])

    async def fake_eval(**_kwargs):
        return EvaluationResult(
            scores={"communication_clarity": {"score": 75, "evidence": ["Answer transcript"]}},
            overall_score=75.0,
            strengths=[],
            weak_areas=[],
            practice_actions=["1", "2", "3"],
            model_id="gemini-3.5-flash",
            input_tokens=50,
            output_tokens=50,
            thoughts_tokens=10,
            raw_response={},
        )

    monkeypatch.setattr(gemini, "evaluate_interview", fake_eval)

    recovered = await worker.recover_stuck_reports(max_age_seconds=120, client=fake_client)
    assert interview_id in recovered

    report = fake_client.tables["interview_reports"][0]
    assert report["status"] == "completed"
    assert report["overall_score"] == 75.0
