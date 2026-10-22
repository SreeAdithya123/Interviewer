"""Tests for app/providers/gemini.py.

Per BUILD_SPEC Part 6 ("Never call paid provider APIs in automated tests.
Use recorded fixtures and mocks"), every HTTP call to
generativelanguage.googleapis.com is intercepted by respx — none of these
tests ever reach the real network.
"""

from __future__ import annotations

import json

import httpx
import pytest
import respx

from app.providers.gemini import (
    GEMINI_CONVERSATION_API_BASE,
    GEMINI_CONVERSATION_MODEL_ID,
    GEMINI_CONVERSATION_PATH,
    GEMINI_EMBEDDING_API_BASE,
    GEMINI_EMBEDDING_MODEL_ID,
    GEMINI_EMBEDDING_OUTPUT_DIMENSIONALITY,
    GEMINI_EMBEDDING_PATH,
    GEMINI_EVALUATION_API_BASE,
    GEMINI_EVALUATION_MODEL_ID,
    GEMINI_EVALUATION_PATH,
    EmbeddingDimensionMismatchError,
    GeminiError,
    embed_text,
    evaluate_interview,
    generate_chat_reply,
    generate_followup,
    rewrite_resume_bullet,
    scan_resume,
)

_FOLLOWUP_URL = f"{GEMINI_CONVERSATION_API_BASE}{GEMINI_CONVERSATION_PATH}"
_EVALUATION_URL = f"{GEMINI_EVALUATION_API_BASE}{GEMINI_EVALUATION_PATH}"
_EMBED_URL = f"{GEMINI_EMBEDDING_API_BASE}{GEMINI_EMBEDDING_PATH}"


def _generate_content_response(text_payload: dict, *, prompt_tokens=42, candidates_tokens=7, thoughts_tokens=0):
    return httpx.Response(
        200,
        json={
            "candidates": [
                {
                    "content": {"parts": [{"text": json.dumps(text_payload)}], "role": "model"},
                    "finishReason": "STOP",
                }
            ],
            "usageMetadata": {
                "promptTokenCount": prompt_tokens,
                "candidatesTokenCount": candidates_tokens,
                "thoughtsTokenCount": thoughts_tokens,
                "totalTokenCount": prompt_tokens + candidates_tokens + thoughts_tokens,
            },
        },
    )


# ---------------------------------------------------------------------------
# generate_followup
# ---------------------------------------------------------------------------


def _followup_kwargs(**overrides):
    base = {
        "question": "Tell me about a challenging project.",
        "answer": "I built a recommendation engine using collaborative filtering that improved CTR by 12%.",
        "stage": "technical",
        "interview_type": "technical",
        "target_role": "Software Engineer",
        "company_type": "product",
        "difficulty": "medium",
    }
    base.update(overrides)
    return base


@respx.mock
async def test_generate_followup_returns_question_and_usage() -> None:
    respx.post(_FOLLOWUP_URL).mock(
        return_value=_generate_content_response(
            {"follow_up_question": "What was the dataset size?", "reason": "no concrete numbers given"}
        )
    )

    result = await generate_followup(**_followup_kwargs())

    assert result.follow_up_question == "What was the dataset size?"
    assert result.model_id == GEMINI_CONVERSATION_MODEL_ID
    assert result.input_tokens == 42
    assert result.output_tokens == 7
    assert result.thoughts_tokens == 0


@respx.mock
async def test_generate_followup_returns_none_when_model_declines() -> None:
    respx.post(_FOLLOWUP_URL).mock(
        return_value=_generate_content_response({"follow_up_question": None, "reason": "already specific"})
    )

    result = await generate_followup(**_followup_kwargs())

    assert result.follow_up_question is None


