"""Usage metering: one `usage_events` row per provider call, per
docs/BUILD_SPEC.md Part 5 ("Every provider call (STT, TTS, LLM, embeddings,
OCR) writes one usage_events row") and Part 1 (margins depend on knowing the
real cost of every call).

Call pattern for every STT/TTS/LLM/embedding call in the codebase:

    cost_paise = compute_cost_paise(provider="groq", model=model_id, units={"audio_seconds": 12.4})
    await log_usage_event(
        feature="stt", provider="groq", model=model_id,
        units={"audio_seconds": 12.4}, cost_paise=cost_paise,
        interview_id=interview_id, user_id=user_id, college_id=college_id,
    )

`compute_cost_paise` is the single place that knows how to turn provider
units into paise from `app/config/pricing.yaml`; `log_usage_event` just
writes the row. Keeping them separate lets a caller log a cost it already
knows (e.g. a cost surfaced directly in a provider response) without going
through the pricing table, while the common path uses both.
"""

from __future__ import annotations

from datetime import date
from typing import Any

from app.config.loader import load_models, load_pricing
from app.db import get_client

# pricing.yaml's gemini_eval_* comment: "$0.75/$3.75 per 1M tokens through
# 2026-12-31 ... doubles after." This is the one place that date is acted
# on, not just documented — see pricing.yaml for the source and the
# standard-rate values to fall back to. (Updated 2026-10-18 for the
# gemini-3.8-flash swap — gemini-4-argon's cutoff was 2026-11-30; this
# model's own intro pricing runs a month longer, through 2026-12-31.)
GEMINI_EVAL_INTRO_PRICING_CUTOFF = date(2026, 12, 31)

# Groq's STT billing floor (pricing.yaml / models.yaml: "10-second minimum
# billed length per request regardless of actual clip length").
GROQ_STT_MIN_BILLED_SECONDS = 10.0


def compute_cost_paise(
    *,
    provider: str,
    model: str | None,
    units: dict[str, Any],
    today: date | None = None,
) -> int:
    """Compute the cost in paise of one provider call from its reported
    units, using `app/config/pricing.yaml`. Raises `ValueError` for a
    provider/units combination this function doesn't know how to price —
    deliberately fails loud rather than silently costing a call as zero.

    `today` is injectable only so a test can exercise the Gemini
    evaluation-pricing cutoff deterministically; real callers never pass it.
    """
    pricing = load_pricing()

    if provider == "groq" and "audio_seconds" in units:
        billed_seconds = max(float(units["audio_seconds"]), GROQ_STT_MIN_BILLED_SECONDS)
        return round(billed_seconds * pricing["groq_stt_per_second"])

    if provider == "sarvam" and "audio_seconds" in units:
        return round(float(units["audio_seconds"]) * pricing["sarvam_stt_per_second"])

    if provider == "sarvam" and "characters" in units:
        return round(float(units["characters"]) * pricing["sarvam_tts_per_character"])

    if provider == "gemini":
        return _compute_gemini_cost_paise(model=model, units=units, pricing=pricing, today=today)

    raise ValueError(f"no pricing rule for provider={provider!r} model={model!r} units={units!r}")


def _compute_gemini_cost_paise(
    *, model: str | None, units: dict[str, Any], pricing: dict[str, Any], today: date | None
) -> int:
    models_config = load_models()
    input_tokens = float(units.get("input_tokens", 0))
    # Gemini 4 Argon's "thinking" tokens are billed as output tokens (see
    # models.yaml's `evaluation` entry and pricing.yaml's note) — summed
    # here regardless of model, since a non-reasoning model simply never
    # reports thoughts_tokens.
    output_tokens = float(units.get("output_tokens", 0)) + float(units.get("thoughts_tokens", 0))

    if model == models_config["embedding"]["model_id"]:
        return round(input_tokens * pricing["gemini_embedding_per_token"])

    if model == models_config["evaluation"]["model_id"]:
        cutoff = today or date.today()
        if cutoff <= GEMINI_EVAL_INTRO_PRICING_CUTOFF:
            in_rate = pricing["gemini_eval_input_per_token"]
            out_rate = pricing["gemini_eval_output_per_token"]
        else:
            in_rate = pricing["gemini_eval_input_per_token_standard"]
            out_rate = pricing["gemini_eval_output_per_token_standard"]
        return round(input_tokens * in_rate + output_tokens * out_rate)

    # Default: the conversation model (gemini-2.5-flash-lite), used for
    # in-stage follow-up generation.
    return round(
        input_tokens * pricing["gemini_flash_lite_input_per_token"]
        + output_tokens * pricing["gemini_flash_lite_output_per_token"]
    )


async def log_usage_event(
    feature: str,
    provider: str,
    model: str | None,
    units: dict[str, Any],
    cost_paise: int,
    **refs: Any,
) -> None:
    """Insert one real `usage_events` row. `refs` carries whichever of
    `user_id`, `college_id`, `interview_id`, `chat_session_id`,
    `resume_scan_id` apply to this call — passed straight through to the
    matching nullable columns.
    """
    client = await get_client()
    row: dict[str, Any] = {
        "feature": feature,
        "provider": provider,
        "model": model,
        "units": units,
        "cost_paise": cost_paise,
        **refs,
    }
    await client.table("usage_events").insert(row).execute()
