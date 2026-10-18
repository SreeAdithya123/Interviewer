"""Groq Whisper speech-to-text client (primary STT provider).

BUILD_SPEC.md Part 4.5 step 5: "transcribe (Groq, with resume skills and
tech terms passed as a vocabulary hint; Sarvam fallback)". This module is
the Groq half only — ``app/providers/sarvam.py`` is the fallback, and
``app/providers/stt.py`` is the shared helper that tries this first and
falls back to Sarvam on failure. Callers should use that helper, not this
module, directly.

Auth header format (confirmed against Groq's own docs, see
``app/config/models.yaml``): a plain bearer token —
``Authorization: Bearer $GROQ_API_KEY`` — unlike Sarvam's custom header.

``GROQ_API_KEY`` is read from the environment and may be empty right now
(no real key exists in this environment yet); a ``transcribe()`` call then
fails cleanly with ``GroqSTTError`` wrapping Groq's 401, rather than
crashing — exactly what BUILD_SPEC Part 6 asks for at this boundary.
"""

from __future__ import annotations

import os
import time
from typing import Any

import httpx

from app.config.loader import load_models
from app.providers.errors import ProviderError
from app.providers.types import TranscriptionResult

_STT_PRIMARY = load_models()["stt_primary"]
GROQ_MODEL_ID: str = _STT_PRIMARY["model_id"]
GROQ_API_BASE: str = _STT_PRIMARY["api_base"]
GROQ_TRANSCRIBE_PATH: str = _STT_PRIMARY["endpoint"]

# Groq bills a 10-second minimum per STT request regardless of actual clip
# length (see app/config/pricing.yaml's comment on groq_stt_per_second).
# The cost-tracking module applies this floor to the turn's own known
# answer_duration_seconds when it computes usage_events.cost_paise — not
# this module, which never sees (or guesses at) the clip's true duration.
# Exposed here as a constant so that module doesn't have to re-discover it.
GROQ_STT_MINIMUM_BILLED_SECONDS = 10

_DEFAULT_TIMEOUT_SECONDS = 30.0


class GroqSTTError(ProviderError):
    """Groq's ``/audio/transcriptions`` endpoint failed, or returned a
    response that doesn't match the documented shape."""


async def transcribe(
    audio_bytes: bytes,
    vocabulary_hint: list[str] | None = None,
) -> TranscriptionResult:
    """Transcribe one answer clip with Groq Whisper (``whisper-large-v3``).

    ``vocabulary_hint`` is BUILD_SPEC's "resume skills and tech terms passed
    as a vocabulary hint". Groq's actual mechanism for this is the
    ``prompt`` field — a short free-text string, not a list/array (see
    https://console.groq.com/docs/speech-to-text) — so the hint list is
    joined into one comma-separated string before sending.

    Raises ``GroqSTTError`` on any non-2xx response or network failure
    (including a 429 rate limit — the caller, ``app/providers/stt.py``,
    decides to fall back to Sarvam on any of these, not just the 429 case).
    """
    api_key = os.environ.get("GROQ_API_KEY", "")

    form_data: dict[str, str] = {"model": GROQ_MODEL_ID, "response_format": "json"}
    if vocabulary_hint:
        form_data["prompt"] = ", ".join(vocabulary_hint)

    files = {"file": ("answer.webm", audio_bytes, "application/octet-stream")}

    started = time.monotonic()
    try:
        async with httpx.AsyncClient(timeout=_DEFAULT_TIMEOUT_SECONDS) as client:
            response = await client.post(
                f"{GROQ_API_BASE}{GROQ_TRANSCRIBE_PATH}",
                headers={"Authorization": f"Bearer {api_key}"},
                data=form_data,
                files=files,
            )
    except httpx.HTTPError as exc:
        raise GroqSTTError(f"Groq STT request failed: {exc}") from exc
    latency_ms = int((time.monotonic() - started) * 1000)

    if response.status_code != 200:
        raise GroqSTTError(
            f"Groq STT returned HTTP {response.status_code}: {response.text}",
            status_code=response.status_code,
        )

    payload: Any = response.json()
    text = payload.get("text") if isinstance(payload, dict) else None
    if text is None:
        raise GroqSTTError(f"Groq STT response missing 'text' field: {payload!r}")

    return TranscriptionResult(
        text=text,
        provider="groq",
        model_id=GROQ_MODEL_ID,
        latency_ms=latency_ms,
        raw_response=payload,
    )
