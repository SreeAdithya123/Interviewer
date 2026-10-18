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
from collections.abc import AsyncIterator
from typing import Any

import httpx
from sarvamai import AsyncSarvamAI

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


async def synthesize_speech_streaming(
    text: str,
    voice: str,
    *,
    language_code: str = "en-IN",
    pace: float = 1.0,
) -> AsyncIterator[bytes]:
    """Synthesize speech over Sarvam's WebSocket streaming endpoint,
    yielding audio chunks as they arrive instead of waiting for the whole
    clip like ``synthesize_speech`` does — lets a caller start playback (or
    forwarding) on the first chunk rather than after full synthesis.

    NOT YET CALLED from anywhere in the engine (same status as `r2.py` /
    `redis_client.py`: built and verified here, wiring into the turn loop
    is separate, later work) — the question/follow-up TTS path in
    BUILD_SPEC Part 4.5 steps 3/5 still goes through the batch
    `synthesize_speech` above, which is also what every existing caller in
    this codebase (none yet — see docs/PROGRESS.md) would need to switch to.

    Everything below was confirmed two ways, not just read off a docs page:
    (1) reading the installed `sarvamai` SDK's own source
    (`text_to_speech_streaming/client.py` and `socket_client.py`,
    `sarvamai==0.1.37`), because docs.sarvam.ai's streaming guide (as of
    2026-10-18) shows only SDK call shapes, never the raw wire protocol;
    (2) one real smoke-test call against the live API with this exact
    shape, which returned 7 real MP3 chunks + a final event. Specifically:

    - The raw endpoint is ``wss://api.sarvam.ai/text-to-speech/ws`` — the
      SDK builds this from ``SarvamAIEnvironment.PRODUCTION.production``
      (``wss://api.sarvam.ai``) + ``/text-to-speech/ws``, never documented
      as a literal string anywhere in the docs pages themselves.
    - Auth header is ``Api-Subscription-Key`` (same key as
      ``_auth_headers()`` above, different casing — HTTP headers are
      case-insensitive, so this is not a second secret).
    - The streaming `configure()` call's language parameter is named
      ``target_language_code``, NOT ``language_code`` like the batch
      ``/text-to-speech`` REST endpoint above. Easy to get wrong copying
      ``synthesize_speech``'s signature — confirmed by reading
      `socket_client.py`'s `configure()` directly, since Sarvam's own docs
      pages inconsistently show both spellings across different pages.
    - ``output_audio_codec`` on the STREAMING endpoint only supports MP3
      ("currently supports MP3 only, optimized for real-time playback" —
      the SDK docstring's own words), unlike the batch endpoint above which
      requests `"wav"`. This function always yields MP3 bytes
      (`content_type: "audio/mpeg"`, confirmed by the smoke test), not WAV.
      A caller expecting WAV (e.g. for R2 caching keyed the same way as the
      batch path) needs a transcode step, or must accept MP3 for this path.
    - The model defaults to `bulbul:v3` server-side when omitted, but it is
      passed explicitly here (`SARVAM_TTS_MODEL_ID`) rather than relied on,
      matching `app/config/models.yaml`'s pin.
    - Completion is signalled by an `event` message with
      `data.event_type == "final"` (opted into via `send_completion_event`
      on `connect()`) — without that flag the server never sends it and a
      caller would have no principled way to know synthesis is done versus
      the connection just being slow.

    Raises ``SarvamTTSError`` up front for the same 2,500-character cap as
    ``synthesize_speech``, or if the server sends an `error` message or the
    connection/auth fails.
    """
    if len(text) > SARVAM_TTS_MAX_CHARACTERS:
        raise SarvamTTSError(
            f"text is {len(text)} characters, over Sarvam TTS's "
            f"{SARVAM_TTS_MAX_CHARACTERS}-character limit; chunk it before calling."
        )

    client = AsyncSarvamAI()
    api_key = os.environ.get("SARVAM_API_KEY", "")

    try:
        async with client.text_to_speech_streaming.connect(
            model=SARVAM_TTS_MODEL_ID,
            send_completion_event=True,
            api_subscription_key=api_key,
        ) as ws:
            await ws.configure(
                target_language_code=language_code,
                speaker=voice,
                pace=pace,
                output_audio_codec="mp3",
            )
            await ws.convert(text)
            await ws.flush()

            while True:
                message = await ws.recv()
                if message.type == "audio":
                    yield base64.b64decode(message.data.audio)
                elif message.type == "event":
                    if message.data.event_type == "final":
                        return
                elif message.type == "error":
                    raise SarvamTTSError(f"Sarvam TTS streaming returned an error: {message.data}")
    except SarvamTTSError:
        raise
    except Exception as exc:
        raise SarvamTTSError(f"Sarvam TTS streaming request failed: {exc}") from exc
