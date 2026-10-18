"""Loads the pinned provider model ids and prices from this package's
``models.yaml`` / ``pricing.yaml``.

BUILD_SPEC.md Part 2: "Model names, SDK methods and API shapes change often.
Before writing any provider integration, check the provider's current
official docs and pin exact model IDs in one config file ... Load this file
at startup; never hardcode a model id string in provider client code."

``load_models()`` / ``load_pricing()`` are cached (``lru_cache``) so the YAML
is parsed once per process, on first use, not re-read from disk on every
provider call.
"""

from __future__ import annotations

from functools import lru_cache
from pathlib import Path
from typing import Any

import yaml

_CONFIG_DIR = Path(__file__).parent
_MODELS_PATH = _CONFIG_DIR / "models.yaml"
_PRICING_PATH = _CONFIG_DIR / "pricing.yaml"


@lru_cache
def load_models() -> dict[str, Any]:
    """Return the parsed contents of models.yaml (stt_primary, stt_fallback,
    tts, conversation, evaluation, embedding — each with provider/model_id)."""
    return yaml.safe_load(_MODELS_PATH.read_text(encoding="utf-8"))


@lru_cache
def load_pricing() -> dict[str, Any]:
    """Return the parsed contents of pricing.yaml (paise-per-unit rates for
    every provider call this engine makes)."""
    return yaml.safe_load(_PRICING_PATH.read_text(encoding="utf-8"))
