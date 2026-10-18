"""Shared result types returned by provider STT/TTS clients.

Both ``app/providers/groq_stt.py`` and ``app/providers/sarvam.py`` return
``TranscriptionResult`` from their respective STT calls, so
``app/providers/stt.py`` (and eventually ``app/costs/``, which turns these
into real ``usage_events`` rows) can handle either provider's result the
same way.

Deliberately not included here: an "audio seconds" field on
``TranscriptionResult``. The STT clients receive only encoded audio bytes
(opus/webm from the browser) and have no reliable, dependency-free way to
decode their true duration — and they don't need to, because the caller
(the interview turn handler) already has that duration for free, from the
same clip's own ``interview_turns.answer_duration_seconds`` recorded by the
browser. Re-deriving it here from compressed bytes would be redundant at
best and a guess at worst; see docs/DECISIONS.md.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any


@dataclass
class TranscriptionResult:
    """Result of one STT call, from either provider.

    ``provider``/``model_id`` let the caller log a ``usage_events`` row
    without hardcoding provider names; ``latency_ms`` is the wall-clock time
    of the HTTP call; ``raw_response`` is the parsed JSON body, kept for
    debugging/audit, never re-parsed by callers for anything load-bearing.
    """

    text: str
    provider: str
    model_id: str
    latency_ms: int
    raw_response: dict[str, Any] = field(default_factory=dict)


@dataclass
class SpeechResult:
    """Result of one TTS call (Sarvam Bulbul).

    Unlike STT, the billable unit here (character count) is exactly the
    length of the ``text`` the caller passed in — no guessing involved — so
    ``characters``/``cost_paise`` are computed and returned directly.
    """

    audio_bytes: bytes
    provider: str
    model_id: str
    characters: int
    cost_paise: int
    latency_ms: int
    raw_response: dict[str, Any] = field(default_factory=dict)
