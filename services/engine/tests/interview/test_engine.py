"""Unit tests for the interview state machine (`app/interview/engine.py`).

Every test here uses the in-memory `FakeClient` (tests/interview/fakes.py)
for the database and monkeypatches the provider-client functions directly
(`app.providers.stt.transcribe_with_fallback`, `gemini.generate_followup`,
`gemini.evaluate_interview`) — never real HTTP calls, per
docs/BUILD_SPEC.md Part 6 ("Never call paid provider APIs in automated
tests"). This file tests the real state-machine logic: stage progression,
follow-up cap enforcement, the 180s/25-minute hard limits, and that
finishing an interview writes a real, evidence-bearing report.

The one test that touches the real, live Supabase project
(`test_live_db.py`) is kept in its own file so it is obviously the
exception, not the rule.
"""

from __future__ import annotations

from datetime import UTC, datetime, timedelta

import pytest

from app.costs import tracking
from app.interview import engine
from app.providers import gemini
from app.providers.stt import FallbackTranscriptionResult
from app.providers.types import TranscriptionResult
from tests.interview.fakes import FakeClient

INTERVIEW_ID = "11111111-1111-1111-1111-111111111111"
TEMPLATE_ID = "22222222-2222-2222-2222-222222222222"
USER_ID = "33333333-3333-3333-3333-333333333333"
COLLEGE_ID = "44444444-4444-4444-4444-444444444444"

# Two stages, one question each, at most 1 follow-up per question -- small
# enough to drive through completely in a handful of turns.
TWO_STAGE_TEMPLATE = {
    "id": TEMPLATE_ID,
    "name": "test-template",
    "interview_type": "technical",
    "stages": [
        {"stage": "intro", "question_count": 1},
        {"stage": "technical", "question_count": 1},
    ],
    "max_follow_ups_per_question": 1,
    "max_answer_seconds": 180,
    "max_duration_seconds": 1500,
    "is_active": True,
}


def _recent_start(seconds_ago: float = 10.0) -> str:
    """A `started_at` timestamp `seconds_ago` in the past, relative to the
    real wall clock -- never a hardcoded date, since this suite must keep
    working no matter when it runs."""
    return (datetime.now(UTC) - timedelta(seconds=seconds_ago)).isoformat()


def make_interview(**overrides) -> dict:
    base = {
        "id": INTERVIEW_ID,
        "user_id": USER_ID,
        "college_id": COLLEGE_ID,
        "template_id": TEMPLATE_ID,
        "interview_type": "technical",
        "target_role": "Backend Engineer",
        "company_type": "product",
        "difficulty": "medium",
        "status": "pending",
        "current_stage": None,
        "started_at": None,
        "ended_at": None,
        "duration_seconds": None,
        "eye_contact_pct": None,
        "posture_stability_pct": None,
        "total_cost_paise": 0,
    }
    base.update(overrides)
    return base


def make_question(**overrides) -> dict:
    base = {
        "id": "q-" + overrides.get("stage", "intro"),
        "stage": "intro",
        "interview_type": "technical",
        "company_type": "product",
        "role": "Backend Engineer",
        "difficulty": "medium",
        "question_text": "Tell me about yourself.",
        "status": "reviewed",
    }
    base.update(overrides)
    return base


@pytest.fixture
def fake_client(monkeypatch) -> FakeClient:
    client = FakeClient()

    async def _get_client():
        return client

    # `engine.py` and `tracking.py` each did `from app.db import get_client`,
    # which binds its own independent name in each module's namespace -- so
    # patching `app.db.get_client` alone would not reach either of them.
    # Patch both call sites directly instead.
    monkeypatch.setattr(engine, "get_client", _get_client)
    monkeypatch.setattr(tracking, "get_client", _get_client)
    return client


def _stub_transcription(text: str = "my answer", provider: str = "groq") -> FallbackTranscriptionResult:
    return FallbackTranscriptionResult(
        result=TranscriptionResult(
            text=text, provider=provider, model_id="whisper-large-v3", latency_ms=10
        ),
        fallback_used=(provider != "groq"),
    )


