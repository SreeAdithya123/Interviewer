"""Gemini client: in-stage follow-up decisions, end-of-interview evaluation,
and text embeddings.

BUILD_SPEC.md Part 2 picks Gemini for all three roles; Part 4.5 step 2: "The
LLM only writes follow-ups inside a stage; it does not control the stage
order" (``app/interview/engine.py`` alone decides stage order and only ever
calls ``generate_followup`` for the in-stage decision). Part 4.5 step 8:
"one evaluation call ... Every score includes evidence: exact quotes from
the transcript." Both calls use ``prompts/interview_followup_v1.txt`` and
``prompts/interview_evaluation_v1.txt`` respectively, formatted and sent
with Gemini's own JSON-mode (``generationConfig.responseMimeType``), never
hand-parsed out of free text.

Plain ``httpx`` against the documented REST shape, matching
``app/providers/groq_stt.py``/``sarvam.py``'s style — not the official
``google-genai``/``google-generativeai`` SDK. This is a deliberate choice,
not an oversight: see ``docs/DECISIONS.md`` for the reasoning (one
consistent HTTP client/mocking approach across every provider in this
codebase, and no extra SDK dependency weight for one provider only).

Auth header format (confirmed against Gemini's own docs, see
``app/config/models.yaml``): ``x-goog-api-key: $GEMINI_API_KEY`` — never the
``?key=`` query-param form some of Google's REST doc pages show, which
would leak the key into logs/URLs/proxies.

``GEMINI_API_KEY`` is read from the environment and may be empty right now
(no real key exists in this environment yet); a real call then fails
cleanly with ``GeminiError`` wrapping Google's 401/403, not a crash.
"""

from __future__ import annotations

import json
import os
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

import httpx

from app.config.loader import load_models
from app.providers.errors import ProviderError

_MODELS = load_models()
_CONVERSATION = _MODELS["conversation"]
_EVALUATION = _MODELS["evaluation"]
_EMBEDDING = _MODELS["embedding"]

GEMINI_CONVERSATION_MODEL_ID: str = _CONVERSATION["model_id"]
GEMINI_CONVERSATION_API_BASE: str = _CONVERSATION["api_base"]
GEMINI_CONVERSATION_PATH: str = _CONVERSATION["endpoint"].format(model=GEMINI_CONVERSATION_MODEL_ID)

GEMINI_EVALUATION_MODEL_ID: str = _EVALUATION["model_id"]
GEMINI_EVALUATION_API_BASE: str = _EVALUATION["api_base"]
GEMINI_EVALUATION_PATH: str = _EVALUATION["endpoint"].format(model=GEMINI_EVALUATION_MODEL_ID)

GEMINI_EMBEDDING_MODEL_ID: str = _EMBEDDING["model_id"]
GEMINI_EMBEDDING_API_BASE: str = _EMBEDDING["api_base"]
GEMINI_EMBEDDING_PATH: str = _EMBEDDING["endpoint"].format(model=GEMINI_EMBEDDING_MODEL_ID)
# Google's own recommended truncation stop for this model (default is 3072
# if omitted) — must be sent on every embedContent call or kb_chunks'
# vector(768) column breaks. See app/config/models.yaml's "DIMENSION FLAG".
GEMINI_EMBEDDING_OUTPUT_DIMENSIONALITY: int = _EMBEDDING.get("output_dimensionality", 768)

# Prompt files are versioned per docs/BUILD_SPEC.md Part 3
# ("services/engine/prompts/ Versioned prompt files (each has a version id
# stored with every output it produces)"); the version id is the filename
# stem, exported here so a caller can store it next to this call's output
# (interview_reports.prompt_version) without hardcoding the string again.
_PROMPTS_DIR = Path(__file__).resolve().parent.parent.parent / "prompts"
FOLLOWUP_PROMPT_VERSION = "interview_followup_v1"
EVALUATION_PROMPT_VERSION = "interview_evaluation_v1"
BULLET_REWRITE_PROMPT_VERSION = "resume_bullet_rewrite_v1"
_FOLLOWUP_PROMPT_TEMPLATE = (_PROMPTS_DIR / f"{FOLLOWUP_PROMPT_VERSION}.txt").read_text(encoding="utf-8")
_EVALUATION_PROMPT_TEMPLATE = (_PROMPTS_DIR / f"{EVALUATION_PROMPT_VERSION}.txt").read_text(encoding="utf-8")
_BULLET_REWRITE_PROMPT_TEMPLATE = (_PROMPTS_DIR / f"{BULLET_REWRITE_PROMPT_VERSION}.txt").read_text(encoding="utf-8")

