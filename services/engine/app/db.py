"""Shared Supabase service-role client for the engine service.

Per the task context: "services/engine/.env now has SUPABASE_URL and
SUPABASE_SERVICE_ROLE_KEY (a real, working service-role key for the live
project, bypasses RLS entirely, exactly like a real deployed engine would
use). Use the official supabase-py client ... for all DB reads/writes."

The client is created lazily (so importing this module never requires the
env vars to be set, e.g. at `ruff`/collection time) and cached as a module
level singleton, since `AsyncClient` creation does a small amount of async
setup work and is meant to be reused across requests.
"""

from __future__ import annotations

import os

from dotenv import load_dotenv
from supabase import AsyncClient, create_async_client

load_dotenv()

_client: AsyncClient | None = None


async def get_client() -> AsyncClient:
    """Return the process-wide Supabase service-role client, creating it on
    first use. Bypasses RLS entirely (service role) — callers are
    responsible for their own authorization checks, per the engine's
    "service role is the only writer" design (see docs/BUILD_SPEC.md
    Part 4.1, Part 5)."""
    global _client
    if _client is None:
        url = os.environ["SUPABASE_URL"]
        key = os.environ["SUPABASE_SERVICE_ROLE_KEY"]
        _client = await create_async_client(url, key)
    return _client


async def reset_client() -> None:
    """Drop the cached client so the next `get_client()` call creates a
    fresh one. Used by tests that need a clean slate; never called from
    application code."""
    global _client
    _client = None
