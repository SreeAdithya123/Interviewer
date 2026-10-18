"""Shared STT fallback orchestration: try Groq first, fall back to Sarvam.

BUILD_SPEC.md Part 4.5 step 5: "transcribe (Groq, with resume skills and
tech terms passed as a vocabulary hint; Sarvam fallback)"; Part 2: "Sarvam
STT (fallback for accent or Telugu-English mixing, and on Groq failure or
rate limit)". This module is the one place that decides which provider
actually served a transcription — its result maps directly onto
``interview_turns.stt_provider`` / ``interview_turns.stt_fallback_used``.
Callers (the interview turn handler) should use ``transcribe_with_fallback``
and never call ``groq_stt.transcribe`` / ``sarvam.transcribe_fallback``
directly.
"""

from __future__ import annotations

from dataclasses import dataclass

from app.providers import groq_stt, sarvam
from app.providers.types import TranscriptionResult


@dataclass
class FallbackTranscriptionResult:
    """Wraps whichever provider's ``TranscriptionResult`` actually served
    the request, plus whether the Sarvam fallback path was used."""

    result: TranscriptionResult
    fallback_used: bool

    @property
    def stt_provider(self) -> str:
        """Matches ``interview_turns.stt_provider`` (``'groq'``/``'sarvam'``)."""
        return self.result.provider


async def transcribe_with_fallback(
    audio_bytes: bytes,
    vocabulary_hint: list[str] | None = None,
) -> FallbackTranscriptionResult:
    """Transcribe one answer clip, trying Groq first.

    Falls back to Sarvam on **any** Groq failure — auth error, network
    error, non-2xx response, malformed response, or a 429 rate limit — per
    BUILD_SPEC Part 2's "on Groq failure or rate limit" (not limited to the
    429 case specifically; Groq's dev-tier rate limits are tight enough
    that a burst of interviews could realistically hit them, per the
    provider research). The same ``vocabulary_hint`` is passed through to
    Sarvam's ``keyterms`` field.

    If Sarvam also fails, its exception propagates — there is no third
    provider to fall back to, and swallowing it here would hide a genuine
    outage from the caller.
    """
    try:
        result = await groq_stt.transcribe(audio_bytes, vocabulary_hint)
    except groq_stt.GroqSTTError:
        fallback_result = await sarvam.transcribe_fallback(audio_bytes, vocabulary_hint)
        return FallbackTranscriptionResult(result=fallback_result, fallback_used=True)

    return FallbackTranscriptionResult(result=result, fallback_used=False)