_DEFAULT_TIMEOUT_SECONDS = 30.0


class GeminiError(ProviderError):
    """A Gemini ``generateContent``/``embedContent`` call failed, or
    returned a response that doesn't match the documented shape (see
    ``app/config/models.yaml``). Also raised when Gemini returns no
    candidates because a safety filter blocked the prompt or the response —
    handled explicitly here rather than assuming ``candidates[0]`` always
    exists (per this provider's own research notes)."""


class EmbeddingDimensionMismatchError(GeminiError):
    """Gemini returned an embedding vector whose length doesn't match
    ``GEMINI_EMBEDDING_OUTPUT_DIMENSIONALITY``. ``kb_chunks.embedding`` is a
    fixed ``vector(768)`` column — a mismatched vector is never silently
    truncated or padded to fit; this fails loudly instead."""


@dataclass
class FollowupResult:
    """Result of one in-stage follow-up-generation call (conversation
    model). ``follow_up_question`` is ``None`` when Gemini decided the
    answer needed no probing — see ``prompts/interview_followup_v1.txt``.
    Token counts come from the response's ``usageMetadata`` and are summed
    by ``app/costs/tracking.py`` into one ``usage_events`` row."""

    follow_up_question: str | None
    model_id: str
    input_tokens: int
    output_tokens: int
    thoughts_tokens: int = 0
    raw_response: dict[str, Any] = field(default_factory=dict)


@dataclass
class BulletRewriteResult:
    """Result of one resume-bullet-rewrite call (BUILD_SPEC Part 4.3).
    Exactly one of `text`/`question` is set, matching `kind` — mirrors
    apps/web/lib/ai-stubs/rewrite-bullet.ts's `RewriteResult` shape
    byte-for-byte so the frontend's existing UI contract needs no
    changes when this swaps in for that stub."""

    kind: str  # 'rewritten' | 'needs_metric'
    text: str | None
    question: str | None
    model_id: str
    input_tokens: int
    output_tokens: int
    thoughts_tokens: int = 0
    raw_response: dict[str, Any] = field(default_factory=dict)


@dataclass
class EvaluationResult:
    """Result of one end-of-interview evaluation call, matching
    ``interview_reports``' columns directly (``scores``, ``overall_score``,
    ``strengths``, ``weak_areas``, ``practice_actions``) plus the token
    counts ``app/costs/tracking.py`` needs to cost the call. See
    ``prompts/interview_evaluation_v1.txt`` for the exact JSON shape
    ``scores``/``weak_areas`` are expected to come back as."""

    scores: dict[str, Any]
    overall_score: float
    strengths: list[str]
    weak_areas: list[dict[str, Any]]
    practice_actions: list[str]
    model_id: str
    input_tokens: int
    output_tokens: int
    thoughts_tokens: int = 0
    raw_response: dict[str, Any] = field(default_factory=dict)


def _auth_headers(api_key: str) -> dict[str, str]:
    return {"x-goog-api-key": api_key, "Content-Type": "application/json"}


async def _post_generate_content(
    *, api_base: str, path_template: str, model_id: str, prompt: str
) -> dict[str, Any]:
    """POST one ``generateContent`` call with JSON-mode on, against the
    given model's own configured ``api_base``/``endpoint`` (each of
    ``conversation``/``evaluation`` carries its own in
    ``app/config/models.yaml``, even though both currently happen to be the
    same string — never hardcoded here)."""
    api_key = os.environ.get("GEMINI_API_KEY", "")
    url = f"{api_base}{path_template.format(model=model_id)}"
    body = {
        "contents": [{"role": "user", "parts": [{"text": prompt}]}],
        "generationConfig": {"responseMimeType": "application/json"},
    }
    try:
        async with httpx.AsyncClient(timeout=_DEFAULT_TIMEOUT_SECONDS) as client:
            response = await client.post(url, headers=_auth_headers(api_key), json=body)
    except httpx.HTTPError as exc:
        raise GeminiError(f"Gemini generateContent request failed: {exc}") from exc

    if response.status_code != 200:
        raise GeminiError(
            f"Gemini generateContent returned HTTP {response.status_code}: {response.text}",
            status_code=response.status_code,
        )
    return response.json()


