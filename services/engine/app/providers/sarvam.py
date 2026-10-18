"""Sarvam speech-to-text (fallback) and text-to-speech clients.

BUILD_SPEC.md Part 2: "Sarvam STT (fallback for accent or Telugu-English
mixing, and on Groq failure or rate limit)"; Part 4.5 step 5 and step 3
("question audio plays ... from TTS cache when available"). Sarvam serves
both roles here: ``transcribe_fallback`` (STT, used only when Groq fails)
and ``synthesize_speech`` (TTS, used for every question/follow-up).

Auth header format (confirmed against Sarvam's own API reference, see
``app/config/models.yaml``) — a **custom** header, not a bearer token:
``api-subscription-key: $SARVAM_API_KEY``. Easy to get wrong if copying the
Groq client's auth pattern, so it is called out explicitly here too.

``SARVAM_API_KEY`` is read from the environment and may be empty right now;
a call then fails cleanly with ``SarvamSTTError``/``SarvamTTSError``
wrapping Sarvam's 401/403, not a crash.
"""

from __future__ import annotations

import base64
import json
import os
import time
from typing import Any

import httpx

from app.config.loader import load_models, load_pricing
from app.providers.errors import ProviderError
from app.providers.types import SpeechResult, TranscriptionResult

_STT_FALLBACK = load_models()["stt_fallback"]
_TTS = load_models()["tts"]

SARVAM_STT_MODEL_ID: str = _STT_FALLBACK["model_id"]
SARVAM_STT_API_BASE: str = _STT_FALLBACK["api_base"]
SARVAM_STT_PATH: str = _STT_FALLBACK["endpoint"]

SARVAM_TTS_MODEL_ID: str = _TTS["model_id"]
SARVAM_TTS_API_BASE: str = _TTS["api_base"]
SARVAM_TTS_PATH: str = _TTS["endpoint"]

# Sarvam saaras:v4's vocabulary-hint mechanism: up to 50 terms, each <=64
# chars (unlike Groq's free-text `prompt`). Enforced defensively here since
# this is a real API boundary — a hint list a caller built from a resume's
# skills/tech terms could exceed either limit.
_SARVAM_MAX_KEYTERMS = 50
_SARVAM_MAX_KEYTERM_LENGTH = 64

# Sarvam TTS's own per-request text cap (app/config/models.yaml: tts.notes).
SARVAM_TTS_MAX_CHARACTERS = 2500

_DEFAULT_TIMEOUT_SECONDS = 30.0


class SarvamSTTError(ProviderError):
    """Sarvam's ``/speech-to-text`` endpoint failed, or returned a response
    that doesn't match the documented shape."""


class SarvamTTSError(ProviderError):
    """Sarvam's ``/text-to-speech`` endpoint failed, or returned a response
    that doesn't match the documented shape."""


def _auth_headers() -> dict[str, str]:
    return {"api-subscription-key": os.environ.get("SARVAM_API_KEY", "")}


def _error_message(response: httpx.Response) -> str:
    """Sarvam's documented error shape is {"request_id","message","code"}
    for every 4xx/5xx; fall back to the raw body if it isn't that shape."""
    try:
        payload = response.json()
    except ValueError:
        return response.text
    if isinstance(payload, dict) and "message" in payload:
        return str(payload["message"])
    return response.text