async def _no_followup_needed(**_kwargs) -> gemini.FollowupResult:
    """Stands in for `gemini.generate_followup` in tests that aren't
    exercising follow-up generation itself: the model looked at the answer
    and decided it needed no probing, which is a real, expected outcome
    (see prompts/interview_followup_v1.txt), not a test shortcut."""
    return gemini.FollowupResult(
        follow_up_question=None, model_id="gemini-2.5-flash-lite", input_tokens=5, output_tokens=2
    )


# ---------------------------------------------------------------------------
# Stage progression
# ---------------------------------------------------------------------------


async def test_first_call_starts_interview_and_asks_intro_question(fake_client, monkeypatch):
    fake_client.seed("interviews", [make_interview()])
    fake_client.seed("interview_templates", [TWO_STAGE_TEMPLATE])
    fake_client.seed("question_bank", [make_question(stage="intro", question_text="Walk me through your resume.")])

    result = await engine.get_next_turn(INTERVIEW_ID)

    assert result.interview_finished is False
    assert result.stage == "intro"
    assert result.question_source == "question_bank"
    assert result.question_text == "Walk me through your resume."
    assert result.is_follow_up is False

    interview_row = fake_client.tables["interviews"][0]
    assert interview_row["status"] == "in_progress"
    assert interview_row["current_stage"] == "intro"
    assert interview_row["started_at"] is not None


async def test_advances_to_next_stage_once_stage_questions_are_exhausted(fake_client, monkeypatch):
    monkeypatch.setattr(gemini, "generate_followup", _no_followup_needed)
    fake_client.seed("interviews", [make_interview(status="in_progress", current_stage="intro", started_at=_recent_start())])
    fake_client.seed("interview_templates", [TWO_STAGE_TEMPLATE])
    fake_client.seed("question_bank", [
        make_question(stage="intro", id="q-intro"),
        make_question(stage="technical", id="q-tech", question_text="Explain how a hash map works."),
    ])
    # The intro question has already been asked and answered.
    fake_client.seed("interview_turns", [
        {
            "id": "turn-1",
            "interview_id": INTERVIEW_ID,
            "turn_number": 1,
            "stage": "intro",
            "question_text": "Tell me about yourself.",
            "question_source": "question_bank",
            "question_bank_id": "q-intro",
            "is_follow_up": False,
            "follow_up_of_turn_id": None,
            "transcript": "I am a backend engineer with three years of experience.",
        }
    ])

    result = await engine.get_next_turn(INTERVIEW_ID)

    assert result.interview_finished is False
    assert result.stage == "technical"
    assert result.question_text == "Explain how a hash map works."

    interview_row = fake_client.tables["interviews"][0]
    assert interview_row["current_stage"] == "technical"


async def test_finishes_interview_once_every_stage_is_done(fake_client, monkeypatch):
    monkeypatch.setattr(gemini, "generate_followup", _no_followup_needed)
    fake_client.seed("interviews", [make_interview(status="in_progress", current_stage="technical", started_at=_recent_start())])
    fake_client.seed("interview_templates", [TWO_STAGE_TEMPLATE])
    fake_client.seed("interview_turns", [
        {
            "id": "turn-1", "interview_id": INTERVIEW_ID, "turn_number": 1, "stage": "intro",
            "question_text": "Q1", "question_source": "question_bank", "question_bank_id": "q-intro",
            "is_follow_up": False, "follow_up_of_turn_id": None, "transcript": "answer 1",
        },
        {
            "id": "turn-2", "interview_id": INTERVIEW_ID, "turn_number": 2, "stage": "technical",
            "question_text": "Q2", "question_source": "question_bank", "question_bank_id": "q-tech",
            "is_follow_up": False, "follow_up_of_turn_id": None, "transcript": "answer 2",
        },
    ])

    async def fake_evaluate_interview(**_kwargs):
        return gemini.EvaluationResult(
            scores={"communication_clarity": {"score": 80, "evidence": ["answer 1"]}},
            overall_score=80,
            strengths=["clear communicator"],
            weak_areas=[],
            practice_actions=["practice more", "practice more 2", "practice more 3"],
            model_id="gemini-4-argon",
            input_tokens=100,
            output_tokens=50,
        )

    monkeypatch.setattr(gemini, "evaluate_interview", fake_evaluate_interview)

    result = await engine.get_next_turn(INTERVIEW_ID)

    assert result.interview_finished is True
    interview_row = fake_client.tables["interviews"][0]
    assert interview_row["status"] == "completed"


