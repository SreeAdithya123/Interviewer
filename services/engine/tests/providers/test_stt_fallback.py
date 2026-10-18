"""Tests for app/providers/stt.py's transcribe_with_fallback.

Per BUILD_SPEC Part 6, every HTTP call is intercepted by respx — none of
these tests ever reach the real network.
"""

from __future__ import annotations

import httpx
import pytest
import respx

from app.providers.groq_stt import GROQ_API_BASE
from app.providers.sarvam import SARVAM_STT_API_BASE, SARVAM_STT_PATH, SarvamSTTError
from app.providers.stt import transcribe_with_fallback

_GROQ_URL = f"{GROQ_API_BASE}/audio/transcriptions"
_SARVAM_STT_URL = f"{SARVAM_STT_API_BASE}{SARVAM_STT_PATH}"


@respx.mock
async def test_groq_success_does_not_fall_back() -> None:
    groq_route = respx.post(_GROQ_URL).mock(
        return_value=httpx.Response(200, json={"text": "Groq transcribed this fine."})
    )
    sarvam_route = respx.post(_SARVAM_STT_URL).mock(
        return_value=httpx.Response(200, json={"transcript": "should not be called"})
    )

    outcome = await transcribe_with_fallback(b"fake-audio-bytes", vocabulary_hint=["Redis"])

    assert outcome.result.text == "Groq transcribed this fine."
    assert outcome.stt_provider == "groq"
    assert outcome.fallback_used is False
    assert groq_route.called
    assert not sarvam_route.called


@respx.mock
async def test_groq_rate_limit_falls_back_to_sarvam() -> None:
    respx.post(_GROQ_URL).mock(
        return_value=httpx.Response(429, json={"error": {"message": "rate limit exceeded"}})
    )
    sarvam_route = respx.post(_SARVAM_STT_URL).mock(
        return_value=httpx.Response(200, json={"transcript": "Sarvam saved the day."})
    )

    outcome = await transcribe_with_fallback(b"fake-audio-bytes", vocabulary_hint=["Redis"])

    assert outcome.result.text == "Sarvam saved the day."
    assert outcome.stt_provider == "sarvam"
    assert outcome.fallback_used is True
    assert sarvam_route.called


@respx.mock
async def test_groq_rate_limit_passes_vocabulary_hint_to_sarvam_keyterms() -> None:
    respx.post(_GROQ_URL).mock(return_value=httpx.Response(429, json={}))
    sarvam_route = respx.post(_SARVAM_STT_URL).mock(
        return_value=httpx.Response(200, json={"transcript": "ok"})
    )

    await transcribe_with_fallback(b"fake-audio-bytes", vocabulary_hint=["Kubernetes", "gRPC"])

    body_text = sarvam_route.calls.last.request.content.decode("utf-8", errors="ignore")
    assert "Kubernetes" in body_text
    assert "gRPC" in body_text


@respx.mock
async def test_groq_auth_failure_falls_back_to_sarvam() -> None:
    respx.post(_GROQ_URL).mock(return_value=httpx.Response(401, json={"error": "invalid key"}))
    respx.post(_SARVAM_STT_URL).mock(
        return_value=httpx.Response(200, json={"transcript": "Fallback handled the auth failure."})
    )

    outcome = await transcribe_with_fallback(b"fake-audio-bytes")

    assert outcome.fallback_used is True
    assert outcome.result.text == "Fallback handled the auth failure."


@respx.mock
async def test_sarvam_failure_after_groq_failure_propagates() -> None:
    respx.post(_GROQ_URL).mock(return_value=httpx.Response(500, json={"error": "server error"}))
    respx.post(_SARVAM_STT_URL).mock(
        return_value=httpx.Response(500, json={"message": "internal error", "code": "server_error"})
    )

    with pytest.raises(SarvamSTTError):
        await transcribe_with_fallback(b"fake-audio-bytes")
