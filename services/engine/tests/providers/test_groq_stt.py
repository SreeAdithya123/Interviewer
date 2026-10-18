"""Tests for app/providers/groq_stt.py.

Per BUILD_SPEC Part 6 ("Never call paid provider APIs in automated tests.
Use recorded fixtures and mocks"), every HTTP call to api.groq.com is
intercepted by respx — none of these tests ever reach the real network.
"""

from __future__ import annotations

import httpx
import pytest
import respx

from app.providers.groq_stt import GROQ_API_BASE, GROQ_MODEL_ID, GroqSTTError, transcribe

_TRANSCRIBE_URL = f"{GROQ_API_BASE}/audio/transcriptions"


@respx.mock
async def test_transcribe_success_returns_text_and_metadata() -> None:
    respx.post(_TRANSCRIBE_URL).mock(
        return_value=httpx.Response(
            200,
            json={"text": "I built a recommendation engine using collaborative filtering.", "x_groq": {"id": "req_123"}},
        )
    )

    result = await transcribe(b"fake-audio-bytes", vocabulary_hint=["Kubernetes", "PyTorch"])

    assert result.text == "I built a recommendation engine using collaborative filtering."
    assert result.provider == "groq"
    assert result.model_id == GROQ_MODEL_ID
    assert result.latency_ms >= 0
    assert result.raw_response["x_groq"]["id"] == "req_123"


@respx.mock
async def test_transcribe_sends_vocabulary_hint_as_joined_prompt() -> None:
    route = respx.post(_TRANSCRIBE_URL).mock(
        return_value=httpx.Response(200, json={"text": "ok"})
    )

    await transcribe(b"fake-audio-bytes", vocabulary_hint=["Kubernetes", "PyTorch", "gRPC"])

    # Multipart bodies aren't easily parsed back into fields, so just
    # confirm the raw request body actually carries the joined hint string
    # Groq expects in its 'prompt' field.
    body_text = route.calls.last.request.content.decode("utf-8", errors="ignore")
    assert "Kubernetes, PyTorch, gRPC" in body_text


@respx.mock
async def test_transcribe_sends_bearer_auth_header(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("GROQ_API_KEY", "test-groq-key")
    route = respx.post(_TRANSCRIBE_URL).mock(
        return_value=httpx.Response(200, json={"text": "ok"})
    )

    await transcribe(b"fake-audio-bytes")

    sent_request = route.calls.last.request
    assert sent_request.headers["Authorization"] == "Bearer test-groq-key"


@respx.mock
async def test_transcribe_raises_on_rate_limit() -> None:
    respx.post(_TRANSCRIBE_URL).mock(
        return_value=httpx.Response(429, json={"error": {"message": "rate limit exceeded"}})
    )

    with pytest.raises(GroqSTTError) as exc_info:
        await transcribe(b"fake-audio-bytes")

    assert exc_info.value.status_code == 429


@respx.mock
async def test_transcribe_raises_on_auth_failure() -> None:
    respx.post(_TRANSCRIBE_URL).mock(
        return_value=httpx.Response(401, json={"error": {"message": "invalid api key"}})
    )

    with pytest.raises(GroqSTTError) as exc_info:
        await transcribe(b"fake-audio-bytes")

    assert exc_info.value.status_code == 401


@respx.mock
async def test_transcribe_raises_on_network_error() -> None:
    respx.post(_TRANSCRIBE_URL).mock(side_effect=httpx.ConnectTimeout("timed out"))

    with pytest.raises(GroqSTTError):
        await transcribe(b"fake-audio-bytes")