# ---------------------------------------------------------------------------
# Follow-up cap enforcement
# ---------------------------------------------------------------------------


async def test_generates_a_follow_up_when_one_is_warranted(fake_client, monkeypatch):
    fake_client.seed("interviews", [make_interview(status="in_progress", current_stage="intro", started_at=_recent_start())])
    fake_client.seed("interview_templates", [TWO_STAGE_TEMPLATE])
    fake_client.seed("interview_turns", [
        {
            "id": "turn-1", "interview_id": INTERVIEW_ID, "turn_number": 1, "stage": "intro",
            "question_text": "Tell me about yourself.", "question_source": "question_bank",
            "question_bank_id": "q-intro", "is_follow_up": False, "follow_up_of_turn_id": None,
            "transcript": "I built something cool.",
        }
    ])

    async def fake_generate_followup(**_kwargs):
        return gemini.FollowupResult(
            follow_up_question="What specifically did you build?",
            model_id="gemini-2.5-flash-lite",
            input_tokens=20,
            output_tokens=10,
        )

    monkeypatch.setattr(gemini, "generate_followup", fake_generate_followup)

    result = await engine.get_next_turn(INTERVIEW_ID)

    assert result.interview_finished is False
    assert result.is_follow_up is True
    assert result.question_source == "follow_up"
    assert result.follow_up_of_turn_id == "turn-1"
    assert result.question_text == "What specifically did you build?"

    # The follow-up call must be metered (BUILD_SPEC Part 5).
    usage_rows = fake_client.tables.get("usage_events", [])
    assert len(usage_rows) == 1
    assert usage_rows[0]["provider"] == "gemini"
    assert usage_rows[0]["feature"] == "interview"
    assert usage_rows[0]["cost_paise"] >= 0


async def test_stops_asking_follow_ups_once_the_template_cap_is_reached(fake_client, monkeypatch):
    """max_follow_ups_per_question=1 on the template: once one follow-up has
    already been asked for a question, a second must never be generated,
    even if the LLM would have returned one -- enforced by never calling
    it."""
    fake_client.seed("interviews", [make_interview(status="in_progress", current_stage="intro", started_at=_recent_start())])
    fake_client.seed("interview_templates", [TWO_STAGE_TEMPLATE])
    fake_client.seed("question_bank", [make_question(stage="technical", id="q-tech", question_text="Next question.")])
    fake_client.seed("interview_turns", [
        {
            "id": "turn-1", "interview_id": INTERVIEW_ID, "turn_number": 1, "stage": "intro",
            "question_text": "Tell me about yourself.", "question_source": "question_bank",
            "question_bank_id": "q-intro", "is_follow_up": False, "follow_up_of_turn_id": None,
            "transcript": "I built something cool.",
        },
        {
            "id": "turn-2", "interview_id": INTERVIEW_ID, "turn_number": 2, "stage": "intro",
            "question_text": "What specifically?", "question_source": "follow_up",
            "question_bank_id": None, "is_follow_up": True, "follow_up_of_turn_id": "turn-1",
            "transcript": "A chatbot.",
        },
    ])

    def fail_if_called(**_kwargs):
        raise AssertionError("generate_followup must not be called once the follow-up cap is reached")

    monkeypatch.setattr(gemini, "generate_followup", fail_if_called)

    result = await engine.get_next_turn(INTERVIEW_ID)

    # Intro's one question_count is already satisfied by turn-1 (the
    # follow-up doesn't count toward question_count), so this should move
    # straight to the technical stage without ever consulting the LLM.
    assert result.interview_finished is False
    assert result.stage == "technical"