async def transcribe_fallback(
    audio_bytes: bytes,
    vocabulary_hint: list[str] | None = None,
) -> TranscriptionResult:
    """Transcribe one answer clip with Sarvam (``saaras:v4``) — the fallback
    path, called only when Groq fails or rate-limits.

    ``vocabulary_hint`` is optional and not part of BUILD_SPEC's literal
    description of this function, but Sarvam's own ``keyterms`` field is
    exactly the mechanism the provider research calls for on this fallback
    path ("use this instead of Groq's free-text prompt for the Sarvam
    fallback path") — so ``app/providers/stt.py`` passes the same hint
    Groq would have received, through here, when one is available. A
    plain ``transcribe_fallback(audio_bytes)`` call (no hint) still works,
    since the parameter defaults to ``None``.

    ``language_code`` is sent as ``"unknown"`` to auto-detect — Sarvam STT
    (unlike Sarvam TTS) supports this.
    """
    form_data: dict[str, str] = {
        "model": SARVAM_STT_MODEL_ID,
        "language_code": "unknown",
    }
    if vocabulary_hint:
        capped_terms = [term[:_SARVAM_MAX_KEYTERM_LENGTH] for term in vocabulary_hint]
        capped_terms = capped_terms[:_SARVAM_MAX_KEYTERMS]
        form_data["keyterms"] = json.dumps(capped_terms)

    files = {"file": ("answer.webm", audio_bytes, "application/octet-stream")}

    started = time.monotonic()
    try:
        async with httpx.AsyncClient(timeout=_DEFAULT_TIMEOUT_SECONDS) as client:
            response = await client.post(
                f"{SARVAM_STT_API_BASE}{SARVAM_STT_PATH}",
                headers=_auth_headers(),
                data=form_data,
                files=files,
            )
    except httpx.HTTPError as exc:
        raise SarvamSTTError(f"Sarvam STT request failed: {exc}") from exc
    latency_ms = int((time.monotonic() - started) * 1000)

    if response.status_code != 200:
        raise SarvamSTTError(
            f"Sarvam STT returned HTTP {response.status_code}: {_error_message(response)}",
            status_code=response.status_code,
        )

    payload: Any = response.json()
    transcript = payload.get("transcript") if isinstance(payload, dict) else None
    if transcript is None:
        raise SarvamSTTError(f"Sarvam STT response missing 'transcript' field: {payload!r}")

    return TranscriptionResult(
        text=transcript,
        provider="sarvam",
        model_id=SARVAM_STT_MODEL_ID,
        latency_ms=latency_ms,
        raw_response=payload,
    )


async def synthesize_speech(
    text: str,
    voice: str,
    *,
    language_code: str = "en-IN",
    pace: float = 1.0,
) -> SpeechResult:
    """Synthesize one clip of speech with Sarvam Bulbul (``bulbul:v3``).

    ``voice`` is Sarvam's ``speaker`` field (e.g. ``"shubh"`` — lowercase
    and case-sensitive; passed through exactly as given, not normalized).

    ``language_code`` is **required** by Sarvam TTS (unlike Sarvam STT,
    there is no ``"unknown"``/auto-detect option here) — defaults to
    ``"en-IN"`` since this engine's question/follow-up text is currently
    always English; pass one of Sarvam's other 10 supported Indic codes for
    a localized voice.

    Raises ``SarvamTTSError`` up front if ``text`` exceeds Sarvam's 2,500
    character cap — chunking a longer answer/follow-up into multiple calls
    is the caller's responsibility (BUILD_SPEC Part 2), not this client's.
    """
    if len(text) > SARVAM_TTS_MAX_CHARACTERS:
        raise SarvamTTSError(
            f"text is {len(text)} characters, over Sarvam TTS's "
            f"{SARVAM_TTS_MAX_CHARACTERS}-character limit; chunk it before calling."
        )

    body = {
        "text": text,
        "language_code": language_code,
        "model": SARVAM_TTS_MODEL_ID,
        "speaker": voice,
        "pace": pace,
        "speech_sample_rate": 22050,
        "output_audio_codec": "wav",
    }

    started = time.monotonic()
    try:
        async with httpx.AsyncClient(timeout=_DEFAULT_TIMEOUT_SECONDS) as client:
            response = await client.post(
                f"{SARVAM_TTS_API_BASE}{SARVAM_TTS_PATH}",
                headers={**_auth_headers(), "Content-Type": "application/json"},
                json=body,
            )
    except httpx.HTTPError as exc:
        raise SarvamTTSError(f"Sarvam TTS request failed: {exc}") from exc
    latency_ms = int((time.monotonic() - started) * 1000)

    if response.status_code != 200:
        raise SarvamTTSError(
            f"Sarvam TTS returned HTTP {response.status_code}: {_error_message(response)}",
            status_code=response.status_code,
        )

    payload: Any = response.json()
    audios = payload.get("audios") if isinstance(payload, dict) else None
    if not audios:
        raise SarvamTTSError(f"Sarvam TTS response missing 'audios' field: {payload!r}")

    # The API returns base64-encoded audio, never raw binary — must decode
    # before this is playable or cacheable in R2 (app/config/models.yaml's
    # research note flags exactly this as an easy mistake).
    audio_bytes = b"".join(base64.b64decode(clip) for clip in audios)

    characters = len(text)
    cost_paise = round(characters * load_pricing()["sarvam_tts_per_character"])

    return SpeechResult(
        audio_bytes=audio_bytes,
        provider="sarvam",
        model_id=SARVAM_TTS_MODEL_ID,
        characters=characters,
        cost_paise=cost_paise,
        latency_ms=latency_ms,
        raw_response=payload,
    )
