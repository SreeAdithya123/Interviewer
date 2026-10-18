"""Tests for app/providers/r2.py.

generate_upload_url/generate_download_url are pure local HMAC signing (no
network call) and are tested for real, per the task's own instruction
("this one does not need network mocking, it is pure URL signing"). Only
get_object_bytes makes a real request — stubbed with botocore's own
Stubber (no network, no respx needed since boto3 doesn't use httpx).
"""

from __future__ import annotations

import io

import pytest
from botocore.stub import Stubber

from app.providers import r2
from app.providers.r2 import R2Error, generate_download_url, generate_upload_url, get_object_bytes


@pytest.fixture(autouse=True)
def _r2_env(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("R2_ACCOUNT_ID", "acct123")
    monkeypatch.setenv("R2_ACCESS_KEY_ID", "AKIAFAKEACCESSKEY")
    monkeypatch.setenv("R2_SECRET_ACCESS_KEY", "fake-secret-access-key")
    monkeypatch.setenv("R2_BUCKET_NAME", "test-bucket")


def test_generate_upload_url_signs_put_object_for_the_given_key() -> None:
    url = generate_upload_url("answers/abc123.webm")

    assert url.startswith("https://acct123.r2.cloudflarestorage.com/test-bucket/answers/abc123.webm")
    assert "X-Amz-Signature=" in url
    assert "X-Amz-Expires=900" in url


def test_generate_download_url_signs_get_object_with_custom_expiry() -> None:
    url = generate_download_url("reports/report-xyz.json", expires_in=60)

    assert url.startswith("https://acct123.r2.cloudflarestorage.com/test-bucket/reports/report-xyz.json")
    assert "X-Amz-Expires=60" in url


def test_generate_upload_url_and_download_url_differ_for_the_same_key() -> None:
    # Different signed actions (PUT vs GET) must not produce the same
    # signature even for an identical key.
    upload = generate_upload_url("same-key.webm")
    download = generate_download_url("same-key.webm")

    assert upload != download


def test_presigning_raises_clear_error_when_account_id_missing(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.delenv("R2_ACCOUNT_ID", raising=False)

    with pytest.raises(R2Error, match="R2_ACCOUNT_ID"):
        generate_upload_url("answers/abc123.webm")


async def test_get_object_bytes_returns_stubbed_object_body(monkeypatch: pytest.MonkeyPatch) -> None:
    client = r2._client()
    stubber = Stubber(client)
    raw_bytes = b"cached tts audio bytes"
    stubber.add_response(
        "get_object",
        {"Body": io.BytesIO(raw_bytes)},
        {"Bucket": "test-bucket", "Key": "tts/cache-key.wav"},
    )
    stubber.activate()
    monkeypatch.setattr(r2, "_client", lambda: client)

    result = await get_object_bytes("tts/cache-key.wav")

    assert result == raw_bytes
    stubber.assert_no_pending_responses()


async def test_get_object_bytes_raises_r2_error_on_client_error(monkeypatch: pytest.MonkeyPatch) -> None:
    client = r2._client()
    stubber = Stubber(client)
    stubber.add_client_error("get_object", service_error_code="NoSuchKey", http_status_code=404)
    stubber.activate()
    monkeypatch.setattr(r2, "_client", lambda: client)

    with pytest.raises(R2Error):
        await get_object_bytes("missing/key.wav")