def _extract_candidate_text(payload: dict[str, Any]) -> str:
    """Pull the first candidate's text out, or raise explicitly if Gemini
    returned none — which happens when a safety filter blocks the prompt
    or the response, not only on a transport-level failure."""
    candidates = payload.get("candidates")
    if not candidates:
        block_reason = (payload.get("promptFeedback") or {}).get("blockReason")
        raise GeminiError(
            f"Gemini returned no candidates (blocked by a safety filter; "
            f"blockReason={block_reason!r})"
        )
    parts = (candidates[0].get("content") or {}).get("parts") or []
    text = "".join(part.get("text", "") for part in parts)
    if not text:
        raise GeminiError(f"Gemini response's first candidate has no text: {payload!r}")
    return text


def _parse_json_object(text: str) -> dict[str, Any]:
    try:
        parsed = json.loads(text)
    except json.JSONDecodeError as exc:
        raise GeminiError(f"Gemini response was not valid JSON: {text!r}") from exc
    if not isinstance(parsed, dict):
        raise GeminiError(f"Gemini response JSON was not an object: {parsed!r}")
    return parsed


def _usage_tokens(payload: dict[str, Any]) -> tuple[int, int, int]:
    """(input_tokens, output_tokens, thoughts_tokens) from ``usageMetadata``.
    ``thoughtsTokenCount`` (reasoning tokens, e.g. Gemini 4 Argon) is kept
    separate from ``candidatesTokenCount`` here — ``app/costs/tracking.py``
    is the one place that sums them for billing, per its own documented
    convention, not this client."""
    usage = payload.get("usageMetadata") or {}
    return (
        int(usage.get("promptTokenCount", 0) or 0),
        int(usage.get("candidatesTokenCount", 0) or 0),
        int(usage.get("thoughtsTokenCount", 0) or 0),
    )


async def generate_followup(
    *,
    question: str,
    answer: str,
    stage: str,
    interview_type: str,
    target_role: str | None,
    company_type: str | None,
    difficulty: str,
) -> FollowupResult:
    """Ask the conversation model (Gemini 2.5 Flash-Lite) whether this one
    answer deserves a single in-stage follow-up question.

    Formats ``prompts/interview_followup_v1.txt`` with the given fields and
    calls Gemini with JSON mode on. Raises ``GeminiError`` on any
    transport/HTTP failure, a blocked prompt/response, or a response that
    isn't the documented ``{"follow_up_question": ...}`` shape.
    """
    prompt = _FOLLOWUP_PROMPT_TEMPLATE.format(
        interview_type=interview_type,
        target_role=target_role or "unspecified",
        company_type=company_type or "unspecified",
        difficulty=difficulty,
        stage=stage,
        question=question,
        answer=answer,
    )
    payload = await _post_generate_content(
        api_base=_CONVERSATION["api_base"],
        path_template=_CONVERSATION["endpoint"],
        model_id=GEMINI_CONVERSATION_MODEL_ID,
        prompt=prompt,
    )
    parsed = _parse_json_object(_extract_candidate_text(payload))

    follow_up_question = parsed.get("follow_up_question")
    if follow_up_question is not None and not isinstance(follow_up_question, str):
        raise GeminiError(
            f"Gemini follow-up response has a non-string follow_up_question: {parsed!r}"
        )

    input_tokens, output_tokens, thoughts_tokens = _usage_tokens(payload)
    return FollowupResult(
        follow_up_question=follow_up_question,
        model_id=GEMINI_CONVERSATION_MODEL_ID,
        input_tokens=input_tokens,
        output_tokens=output_tokens,
        thoughts_tokens=thoughts_tokens,
        raw_response=payload,
    )