@respx.mock
async def test_generate_followup_sends_auth_header_and_json_mode(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("GEMINI_API_KEY", "test-gemini-key")
    route = respx.post(_FOLLOWUP_URL).mock(
        return_value=_generate_content_response({"follow_up_question": None})
    )

    await generate_followup(**_followup_kwargs())

    sent_request = route.calls.last.request
    assert sent_request.headers["x-goog-api-key"] == "test-gemini-key"
    sent_body = json.loads(sent_request.content)
    assert sent_body["generationConfig"]["responseMimeType"] == "application/json"
    assert "challenging project" in sent_body["contents"][0]["parts"][0]["text"]


@respx.mock
async def test_generate_followup_raises_on_blocked_prompt() -> None:
    respx.post(_FOLLOWUP_URL).mock(
        return_value=httpx.Response(200, json={"promptFeedback": {"blockReason": "SAFETY"}})
    )

    with pytest.raises(GeminiError, match="SAFETY"):
        await generate_followup(**_followup_kwargs())


@respx.mock
async def test_generate_followup_raises_on_rate_limit() -> None:
    respx.post(_FOLLOWUP_URL).mock(
        return_value=httpx.Response(
            429, json={"error": {"code": 429, "message": "rate limited", "status": "RESOURCE_EXHAUSTED"}}
        )
    )

    with pytest.raises(GeminiError) as exc_info:
        await generate_followup(**_followup_kwargs())

    assert exc_info.value.status_code == 429


@respx.mock
async def test_generate_followup_raises_on_network_error() -> None:
    respx.post(_FOLLOWUP_URL).mock(side_effect=httpx.ConnectTimeout("timed out"))

    with pytest.raises(GeminiError):
        await generate_followup(**_followup_kwargs())


# ---------------------------------------------------------------------------
# evaluate_interview
# ---------------------------------------------------------------------------


_VALID_EVALUATION_PAYLOAD = {
    "scores": {
        "communication_clarity": {"score": 80, "evidence": ["I built a recommendation engine"]},
        "answer_structure": {"score": 70, "evidence": ["using collaborative filtering"]},
        "technical_depth": {"score": 75, "evidence": ["improved CTR by 12%"]},
        "relevance": {"score": 85, "evidence": ["I built a recommendation engine"]},
        "confidence_and_delivery": {"score": 65, "evidence": ["improved CTR by 12%"]},
    },
    "overall_score": 75,
    "strengths": ["Gave a specific, measurable outcome"],
    "weak_areas": [
        {"skill": "structured answers", "severity": "medium", "notes": "answer lacked a clear STAR shape"}
    ],
    "practice_actions": ["Practice STAR", "Quantify more answers", "Slow down delivery"],
}


def _evaluation_kwargs(**overrides):
    base = {
        "transcript_turns": [
            {
                "turn_number": 1,
                "stage": "technical",
                "question": "Tell me about a challenging project.",
                "answer": "I built a recommendation engine using collaborative filtering that improved CTR by 12%.",
            }
        ],
        "eye_contact_pct": 72.5,
        "posture_stability_pct": None,
        "interview_type": "technical",
        "target_role": "Software Engineer",
        "company_type": "product",
        "difficulty": "medium",
    }
    base.update(overrides)
    return base


@respx.mock
async def test_evaluate_interview_returns_structured_scores_with_evidence() -> None:
    respx.post(_EVALUATION_URL).mock(
        return_value=_generate_content_response(
            _VALID_EVALUATION_PAYLOAD, prompt_tokens=500, candidates_tokens=120, thoughts_tokens=30
        )
    )

    result = await evaluate_interview(**_evaluation_kwargs())

    assert result.scores["communication_clarity"]["score"] == 80
    assert result.scores["communication_clarity"]["evidence"] == ["I built a recommendation engine"]
    assert result.overall_score == 75.0
    assert result.strengths == ["Gave a specific, measurable outcome"]
    assert result.weak_areas[0]["skill"] == "structured answers"
    assert len(result.practice_actions) == 3
    assert result.model_id == GEMINI_EVALUATION_MODEL_ID
    assert result.input_tokens == 500
    assert result.output_tokens == 120
    assert result.thoughts_tokens == 30


@respx.mock
async def test_evaluate_interview_sends_transcript_and_null_for_missing_metrics() -> None:
    route = respx.post(_EVALUATION_URL).mock(
        return_value=_generate_content_response(_VALID_EVALUATION_PAYLOAD)
    )

    await evaluate_interview(**_evaluation_kwargs(eye_contact_pct=None, posture_stability_pct=None))

    sent_body = json.loads(route.calls.last.request.content)
    prompt_text = sent_body["contents"][0]["parts"][0]["text"]
    assert "recommendation engine" in prompt_text
    assert "eye_contact_pct: null" in prompt_text
    assert "posture_stability_pct: null" in prompt_text


@respx.mock
async def test_evaluate_interview_raises_on_malformed_response() -> None:
    incomplete_payload = {k: v for k, v in _VALID_EVALUATION_PAYLOAD.items() if k != "weak_areas"}
    respx.post(_EVALUATION_URL).mock(return_value=_generate_content_response(incomplete_payload))

    with pytest.raises(GeminiError):
        await evaluate_interview(**_evaluation_kwargs())


# ---------------------------------------------------------------------------
# embed_text
# ---------------------------------------------------------------------------


@respx.mock
async def test_embed_text_returns_vector_matching_configured_dimension() -> None:
    expected = [0.1] * GEMINI_EMBEDDING_OUTPUT_DIMENSIONALITY
    respx.post(_EMBED_URL).mock(
        return_value=httpx.Response(200, json={"embeddings": [{"values": expected}]})
    )

    values = await embed_text("Python, Kubernetes, distributed systems")

    assert values == expected
    assert len(values) == GEMINI_EMBEDDING_OUTPUT_DIMENSIONALITY


@respx.mock
async def test_embed_text_accepts_singular_embedding_shape() -> None:
    expected = [0.2] * GEMINI_EMBEDDING_OUTPUT_DIMENSIONALITY
    respx.post(_EMBED_URL).mock(
        return_value=httpx.Response(200, json={"embedding": {"values": expected}})
    )

    values = await embed_text("some text")

    assert values == expected


@respx.mock
async def test_embed_text_sends_output_dimensionality_and_model(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("GEMINI_API_KEY", "test-gemini-key")
    route = respx.post(_EMBED_URL).mock(
        return_value=httpx.Response(
            200, json={"embeddings": [{"values": [0.0] * GEMINI_EMBEDDING_OUTPUT_DIMENSIONALITY}]}
        )
    )

    await embed_text("hello world")

    sent_request = route.calls.last.request
    assert sent_request.headers["x-goog-api-key"] == "test-gemini-key"
    sent_body = json.loads(sent_request.content)
    assert sent_body["outputDimensionality"] == GEMINI_EMBEDDING_OUTPUT_DIMENSIONALITY
    assert sent_body["content"]["parts"][0]["text"] == "hello world"
    assert route.calls.last.request.url == _EMBED_URL
    assert GEMINI_EMBEDDING_MODEL_ID in GEMINI_EMBEDDING_PATH


@respx.mock
async def test_embed_text_raises_loudly_on_dimension_mismatch() -> None:
    wrong_length = [0.3] * (GEMINI_EMBEDDING_OUTPUT_DIMENSIONALITY * 4)  # e.g. Gemini's default 3072
    respx.post(_EMBED_URL).mock(
        return_value=httpx.Response(200, json={"embeddings": [{"values": wrong_length}]})
    )

    with pytest.raises(EmbeddingDimensionMismatchError):
        await embed_text("some text")


@respx.mock
async def test_embed_text_raises_on_http_error() -> None:
    respx.post(_EMBED_URL).mock(return_value=httpx.Response(403, json={"error": {"message": "invalid key"}}))

    with pytest.raises(GeminiError) as exc_info:
        await embed_text("some text")

    assert exc_info.value.status_code == 403


# ---------------------------------------------------------------------------
# rewrite_resume_bullet (BUILD_SPEC Part 4.3) -- uses the conversation
# model/endpoint, same as generate_followup, hence reusing _FOLLOWUP_URL.
# ---------------------------------------------------------------------------


@respx.mock
async def test_rewrite_resume_bullet_keeps_the_existing_number() -> None:
    respx.post(_FOLLOWUP_URL).mock(
        return_value=_generate_content_response(
            {"kind": "rewritten", "text": "Reduced page load time by 40% through lazy-loading images."}
        )
    )

    result = await rewrite_resume_bullet("made the site load 40% faster by lazy loading images")

    assert result.kind == "rewritten"
    assert result.question is None
    assert "40%" in result.text
    assert result.model_id == GEMINI_CONVERSATION_MODEL_ID


@respx.mock
async def test_rewrite_resume_bullet_asks_for_a_metric_when_none_given() -> None:
    respx.post(_FOLLOWUP_URL).mock(
        return_value=_generate_content_response(
            {"kind": "needs_metric", "question": "How many users did this feature reach?"}
        )
    )

    result = await rewrite_resume_bullet("built a new onboarding flow")

    assert result.kind == "needs_metric"
    assert result.text is None
    assert "users" in result.question


@respx.mock
async def test_rewrite_resume_bullet_raises_rather_than_passing_along_an_invented_number() -> None:
    """The one rule BUILD_SPEC Part 4.3 insists on most: "It must never
    invent numbers." Simulates Gemini itself breaking that rule (a real,
    if hopefully rare, LLM failure mode -- prompt-following is never a
    hard guarantee) and proves the code-level digit-containment check
    catches it rather than silently handing a fabricated metric back to
    a student's real resume."""
    respx.post(_FOLLOWUP_URL).mock(
        return_value=_generate_content_response(
            {"kind": "rewritten", "text": "Increased user engagement by 25% through redesigned onboarding."}
        )
    )

    with pytest.raises(GeminiError, match="introduced digits not present"):
        await rewrite_resume_bullet("built a new onboarding flow that users liked")


@respx.mock
async def test_rewrite_resume_bullet_raises_on_unknown_kind() -> None:
    respx.post(_FOLLOWUP_URL).mock(
        return_value=_generate_content_response({"kind": "something_else", "text": "x"})
    )

    with pytest.raises(GeminiError, match="unknown 'kind'"):
        await rewrite_resume_bullet("built a thing")


def _scan_response_payload(
    *,
    bullets: list[dict] | None = None,
    jd_match: dict | None = None,
) -> dict:
    return {
        "parsed_resume": {"basics": {"name": "Jordan Lee"}, "education": [], "work": [], "projects": []},
        "parse_health": {"status": "clean", "sections_detected": ["Contact info"], "sections_missing": [], "notes": []},
        "jd_match": jd_match,
        "bullet_quality": {
            "bullets": bullets if bullets is not None else [],
            "overall_notes": ["Looks solid overall."],
        },
        "formatting_risks": {"risks": []},
    }


@respx.mock
async def test_scan_resume_requires_exactly_one_of_resume_data_or_pdf_base64() -> None:
    with pytest.raises(ValueError, match="exactly one"):
        await scan_resume(resume_data=None, pdf_base64=None)

    with pytest.raises(ValueError, match="exactly one"):
        await scan_resume(resume_data={"basics": {}}, pdf_base64="ZmFrZQ==")


@respx.mock
async def test_scan_resume_sends_pdf_as_inline_data_part_ahead_of_the_prompt() -> None:
    route = respx.post(_FOLLOWUP_URL).mock(return_value=_generate_content_response(_scan_response_payload()))

    result = await scan_resume(resume_data=None, pdf_base64="ZmFrZSBwZGYgYnl0ZXM=", job_description_text=None)

    sent_body = json.loads(route.calls.last.request.content)
    parts = sent_body["contents"][0]["parts"]
    assert parts[0]["inlineData"] == {"mimeType": "application/pdf", "data": "ZmFrZSBwZGYgYnl0ZXM="}
    assert "text" in parts[1]
    assert "No job description was given" in parts[1]["text"]
    assert result.parsed_resume["basics"]["name"] == "Jordan Lee"
    assert result.jd_match is None
    assert result.model_id == GEMINI_CONVERSATION_MODEL_ID


@respx.mock
async def test_scan_resume_sends_structured_resume_data_and_job_description_as_text() -> None:
    route = respx.post(_FOLLOWUP_URL).mock(
        return_value=_generate_content_response(
            _scan_response_payload(jd_match={"skills_present": ["python"], "skills_missing": [], "notes": []})
        )
    )

    resume_data = {"basics": {"name": "Asha Rao"}, "work": [{"highlights": ["Led a team of 3 engineers"]}]}
    result = await scan_resume(resume_data=resume_data, pdf_base64=None, job_description_text="Looking for a Python backend engineer.")

    sent_body = json.loads(route.calls.last.request.content)
    parts = sent_body["contents"][0]["parts"]
    assert len(parts) == 1  # no inlineData part when resume_data is given, not pdf_base64
    assert "Asha Rao" in parts[0]["text"]
    assert "Python backend engineer" in parts[0]["text"]
    assert result.jd_match == {"skills_present": ["python"], "skills_missing": [], "notes": []}


@respx.mock
async def test_scan_resume_raises_rather_than_passing_along_an_invented_number_in_a_bullet_suggestion() -> None:
    """Same principle as the bullet-rewrite digit check, applied per
    bullet here: a scan's rewrite `suggestion` must never introduce a
    digit that bullet's own `text` doesn't already have."""
    route = respx.post(_FOLLOWUP_URL).mock(
        return_value=_generate_content_response(
            _scan_response_payload(
                bullets=[
                    {
                        "section": "Projects",
                        "text": "Built a recommendation engine for an e-commerce site",
                        "issues": ["No measurable result"],
                        "suggestion": "Built a recommendation engine that increased sales by 30%",
                    }
                ]
            )
        )
    )

    with pytest.raises(GeminiError, match="introduced digits not present"):
        await scan_resume(resume_data={"basics": {}}, pdf_base64=None, job_description_text=None)

    assert route.called


@respx.mock
async def test_scan_resume_allows_a_suggestion_that_reuses_the_bullets_own_digits() -> None:
    respx.post(_FOLLOWUP_URL).mock(
        return_value=_generate_content_response(
            _scan_response_payload(
                bullets=[
                    {
                        "section": "Projects",
                        "text": "Built a tool used by 30 students",
                        "issues": [],
                        "suggestion": "Consider specifying what the 30 students used it for.",
                    }
                ]
            )
        )
    )

    result = await scan_resume(resume_data={"basics": {}}, pdf_base64=None, job_description_text=None)

    assert result.bullet_quality["bullets"][0]["suggestion"].startswith("Consider")


@respx.mock
async def test_scan_resume_raises_on_response_missing_a_required_field() -> None:
    payload = _scan_response_payload()
    del payload["formatting_risks"]
    respx.post(_FOLLOWUP_URL).mock(return_value=_generate_content_response(payload))

    with pytest.raises(GeminiError, match="missing 'formatting_risks'"):
        await scan_resume(resume_data={"basics": {}}, pdf_base64=None, job_description_text=None)


@respx.mock
async def test_generate_chat_reply_returns_grounded_content_and_citations() -> None:
    respx.post(_FOLLOWUP_URL).mock(
        return_value=_generate_content_response(
            {
                "content": "Amazon evaluates Leadership Principles in every round.",
                "citations": [
                    {"document_id": "doc-123", "title": "Amazon SDE Hiring", "source_url": "https://example.com"}
                ],
            },
            prompt_tokens=150,
            candidates_tokens=35,
        )
    )

    result = await generate_chat_reply(
        question="How does Amazon evaluate candidates?",
        context_chunks=[
            {
                "document_id": "doc-123",
                "document_title": "Amazon SDE Hiring",
                "document_category": "company_pattern",
                "source_url": "https://example.com",
                "content": "Amazon evaluates Leadership Principles in every round.",
            }
        ],
        weak_areas=[{"skill": "Behavioral", "severity": "moderate", "notes": "Work on STAR method"}],
    )

    assert result.content == "Amazon evaluates Leadership Principles in every round."
    assert len(result.citations) == 1
    assert result.citations[0]["document_id"] == "doc-123"
    assert result.input_tokens == 150
    assert result.output_tokens == 35


@respx.mock
async def test_generate_chat_reply_raises_on_missing_content() -> None:
    respx.post(_FOLLOWUP_URL).mock(
        return_value=_generate_content_response({"invalid_key": "data"})
    )

    with pytest.raises(GeminiError, match="missing a valid 'content' string"):
        await generate_chat_reply(
            question="Tell me about Google",
            context_chunks=[],
        )
