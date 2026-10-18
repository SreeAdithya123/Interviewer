"""Upstash Redis client: REST-based rate-limit/quota checking.

BUILD_SPEC.md Part 2: "Rate limits and quotas | Upstash Redis." Upstash's
Redis is REST-only (no raw TCP protocol exposed to clients) per its own
docs, so this uses the official ``upstash-redis`` package's async REST
client (``upstash_redis.asyncio.Redis``) rather than a ``redis-py``-style
TCP client, which wouldn't work against Upstash at all.

``UPSTASH_REDIS_REST_URL``/``UPSTASH_REDIS_REST_TOKEN`` are read from the
environment and are empty right now (see ``services/engine/.env``); a real
call then fails cleanly with a clear ``RedisError`` from this module's
``_require_env``, not a confusing low-level traceback.

Quota enforcement call sites (BUILD_SPEC Part 4.5: "Quotas per college plan
and per student are enforced before an interview starts"; Groq's own
dev-tier rate limits, per this provider's research notes, are tight enough
to bind during interview-heavy periods too) are the caller's job — this
module only answers "is this key still under its limit," once, atomically.
"""

from __future__ import annotations

import os

import httpx
from upstash_redis.asyncio import Redis
from upstash_redis.errors import UpstashError

from app.providers.errors import ProviderError


class RedisError(ProviderError):
    """An Upstash Redis REST call failed, or required configuration (REST
    URL / token) is missing."""


def _require_env(name: str) -> str:
    value = os.environ.get(name, "")
    if not value:
        raise RedisError(f"{name} is not set; cannot talk to Upstash Redis (see services/engine/.env)")
    return value


def _client() -> Redis:
    """A fresh Upstash REST client. Not cached: this is a lightweight REST
    wrapper (no persistent TCP connection to pool, unlike a classic Redis
    client), and a per-call client keeps tests free of state leaking
    through a shared singleton — matching this project's other provider
    clients. Revisit only if real traffic ever makes client construction
    itself measurable.
    """
    url = _require_env("UPSTASH_REDIS_REST_URL")
    token = _require_env("UPSTASH_REDIS_REST_TOKEN")
    return Redis(url=url, token=token)


async def check_and_increment_quota(key: str, limit: int, window_seconds: int) -> bool:
    """Fixed-window rate limit / quota check, atomic via one pipelined REST
    request: increments ``key``, and — only if ``key`` had no TTL yet
    (``EXPIRE ... NX``) — starts a ``window_seconds`` expiry on it, so an
    already-running window's TTL is never extended by a later call in the
    same window. Returns ``True`` if the incremented count is within
    ``limit``, ``False`` once it has been exceeded.

    This always increments first (a simple fixed-window counter, not a
    token bucket): a denied call still counts against the window, the same
    way a rejected request still "used" its attempt. Raises ``RedisError``
    on a network failure or a non-2xx REST response.
    """
    redis = _client()
    try:
        pipe = redis.pipeline()
        pipe.incr(key)
        pipe.expire(key, window_seconds, nx=True)
        results = await pipe.exec()
    except (UpstashError, httpx.HTTPError) as exc:
        raise RedisError(f"Upstash Redis quota check failed for key {key!r}: {exc}") from exc

    count = int(results[0])
    return count <= limit