async def rewrite_resume_bullet(bullet: str) -> BulletRewriteResult:
    """Rewrite one resume bullet into "action verb + result" form, or ask
    for a metric if the bullet has none (BUILD_SPEC Part 4.3: "It must
    never invent numbers. If a bullet lacks a metric, it asks the student
    a specific question... and uses their answer.").

    Uses the same cheap conversation model as in-interview follow-ups
    (this is a short, low-stakes rewrite, not a reasoning task) — the
    anti-hallucination guarantee comes entirely from
    ``prompts/resume_bullet_rewrite_v1.txt``'s own rules plus a defensive
    post-check here: every digit in a "rewritten" response must already
    appear in the input bullet, or this raises rather than silently
    passing along an invented number. A student submitting the metric
    answer the UI asked for is just another call to this same function
    with that answer folded into the bullet text (apps/web's
    ``applyMetricAnswer`` does exactly that) — there is no separate
    "apply the metric" call on this side.
    """
    prompt = _BULLET_REWRITE_PROMPT_TEMPLATE.format(bullet=bullet)
    payload = await _post_generate_content(
        api_base=_CONVERSATION["api_base"],
        path_template=_CONVERSATION["endpoint"],
        model_id=GEMINI_CONVERSATION_MODEL_ID,
        prompt=prompt,
    )
    parsed = _parse_json_object(_extract_candidate_text(payload))

    kind = parsed.get("kind")
    text = parsed.get("text")
    question = parsed.get("question")
    if kind == "rewritten":
        if not isinstance(text, str) or not text.strip():
            raise GeminiError(f"Gemini bullet-rewrite response missing 'text' for kind=rewritten: {parsed!r}")
        _assert_no_invented_digits(original=bullet, rewritten=text)
        question = None
    elif kind == "needs_metric":
        if not isinstance(question, str) or not question.strip():
            raise GeminiError(f"Gemini bullet-rewrite response missing 'question' for kind=needs_metric: {parsed!r}")
        text = None
    else:
        raise GeminiError(f"Gemini bullet-rewrite response has an unknown 'kind': {parsed!r}")

    input_tokens, output_tokens, thoughts_tokens = _usage_tokens(payload)
    return BulletRewriteResult(
        kind=kind,
        text=text,
        question=question,
        model_id=GEMINI_CONVERSATION_MODEL_ID,
        input_tokens=input_tokens,
        output_tokens=output_tokens,
        thoughts_tokens=thoughts_tokens,
        raw_response=payload,
    )


def _assert_no_invented_digits(*, original: str, rewritten: str) -> None:
    """BUILD_SPEC Part 4.3's "must never invent numbers" is the one rule
    in this whole file enforced in code, not just in the prompt text — a
    prompt is a strong steer, not a guarantee, and a fabricated number on
    a resume is exactly the kind of invented claim BUILD_SPEC Part 1
    says this product may never produce. Digit-set containment (every
    digit character the rewrite uses must appear somewhere in the
    original) is a deliberately blunt check: it cannot catch a reordered
    digit sequence that reuses the same characters, but it reliably
    catches the real failure mode (a number that wasn't there at all),
    and a looser check would let that through."""
    original_digits = {ch for ch in original if ch.isdigit()}
    rewritten_digits = {ch for ch in rewritten if ch.isdigit()}
    if not rewritten_digits.issubset(original_digits):
        raise GeminiError(
            f"Gemini bullet rewrite introduced digits not present in the original bullet "
            f"(original={original!r}, rewritten={rewritten!r})"
        )


async def evaluate_interview(
    *,
    transcript_turns: list[dict[str, Any]],
    eye_contact_pct: float | None,
    posture_stability_pct: float | None,
    interview_type: str,
    target_role: str | None,
    company_type: str | None,
    difficulty: str,
) -> EvaluationResult:
    """Score a completed interview with the evaluation model (Gemini 4
    Argon, per ``app/config/models.yaml`` — ``configurable: true`` there
    means switching models is a one-line config edit for whoever runs the
    eval harness, per BUILD_SPEC Part 2's "configurable, chosen by the eval
    harness"; this client does not auto-retry a failed call against a
    different model itself — see ``docs/DECISIONS.md`` for why).

    ``transcript_turns`` is a list of ``{"turn_number", "stage", "question",
    "answer"}`` dicts (``app/interview/engine.py``'s own shape). Formats
    ``prompts/interview_evaluation_v1.txt`` with the full transcript and
    delivery aggregates, and calls Gemini with JSON mode on. Raises
    ``GeminiError`` on any transport/HTTP failure, a blocked prompt/
    response, or a response missing one of the documented fields.
    """
    transcript_json = json.dumps(
        [
            {
                "turn_number": turn.get("turn_number"),
                "stage": turn.get("stage"),
                "question": turn.get("question"),
                "answer": turn.get("answer"),
            }
            for turn in transcript_turns
        ],
        ensure_ascii=False,
        indent=2,
    )
    prompt = _EVALUATION_PROMPT_TEMPLATE.format(
        interview_type=interview_type,
        target_role=target_role or "unspecified",
        company_type=company_type or "unspecified",
        difficulty=difficulty,
        transcript_turns=transcript_json,
        eye_contact_pct="null" if eye_contact_pct is None else eye_contact_pct,
        posture_stability_pct="null" if posture_stability_pct is None else posture_stability_pct,
    )
    payload = await _post_generate_content(
        api_base=_EVALUATION["api_base"],
        path_template=_EVALUATION["endpoint"],
        model_id=GEMINI_EVALUATION_MODEL_ID,
        prompt=prompt,
    )
    parsed = _parse_json_object(_extract_candidate_text(payload))

    try:
        scores = dict(parsed["scores"])
        overall_score = float(parsed["overall_score"])
        strengths = list(parsed["strengths"])
        weak_areas = list(parsed["weak_areas"])
        practice_actions = list(parsed["practice_actions"])
    except (KeyError, TypeError, ValueError) as exc:
        raise GeminiError(
            f"Gemini evaluation response is missing/malformed a required field: {parsed!r}"
        ) from exc

    input_tokens, output_tokens, thoughts_tokens = _usage_tokens(payload)
    return EvaluationResult(
        scores=scores,
        overall_score=overall_score,
        strengths=strengths,
        weak_areas=weak_areas,
        practice_actions=practice_actions,
        model_id=GEMINI_EVALUATION_MODEL_ID,
        input_tokens=input_tokens,
        output_tokens=output_tokens,
        thoughts_tokens=thoughts_tokens,
        raw_response=payload,
    )