# ---------------------------------------------------------------------------
# Hard limits
# ---------------------------------------------------------------------------


async def test_submit_answer_rejects_an_answer_over_the_per_answer_limit(fake_client):
    fake_client.seed("interviews", [make_interview(status="in_progress", current_stage="intro", started_at=_recent_start())])
    fake_client.seed("interview_templates", [TWO_STAGE_TEMPLATE])
    fake_client.seed("interview_turns", [
        {
            "id": "turn-1", "interview_id": INTERVIEW_ID, "turn_number": 1, "stage": "intro",
            "question_text": "Tell me about yourself.", "question_source": "question_bank",
            "question_bank_id": "q-intro", "is_follow_up": False, "follow_up_of_turn_id": None,
            "transcript": None,
        },
    ])

    with pytest.raises(engine.AnswerTooLongError):
        await engine.submit_answer(INTERVIEW_ID, "turn-1", b"fake-audio-bytes", 181.0)

    # Rejected outright: no transcript written, no usage event logged.
    turn_row = fake_client.tables["interview_turns"][0]
    assert turn_row["transcript"] is None
    assert fake_client.tables.get("usage_events", []) == []


async def test_get_next_turn_finishes_interview_once_duration_cap_elapsed(fake_client, monkeypatch):
    # started_at far enough in the past to have exceeded max_duration_seconds.
    fake_client.seed("interviews", [
        make_interview(status="in_progress", current_stage="intro", started_at=_recent_start(2000.0))
    ])
    fake_client.seed("interview_templates", [TWO_STAGE_TEMPLATE])

    async def fake_evaluate_interview(**_kwargs):
        return gemini.EvaluationResult(
            scores={}, overall_score=0, strengths=[], weak_areas=[], practice_actions=[],
            model_id="gemini-4-argon", input_tokens=1, output_tokens=1,
        )

    monkeypatch.setattr(gemini, "evaluate_interview", fake_evaluate_interview)

    result = await engine.get_next_turn(INTERVIEW_ID)

    assert result.interview_finished is True
    assert fake_client.tables["interviews"][0]["status"] == "completed"


async def test_submit_answer_transcribes_and_advances_to_next_turn(fake_client, monkeypatch):
    monkeypatch.setattr(gemini, "generate_followup", _no_followup_needed)
    fake_client.seed("interviews", [make_interview(status="in_progress", current_stage="intro", started_at=_recent_start())])
    fake_client.seed("interview_templates", [TWO_STAGE_TEMPLATE])
    fake_client.seed("question_bank", [make_question(stage="technical", id="q-tech", question_text="Next question.")])
    fake_client.seed("interview_turns", [
        {
            "id": "turn-1", "interview_id": INTERVIEW_ID, "turn_number": 1, "stage": "intro",
            "question_text": "Tell me about yourself.", "question_source": "question_bank",
            "question_bank_id": "q-intro", "is_follow_up": False, "follow_up_of_turn_id": None,
            "transcript": None,
        },
    ])

    async def fake_transcribe_with_fallback(_audio_bytes, _vocabulary_hint=None):
        return _stub_transcription("I am a backend engineer.", provider="groq")

    monkeypatch.setattr(engine, "transcribe_with_fallback", fake_transcribe_with_fallback)

    result = await engine.submit_answer(INTERVIEW_ID, "turn-1", b"fake-audio-bytes", 42.0)

    assert result.transcript == "I am a backend engineer."
    assert result.stt_provider == "groq"
    assert result.stt_fallback_used is False
    assert result.next_turn.interview_finished is False
    assert result.next_turn.stage == "technical"

    turn_row = next(r for r in fake_client.tables["interview_turns"] if r["id"] == "turn-1")
    assert turn_row["transcript"] == "I am a backend engineer."
    assert turn_row["stt_provider"] == "groq"
    assert turn_row["answer_duration_seconds"] == 42.0

    usage_rows = fake_client.tables.get("usage_events", [])
    stt_events = [r for r in usage_rows if r["feature"] == "stt"]
    assert len(stt_events) == 1
    assert stt_events[0]["units"] == {"audio_seconds": 42.0}


