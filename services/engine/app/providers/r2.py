"""Cloudflare R2 client: signed upload/download URLs plus server-side reads.

BUILD_SPEC.md Part 2: "Audio and file storage | Cloudflare R2 via signed
upload/download URLs (browser uploads directly)"; Part 4.5 step 4: "Browser
uploads audio straight to R2, then calls the engine with the object key."
This module is the engine's one place that talks to R2 — it never proxies
answer-clip bytes through the engine itself for an upload, only signs the
URL the browser then ``PUT``s to directly.

R2 is S3-compatible (Cloudflare's own docs point integrators at the
standard AWS S3 SDKs — there is no separate R2-specific SDK), so this uses
plain ``boto3`` against R2's S3-compatible endpoint
(``https://{account_id}.r2.cloudflarestorage.com``, region ``"auto"``,
SigV4), matching ``R2_ACCOUNT_ID``/``R2_ACCESS_KEY_ID``/
``R2_SECRET_ACCESS_KEY`` in ``services/engine/.env.example``.

Presigning (``generate_upload_url``/``generate_download_url``) is pure
local HMAC signing — boto3 never makes a network call for it, so both
functions are synchronous. Only ``get_object_bytes`` (a real ``GetObject``
call) is async, via ``asyncio.to_thread`` around boto3's blocking client:
this project's real traffic is low-volume audio/report reads, not a
scenario where a long-lived, connection-pooled async S3 client
(``aioboto3``) earns its extra dependency weight yet — see
``docs/DECISIONS.md``.

``R2_ACCOUNT_ID``/``R2_ACCESS_KEY_ID``/``R2_SECRET_ACCESS_KEY``/
``R2_BUCKET_NAME`` are read from the environment and are empty right now
(see ``services/engine/.env``); a real call then fails cleanly with a clear
``R2Error`` from this module's ``_require_env``, not a confusing boto3
traceback three layers down.

Cost tagging (``app/config/pricing.yaml``): ``generate_upload_url`` signs a
``PutObject`` (Class A — about 12.5x more expensive per request than Class
B); ``generate_download_url`` and ``get_object_bytes`` both sign/perform a
``GetObject`` (Class B). A caller logging a ``usage_events`` row for an R2
call should tag it by which of these three functions it called, never
lump every R2 call into one undifferentiated bucket.
"""

from __future__ import annotations

import asyncio
import os

import boto3
from botocore.client import Config
from botocore.exceptions import ClientError

from app.providers.errors import ProviderError

_DEFAULT_EXPIRES_IN_SECONDS = 900  # 15 minutes


class R2Error(ProviderError):
    """An R2 (S3-compatible) call failed, or required configuration
    (account id / access keys / bucket name) is missing."""


def _require_env(name: str) -> str:
    value = os.environ.get(name, "")
    if not value:
        raise R2Error(f"{name} is not set; cannot talk to R2 (see services/engine/.env)")
    return value


def _client():
    """A fresh boto3 S3 client against R2's S3-compatible endpoint.

    Not cached: boto3 clients are cheap to construct (no network call, no
    connection actually opened until the first real request), and a fresh
    client per call keeps tests free of state leaking through a shared
    singleton — matching this project's other provider clients.
    """
    account_id = _require_env("R2_ACCOUNT_ID")
    access_key = _require_env("R2_ACCESS_KEY_ID")
    secret_key = _require_env("R2_SECRET_ACCESS_KEY")
    return boto3.client(
        "s3",
        endpoint_url=f"https://{account_id}.r2.cloudflarestorage.com",
        aws_access_key_id=access_key,
        aws_secret_access_key=secret_key,
        region_name="auto",
        config=Config(signature_version="s3v4"),
    )


def _bucket_name() -> str:
    return _require_env("R2_BUCKET_NAME")


def generate_upload_url(key: str, *, expires_in: int = _DEFAULT_EXPIRES_IN_SECONDS) -> str:
    """Sign a ``PutObject`` URL the browser can upload an answer clip (or
    any other object) to directly — BUILD_SPEC Part 4.5 step 4. Pure local
    signing: no network call, so this never raises ``R2Error`` for a
    transport reason, only for missing configuration.
    """
    return _client().generate_presigned_url(
        "put_object",
        Params={"Bucket": _bucket_name(), "Key": key},
        ExpiresIn=expires_in,
    )


def generate_download_url(key: str, *, expires_in: int = _DEFAULT_EXPIRES_IN_SECONDS) -> str:
    """Sign a ``GetObject`` URL for playback or download (e.g. a report's
    answer-audio clips, per BUILD_SPEC Part 4.5 step 9's "full transcript
    with audio playback per answer"). Pure local signing — no network call.
    """
    return _client().generate_presigned_url(
        "get_object",
        Params={"Bucket": _bucket_name(), "Key": key},
        ExpiresIn=expires_in,
    )


async def get_object_bytes(key: str) -> bytes:
    """Read one object's bytes server-side — e.g. a TTS cache hit
    (``tts_cache.audio_key``) the engine re-serves without round-tripping
    through Sarvam again. A real network call, so it runs in a thread:
    boto3 has no native asyncio API.
    """

    def _get() -> bytes:
        try:
            response = _client().get_object(Bucket=_bucket_name(), Key=key)
        except ClientError as exc:
            raise R2Error(f"failed to read R2 object {key!r}: {exc}") from exc
        return response["Body"].read()

    return await asyncio.to_thread(_get)
