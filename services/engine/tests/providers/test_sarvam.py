"""Tests for app/providers/sarvam.py.

Per BUILD_SPEC Part 6, every HTTP call to api.sarvam.ai is intercepted by
respx — none of these tests ever reach the real network.
"""

from __future__ import annotations

import base64
import json
from typing import Any

import httpx
import pytest
import respx

import app.providers.sarvam as sarvam_module
from app.providers.sarvam import (
    SARVAM_STT_API_BASE,
    SARVAM_STT_PATH,
    SARVAM_TTS_API_BASE,
    SARVAM_TTS_MAX_CHARACTERS,
    SARVAM_TTS_PATH,
    SarvamSTTError,
    SarvamTTSError,
    synthesize_speech,
    synthesize_speech_streaming,
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


# ---------------------------------------------------------------------------
# synthesize_speech_streaming — the real `sarvamai` SDK's websocket client
# is a compiled/network object, not something respx can intercept (respx
# only patches httpx). Faked here at the same seam the function itself
# imports (`app.providers.sarvam.AsyncSarvamAI`), matching the real SDK's
# shape confirmed by reading its source directly (see the function's own
# docstring) and by one live smoke-test call — never a guess.
# ---------------------------------------------------------------------------


class _FakeStreamData:
    def __init__(self, **fields: Any) -> None:
        self.__dict__.update(fields)


class _FakeStreamMessage:
    def __init__(self, type: str, **data_fields: Any) -> None:
        self.type = type
        self.data = _FakeStreamData(**data_fields)


class _FakeStreamingSocket:
    def __init__(self, messages: list[_FakeStreamMessage], calls: list[tuple[str, Any]]) -> None:
        self._messages = list(messages)
        self._calls = calls

    async def configure(self, **kwargs: Any) -> None:
        self._calls.append(("configure", kwargs))

    async def convert(self, text: str) -> None:
        self._calls.append(("convert", text))

    async def flush(self) -> None:
        self._calls.append(("flush", None))

    async def recv(self) -> _FakeStreamMessage:
        return self._messages.pop(0)


class _FakeConnectContext:
    def __init__(self, socket: _FakeStreamingSocket) -> None:
        self._socket = socket

    async def __aenter__(self) -> _FakeStreamingSocket:
        return self._socket

    async def __aexit__(self, *exc_info: object) -> bool:
        return False


def _install_fake_sarvam_client(
    monkeypatch: pytest.MonkeyPatch, messages: list[_FakeStreamMessage]
) -> list[tuple[str, Any]]:
    """Patches `AsyncSarvamAI` where `app/providers/sarvam.py` imported it,
    and returns the list every `connect`/`configure`/`convert`/`flush` call
    records itself into, in call order, so a test can assert on what was
    actually sent."""
    calls: list[tuple[str, Any]] = []
    socket = _FakeStreamingSocket(messages, calls)

    class _FakeStreamingClient:
        def connect(self, **kwargs: Any) -> _FakeConnectContext:
            calls.append(("connect", kwargs))
            return _FakeConnectContext(socket)

    class _FakeAsyncSarvamAI:
        def __init__(self, *args: Any, **kwargs: Any) -> None:
            self.text_to_speech_streaming = _FakeStreamingClient()

    monkeypatch.setattr(sarvam_module, "AsyncSarvamAI", _FakeAsyncSarvamAI)
    return calls


async def test_synthesize_speech_streaming_yields_decoded_audio_chunks(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    raw_chunks = [b"mp3-chunk-one", b"mp3-chunk-two"]
    messages = [
        _FakeStreamMessage("audio", audio=base64.b64encode(raw_chunks[0]).decode("ascii"), content_type="audio/mpeg"),
        _FakeStreamMessage("audio", audio=base64.b64encode(raw_chunks[1]).decode("ascii"), content_type="audio/mpeg"),
        _FakeStreamMessage("event", event_type="final"),
    ]
    _install_fake_sarvam_client(monkeypatch, messages)

    received = [chunk async for chunk in synthesize_speech_streaming("Hello there", "shubh")]

    assert received == raw_chunks


async def test_synthesize_speech_streaming_sends_config_and_text_before_audio(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    messages = [_FakeStreamMessage("event", event_type="final")]
    calls = _install_fake_sarvam_client(monkeypatch, messages)

    _ = [chunk async for chunk in synthesize_speech_streaming("Hello there", "shubh", language_code="hi-IN")]

    assert calls[0][0] == "connect"
    assert calls[0][1]["model"] == "bulbul:v3"
    assert calls[0][1]["send_completion_event"] is True

    assert calls[1][0] == "configure"
    assert calls[1][1]["target_language_code"] == "hi-IN"
    assert calls[1][1]["speaker"] == "shubh"
    assert calls[1][1]["output_audio_codec"] == "mp3"
    assert calls[2] == ("convert", "Hello there")
    assert calls[3] == ("flush", None)


async def test_synthesize_speech_streaming_raises_on_server_error_message(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    messages = [_FakeStreamMessage("error", message="invalid api key", code="auth_error")]
    _install_fake_sarvam_client(monkeypatch, messages)

    with pytest.raises(SarvamTTSError):
        _ = [chunk async for chunk in synthesize_speech_streaming("Hello", "shubh")]


async def test_synthesize_speech_streaming_rejects_text_over_character_limit() -> None:
    too_long = "a" * (SARVAM_TTS_MAX_CHARACTERS + 1)

    with pytest.raises(SarvamTTSError):
        _ = [chunk async for chunk in synthesize_speech_streaming(too_long, "shubh")]