async def test_submit_answer_records_sarvam_fallback_usage(fake_client, monkeypatch):
    monkeypatch.setattr(gemini, "generate_followup", _no_followup_needed)
    fake_client.seed("interviews", [make_interview(status="in_progress", current_stage="intro", started_at=_recent_start())])
    fake_client.seed("interview_templates", [TWO_STAGE_TEMPLATE])
    fake_client.seed("question_bank", [make_question(stage="technical", id="q-tech")])
    fake_client.seed("interview_turns", [
        {
            "id": "turn-1", "interview_id": INTERVIEW_ID, "turn_number": 1, "stage": "intro",
            "question_text": "Tell me about yourself.", "question_source": "question_bank",
            "question_bank_id": "q-intro", "is_follow_up": False, "follow_up_of_turn_id": None,
            "transcript": None,
        },
    ])

    async def fake_transcribe_with_fallback(_audio_bytes, _vocabulary_hint=None):
        return _stub_transcription("fallback transcript", provider="sarvam")

    monkeypatch.setattr(engine, "transcribe_with_fallback", fake_transcribe_with_fallback)

    result = await engine.submit_answer(INTERVIEW_ID, "turn-1", b"fake-audio-bytes", 15.0)

    assert result.stt_provider == "sarvam"
    assert result.stt_fallback_used is True
    turn_row = next(r for r in fake_client.tables["interview_turns"] if r["id"] == "turn-1")
    assert turn_row["stt_fallback_used"] is True


# ---------------------------------------------------------------------------
# finish_interview: evidence-bearing report
# ---------------------------------------------------------------------------


async def test_finish_interview_writes_evidence_bearing_report_and_weak_areas(fake_client, monkeypatch):
    fake_client.seed("interviews", [
        make_interview(status="in_progress", current_stage="technical", started_at=_recent_start())
    ])
    fake_client.seed("interview_templates", [TWO_STAGE_TEMPLATE])
    transcript_answer = "I used a binary search tree because lookups needed to be O(log n)."
    fake_client.seed("interview_turns", [
        {
            "id": "turn-1", "interview_id": INTERVIEW_ID, "turn_number": 1, "stage": "technical",
            "question_text": "How did you speed up lookups?", "question_source": "question_bank",
            "question_bank_id": "q-tech", "is_follow_up": False, "follow_up_of_turn_id": None,
            "transcript": transcript_answer,
        },
    ])

    async def fake_evaluate_interview(*, transcript_turns, **_kwargs):
        # The evaluation call must actually receive the real transcript.
        assert transcript_turns[0]["answer"] == transcript_answer
        return gemini.EvaluationResult(
            scores={
                "technical_depth": {"score": 85, "evidence": [transcript_answer]},
            },
            overall_score=82,
            strengths=["chose the right data structure for the constraint"],
            weak_areas=[{"skill": "system design breadth", "severity": "low", "notes": "only one data structure discussed"}],
            practice_actions=["practice explaining trade-offs", "practice a system design walkthrough", "practice explaining Big-O"],
            model_id="gemini-4-argon",
            input_tokens=500,
            output_tokens=150,
            thoughts_tokens=30,
        )

    monkeypatch.setattr(gemini, "evaluate_interview", fake_evaluate_interview)

    await engine.finish_interview(INTERVIEW_ID)

    interview_row = fake_client.tables["interviews"][0]
    assert interview_row["status"] == "completed"
    assert interview_row["ended_at"] is not None

    report_rows = fake_client.tables["interview_reports"]
    assert len(report_rows) == 1
    report = report_rows[0]
    assert report["status"] == "completed"
    assert report["model_id"] == "gemini-4-argon"
    assert report["prompt_version"] == "interview_evaluation_v1"
    assert report["overall_score"] == 82
    # Evidence must exist and must actually be a substring of the real
    # transcript -- never invented, per BUILD_SPEC Part 4.5 step 8.
    evidence_quotes = report["scores"]["technical_depth"]["evidence"]
    assert evidence_quotes
    for quote in evidence_quotes:
        assert quote in transcript_answer

    weak_area_rows = fake_client.tables["weak_areas"]
    assert len(weak_area_rows) == 1
    assert weak_area_rows[0]["source"] == "interview_report"
    assert weak_area_rows[0]["source_interview_id"] == INTERVIEW_ID
    assert weak_area_rows[0]["skill"] == "system design breadth"

    # Gemini eval usage must be metered, and the interview's total_cost_paise
    # rolled up from usage_events (BUILD_SPEC Part 5).
    usage_rows = fake_client.tables["usage_events"]
    eval_events = [r for r in usage_rows if r["feature"] == "interview" and r["provider"] == "gemini"]
    assert len(eval_events) == 1
    assert interview_row["total_cost_paise"] == sum(r["cost_paise"] for r in usage_rows)


