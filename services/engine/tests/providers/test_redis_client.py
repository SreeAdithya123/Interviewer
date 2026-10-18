"""Tests for app/providers/redis_client.py.

upstash-redis's async client is REST-based over httpx under the hood, so
every call is intercepted by respx — none of these tests ever reach the
real network, per BUILD_SPEC Part 6.
"""

from __future__ import annotations

import json

import httpx
import pytest
import respx

from app.providers.redis_client import RedisError, check_and_increment_quota

_REDIS_URL = "https://fake-redis.upstash.io"
_PIPELINE_URL = f"{_REDIS_URL}/pipeline"


@pytest.fixture(autouse=True)
def _redis_env(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("UPSTASH_REDIS_REST_URL", _REDIS_URL)
    monkeypatch.setenv("UPSTASH_REDIS_REST_TOKEN", "test-upstash-token")


@respx.mock
async def test_check_and_increment_quota_allows_when_under_limit() -> None:
    respx.post(_PIPELINE_URL).mock(
        return_value=httpx.Response(200, json=[{"result": 3}, {"result": 1}])
    )

    allowed = await check_and_increment_quota("quota:user1:interviews:daily", limit=5, window_seconds=86400)

    assert allowed is True


@respx.mock
async def test_check_and_increment_quota_denies_when_over_limit() -> None:
    respx.post(_PIPELINE_URL).mock(
        return_value=httpx.Response(200, json=[{"result": 6}, {"result": 1}])
    )

    allowed = await check_and_increment_quota("quota:user1:interviews:daily", limit=5, window_seconds=86400)

    assert allowed is False


@respx.mock
async def test_check_and_increment_quota_allows_exactly_at_limit() -> None:
    respx.post(_PIPELINE_URL).mock(
        return_value=httpx.Response(200, json=[{"result": 5}, {"result": 1}])
    )

    allowed = await check_and_increment_quota("quota:user1:interviews:daily", limit=5, window_seconds=86400)

    assert allowed is True


@respx.mock
async def test_check_and_increment_quota_sends_incr_and_expire_nx_commands() -> None:
    route = respx.post(_PIPELINE_URL).mock(
        return_value=httpx.Response(200, json=[{"result": 1}, {"result": True}])
    )

    await check_and_increment_quota("quota:college1:daily", limit=1000, window_seconds=3600)

    sent_body = json.loads(route.calls.last.request.content)
    assert sent_body == [
        ["INCR", "quota:college1:daily"],
        ["EXPIRE", "quota:college1:daily", 3600, "NX"],
    ]


@respx.mock
async def test_check_and_increment_quota_sends_bearer_auth_header() -> None:
    route = respx.post(_PIPELINE_URL).mock(
        return_value=httpx.Response(200, json=[{"result": 1}, {"result": 1}])
    )

    await check_and_increment_quota("quota:user1:daily", limit=10, window_seconds=86400)

    assert route.calls.last.request.headers["authorization"] == "Bearer test-upstash-token"


@respx.mock
async def test_check_and_increment_quota_raises_redis_error_on_upstash_error_response() -> None:
    respx.post(_PIPELINE_URL).mock(
        return_value=httpx.Response(200, json=[{"error": "WRONGPASS invalid token"}])
    )

    with pytest.raises(RedisError):
        await check_and_increment_quota("quota:user1:daily", limit=10, window_seconds=86400)


@respx.mock
async def test_check_and_increment_quota_raises_redis_error_on_network_failure() -> None:
    respx.post(_PIPELINE_URL).mock(side_effect=httpx.ConnectTimeout("timed out"))

    with pytest.raises(RedisError):
        await check_and_increment_quota("quota:user1:daily", limit=10, window_seconds=86400)


async def test_check_and_increment_quota_raises_clear_error_when_token_missing(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.delenv("UPSTASH_REDIS_REST_TOKEN", raising=False)

    with pytest.raises(RedisError, match="UPSTASH_REDIS_REST_TOKEN"):
        await check_and_increment_quota("quota:user1:daily", limit=10, window_seconds=86400)
