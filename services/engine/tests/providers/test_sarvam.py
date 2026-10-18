"""Tests for app/providers/sarvam.py.

Per BUILD_SPEC Part 6, every HTTP call to api.sarvam.ai is intercepted by
respx — none of these tests ever reach the real network.
"""

from __future__ import annotations

import base64
import json

import httpx
import pytest
import respx

from app.providers.sarvam import (
    SARVAM_STT_API_BASE,
    SARVAM_STT_PATH,
    SARVAM_TTS_API_BASE,
    SARVAM_TTS_MAX_CHARACTERS,
    SARVAM_TTS_PATH,
    SarvamSTTError,
    SarvamTTSError,
    synthesize_speech,
    transcribe_fallback,
)

_STT_URL = f"{SARVAM_STT_API_BASE}{SARVAM_STT_PATH}"
_TTS_URL = f"{SARVAM_TTS_API_BASE}{SARVAM_TTS_PATH}"


@respx.mock
async def test_transcribe_fallback_success_returns_transcript() -> None:
    respx.post(_STT_URL).mock(
        return_value=httpx.Response(
            200,
            json={
                "request_id": "req_abc",
                "transcript": "Nenu oka recommendation system build chesanu.",
                "language_code": "te-IN",
                "timestamps": {},
                "language_probability": 0.97,
            },
        )
    )

    result = await transcribe_fallback(b"fake-audio-bytes")

    assert result.text == "Nenu oka recommendation system build chesanu."
    assert result.provider == "sarvam"
    assert result.model_id == "saaras:v4"
    assert result.latency_ms >= 0


@respx.mock
async def test_transcribe_fallback_uses_custom_auth_header(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("SARVAM_API_KEY", "test-sarvam-key")
    route = respx.post(_STT_URL).mock(
        return_value=httpx.Response(200, json={"transcript": "ok"})
    )

    await transcribe_fallback(b"fake-audio-bytes")

    sent_headers = route.calls.last.request.headers
    assert sent_headers["api-subscription-key"] == "test-sarvam-key"
    assert "Authorization" not in sent_headers


@respx.mock
async def test_transcribe_fallback_sends_keyterms_for_vocabulary_hint() -> None:
    route = respx.post(_STT_URL).mock(
        return_value=httpx.Response(200, json={"transcript": "ok"})
    )

    await transcribe_fallback(b"fake-audio-bytes", vocabulary_hint=["Kubernetes", "PyTorch"])

    body_text = route.calls.last.request.content.decode("utf-8", errors="ignore")
    assert json.dumps(["Kubernetes", "PyTorch"]) in body_text


@respx.mock
async def test_transcribe_fallback_raises_on_error_response() -> None:
    respx.post(_STT_URL).mock(
        return_value=httpx.Response(
            422, json={"request_id": "req_x", "message": "unsupported audio format", "code": "invalid_request"}
        )
    )

    with pytest.raises(SarvamSTTError) as exc_info:
        await transcribe_fallback(b"fake-audio-bytes")

    assert exc_info.value.status_code == 422
    assert "unsupported audio format" in str(exc_info.value)


@respx.mock
async def test_synthesize_speech_returns_decoded_audio_bytes() -> None:
    raw_audio = b"RIFF....WAVEfmt fake pcm data"
    encoded_audio = base64.b64encode(raw_audio).decode("ascii")
    respx.post(_TTS_URL).mock(
        return_value=httpx.Response(200, json={"request_id": "req_tts", "audios": [encoded_audio]})
    )

    result = await synthesize_speech("Tell me about a time you resolved a conflict.", "shubh")

    assert result.audio_bytes == raw_audio
    assert result.provider == "sarvam"
    assert result.model_id == "bulbul:v3"
    assert result.characters == len("Tell me about a time you resolved a conflict.")
    assert result.cost_paise >= 0


@respx.mock
async def test_synthesize_speech_sends_json_body_with_required_fields() -> None:
    raw_audio = b"fake-wav-bytes"
    encoded_audio = base64.b64encode(raw_audio).decode("ascii")
    route = respx.post(_TTS_URL).mock(
        return_value=httpx.Response(200, json={"audios": [encoded_audio]})
    )

    await synthesize_speech("Hello there", "shubh", language_code="hi-IN")

    sent_body = json.loads(route.calls.last.request.content)
    assert sent_body["text"] == "Hello there"
    assert sent_body["speaker"] == "shubh"
    assert sent_body["language_code"] == "hi-IN"
    assert sent_body["model"] == "bulbul:v3"


async def test_synthesize_speech_rejects_text_over_character_limit() -> None:
    too_long = "a" * (SARVAM_TTS_MAX_CHARACTERS + 1)

    with pytest.raises(SarvamTTSError):
        await synthesize_speech(too_long, "shubh")


@respx.mock
async def test_synthesize_speech_raises_on_error_response() -> None:
    respx.post(_TTS_URL).mock(
        return_value=httpx.Response(
            403, json={"request_id": "req_y", "message": "invalid api key", "code": "auth_error"}
        )
    )

    with pytest.raises(SarvamTTSError) as exc_info:
        await synthesize_speech("Hello", "shubh")

    assert exc_info.value.status_code == 403