async def test_finish_interview_marks_report_failed_on_evaluation_error(fake_client, monkeypatch):
    fake_client.seed("interviews", [
        make_interview(status="in_progress", current_stage="technical", started_at=_recent_start())
    ])
    fake_client.seed("interview_templates", [TWO_STAGE_TEMPLATE])
    fake_client.seed("interview_turns", [
        {
            "id": "turn-1", "interview_id": INTERVIEW_ID, "turn_number": 1, "stage": "technical",
            "question_text": "Q", "question_source": "question_bank", "question_bank_id": "q-tech",
            "is_follow_up": False, "follow_up_of_turn_id": None, "transcript": "A",
        },
    ])

    async def fake_evaluate_interview(**_kwargs):
        raise RuntimeError("Gemini returned a blocked prompt response")

    monkeypatch.setattr(gemini, "evaluate_interview", fake_evaluate_interview)

    await engine.finish_interview(INTERVIEW_ID)

    report = fake_client.tables["interview_reports"][0]
    assert report["status"] == "failed"
    assert "blocked" in report["error_message"]
    # The interview itself still ends even though the report failed.
    assert fake_client.tables["interviews"][0]["status"] == "completed"


async def test_finish_interview_is_idempotent(fake_client, monkeypatch):
    fake_client.seed("interviews", [
        make_interview(status="completed", current_stage="technical", started_at=_recent_start())
    ])
    fake_client.seed("interview_templates", [TWO_STAGE_TEMPLATE])

    def fail_if_called(**_kwargs):
        raise AssertionError("evaluate_interview must not run again for an already-completed interview")

    monkeypatch.setattr(gemini, "evaluate_interview", fail_if_called)

    await engine.finish_interview(INTERVIEW_ID)  # must simply return, no error

    assert fake_client.tables.get("interview_reports", []) == []


# ---------------------------------------------------------------------------
# State validation
# ---------------------------------------------------------------------------


async def test_get_next_turn_rejects_an_already_completed_interview(fake_client):
    fake_client.seed("interviews", [make_interview(status="completed")])
    fake_client.seed("interview_templates", [TWO_STAGE_TEMPLATE])

    with pytest.raises(engine.InvalidInterviewStateError):
        await engine.get_next_turn(INTERVIEW_ID)


async def test_submit_answer_rejects_a_turn_that_already_has_a_transcript(fake_client):
    fake_client.seed("interviews", [make_interview(status="in_progress", current_stage="intro", started_at=_recent_start())])
    fake_client.seed("interview_templates", [TWO_STAGE_TEMPLATE])
    fake_client.seed("interview_turns", [
        {
            "id": "turn-1", "interview_id": INTERVIEW_ID, "turn_number": 1, "stage": "intro",
            "question_text": "Q", "question_source": "question_bank", "question_bank_id": "q-intro",
            "is_follow_up": False, "follow_up_of_turn_id": None, "transcript": "already answered",
        },
    ])

    with pytest.raises(engine.InvalidInterviewStateError):
        await engine.submit_answer(INTERVIEW_ID, "turn-1", b"audio", 10.0)


async def test_get_next_turn_raises_not_found_for_unknown_interview(fake_client):
    with pytest.raises(engine.InterviewNotFoundError):
        await engine.get_next_turn("does-not-exist")