def _extract_embedding_values(payload: dict[str, Any]) -> list[float]:
    """Google's ``embedContent`` REST reference shows a singular
    ``{"embedding": {"values": [...]}}`` response, but this project's own
    provider research (``app/config/models.yaml``'s ``embedding`` entry,
    sourced from Google's embeddings doc page) describes the plural
    ``{"embeddings": [{"values": [...]}]}`` shape instead — which is also
    exactly what the official ``google-genai`` SDK's source was confirmed
    (by live, respx-mocked probing while building this client) to actually
    receive back from the direct, non-Vertex Developer API even when
    calling this same singular ``:embedContent`` path, because that SDK
    always issues the request as a one-item ``batchEmbedContents`` call
    for this API surface. Both shapes are accepted defensively here rather
    than picking one and guessing wrong against a real key later."""
    embedding = payload.get("embedding")
    if isinstance(embedding, dict) and "values" in embedding:
        return list(embedding["values"])
    embeddings = payload.get("embeddings")
    if isinstance(embeddings, list) and embeddings and "values" in embeddings[0]:
        return list(embeddings[0]["values"])
    raise GeminiError(f"Gemini embedContent response has no embedding(s): {payload!r}")


async def embed_text(text: str) -> list[float]:
    """Embed ``text`` with the configured Gemini embedding model, returning
    the raw vector only.

    Unlike ``generate_followup``/``evaluate_interview``, there is no
    usage_events-worthy token count to additionally hand back here: the
    public Gemini Developer API's ``embedContent`` response carries no
    ``usageMetadata`` at all (confirmed against the ``google-genai`` SDK's
    own response type, whose ``metadata`` field is documented as "Gemini
    Enterprise Agent Platform only" and is always empty on this API) — so a
    caller logging a usage_events row for this call has nothing more
    precise available than the model id (this module's
    ``GEMINI_EMBEDDING_MODEL_ID``) and ``len(text)``. This is a real gap for
    whoever wires up KB/chat embeddings and their cost accounting — flagged
    here and in this build's summary rather than silently estimated.

    Raises ``EmbeddingDimensionMismatchError`` if the returned vector's
    length doesn't match ``GEMINI_EMBEDDING_OUTPUT_DIMENSIONALITY`` — never
    silently truncated or padded, since ``kb_chunks.embedding`` is a fixed
    ``vector(768)`` column.
    """
    api_key = os.environ.get("GEMINI_API_KEY", "")
    url = f"{_EMBEDDING['api_base']}{_EMBEDDING['endpoint'].format(model=GEMINI_EMBEDDING_MODEL_ID)}"
    body = {
        "content": {"parts": [{"text": text}]},
        "outputDimensionality": GEMINI_EMBEDDING_OUTPUT_DIMENSIONALITY,
    }
    try:
        async with httpx.AsyncClient(timeout=_DEFAULT_TIMEOUT_SECONDS) as client:
            response = await client.post(url, headers=_auth_headers(api_key), json=body)
    except httpx.HTTPError as exc:
        raise GeminiError(f"Gemini embedContent request failed: {exc}") from exc

    if response.status_code != 200:
        raise GeminiError(
            f"Gemini embedContent returned HTTP {response.status_code}: {response.text}",
            status_code=response.status_code,
        )

    values = _extract_embedding_values(response.json())
    if len(values) != GEMINI_EMBEDDING_OUTPUT_DIMENSIONALITY:
        raise EmbeddingDimensionMismatchError(
            f"Gemini embedding returned {len(values)} dimensions, expected "
            f"{GEMINI_EMBEDDING_OUTPUT_DIMENSIONALITY}; refusing to truncate/pad."
        )
    return values
