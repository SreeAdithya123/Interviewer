"""Shared exception types for provider API clients.

Every provider client (``groq_stt.py``, ``sarvam.py``) raises its own
subclass of ``ProviderError`` so callers — ``app/providers/stt.py``'s
fallback helper today, and ``app/costs/`` once it exists — can catch a
provider failure without caring which HTTP library or provider produced it.

BUILD_SPEC Part 6: "Only validate at system boundaries ... a real call will
simply fail with an auth error, which your code should raise/handle
cleanly, not crash ungracefully." These are that clean, raisable error.
"""

from __future__ import annotations


class ProviderError(Exception):
    """A provider API call failed: a network error, a non-2xx response, or
    a response that doesn't match the documented shape.

    ``status_code`` is the HTTP status that caused the failure, when there
    was one (``None`` for a network-level failure such as a timeout).
    """

    def __init__(self, message: str, *, status_code: int | None = None) -> None:
        super().__init__(message)
        self.status_code = status_code
