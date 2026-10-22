"""Prep assistant and knowledge base engine module.

Handles:
1. Knowledge base document chunking and embedding generation (Gemini embedding-2)
   with cost tracking and persistence to `kb_chunks`.
2. Chat query embedding, cosine similarity vector search over reviewed KB chunks.
3. Personalization with student weak areas from `weak_areas`.
4. Strict threshold-based decline: if no relevant reviewed chunks exist above
   threshold, declines to answer and suggests covered topics (BUILD_SPEC Part 4.6).
5. Grounded LLM response generation with exact citations to source documents.
6. Monthly student message quota and rate limiting.
"""

from __future__ import annotations

import json
import math
import os
import re
from datetime import UTC, datetime
from typing import Any

from app.config.loader import load_models
from app.costs.tracking import compute_cost_paise, log_usage_event
from app.db import get_client
from app.providers import gemini
from app.providers.redis_client import check_and_increment_quota

SIMILARITY_THRESHOLD = 0.72
DEFAULT_MONTHLY_MESSAGE_CAP = 100
DEFAULT_CHUNK_SIZE = 600
DEFAULT_CHUNK_OVERLAP = 80


class DocumentNotFoundError(Exception):
    """The requested kb_document does not exist."""


class ChatQuotaExhaustedError(Exception):
    """The student has reached their monthly prep assistant message cap."""


class RateLimitExceededError(Exception):
    """Too many chat messages in a short window."""


def chunk_text(
    text: str,
    chunk_size: int = DEFAULT_CHUNK_SIZE,
    overlap: int = DEFAULT_CHUNK_OVERLAP,
) -> list[str]:
    """Split raw document text into overlapping chunks, respecting paragraphs
    and sentence boundaries where possible.
    """
    clean_text = text.strip()
    if not clean_text:
        return []

    if len(clean_text) <= chunk_size:
        return [clean_text]

    # Split into paragraphs first
    paragraphs = [p.strip() for p in re.split(r"\n\s*\n", clean_text) if p.strip()]
    chunks: list[str] = []
    current_chunk = ""

    for para in paragraphs:
        if not current_chunk:
            current_chunk = para
        elif len(current_chunk) + len(para) + 2 <= chunk_size:
            current_chunk += "\n\n" + para
        else:
            chunks.append(current_chunk)
            # If current_chunk is large, start next with overlap from the tail
            if len(current_chunk) > overlap:
                tail = current_chunk[-overlap:]
                current_chunk = tail + "\n\n" + para if len(tail) + len(para) + 2 <= chunk_size else para
            else:
                current_chunk = para

    if current_chunk and (not chunks or chunks[-1] != current_chunk):
        chunks.append(current_chunk)

    return chunks


def cosine_similarity(vec_a: list[float], vec_b: list[float]) -> float:
    """Compute cosine similarity between two float vectors."""
    if not vec_a or not vec_b or len(vec_a) != len(vec_b):
        return 0.0
    dot = sum(x * y for x, y in zip(vec_a, vec_b))
    norm_a = math.sqrt(sum(x * x for x in vec_a))
    norm_b = math.sqrt(sum(y * y for y in vec_b))
    if norm_a == 0.0 or norm_b == 0.0:
        return 0.0
    return dot / (norm_a * norm_b)


async def embed_and_save_document(
    document_id: str,
    reviewer_id: str | None = None,
) -> dict[str, Any]:
    """Approve, chunk, embed, and index one knowledge base document (BUILD_SPEC Part 4.8).

    1. Reads `kb_documents` row.
    2. Chunks `raw_text`.
    3. Calls `gemini.embed_text` per chunk and writes real `usage_events` rows.
    4. Replaces any existing `kb_chunks` for this document with the new embeddings.
    5. Sets `kb_documents.status = 'reviewed'`, `reviewed_by`, and `reviewed_at`.
    """
    client = await get_client()
    doc_res = (
        await client.table("kb_documents")
        .select("id, title, category, company_name, raw_text, status")
        .eq("id", document_id)
        .execute()
    )
    if not doc_res.data:
        raise DocumentNotFoundError(f"Knowledge base document {document_id!r} not found.")

    doc = doc_res.data[0]
    chunks = chunk_text(doc["raw_text"])
    models_config = load_models()
    embedding_model_id = models_config["embedding"]["model_id"]

    chunk_rows: list[dict[str, Any]] = []
    for idx, chunk in enumerate(chunks):
        embedding = await gemini.embed_text(chunk)
        token_count = max(1, len(chunk) // 4)
        cost_paise = compute_cost_paise(
            provider="gemini",
            model=embedding_model_id,
            units={"input_tokens": token_count},
        )
        await log_usage_event(
            feature="embedding",
            provider="gemini",
            model=embedding_model_id,
            units={"input_tokens": token_count, "text_chars": len(chunk)},
            cost_paise=cost_paise,
            user_id=reviewer_id,
        )
        chunk_rows.append(
            {
                "document_id": document_id,
                "chunk_index": idx,
                "content": chunk,
                "embedding": embedding,
                "token_count": token_count,
            }
        )

    # Delete any existing chunks for this document first
    await client.table("kb_chunks").delete().eq("document_id", document_id).execute()

    if chunk_rows:
        await client.table("kb_chunks").insert(chunk_rows).execute()

    now_iso = datetime.now(UTC).isoformat()
    update_data: dict[str, Any] = {
        "status": "reviewed",
        "reviewed_at": now_iso,
    }
    if reviewer_id:
        update_data["reviewed_by"] = reviewer_id

    await client.table("kb_documents").update(update_data).eq("id", document_id).execute()

    return {
        "ok": True,
        "document_id": document_id,
        "chunks_created": len(chunk_rows),
    }


async def _check_monthly_quota(client: Any, user_id: str) -> None:
    """Enforce monthly student message cap (BUILD_SPEC Part 4.6)."""
    now = datetime.now(UTC)
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0).isoformat()

    # Query count of user messages sent this month
    sessions_res = await client.table("chat_sessions").select("id").eq("user_id", user_id).execute()
    if not sessions_res.data:
        return

    session_ids = [s["id"] for s in sessions_res.data]
    count_res = (
        await client.table("chat_messages")
        .select("id", count="exact")
        .in_("session_id", session_ids)
        .eq("role", "user")
        .gte("created_at", month_start)
        .execute()
    )
    sent_count = count_res.count or 0
    if sent_count >= DEFAULT_MONTHLY_MESSAGE_CAP:
        raise ChatQuotaExhaustedError(
            f"You have reached your monthly message cap ({DEFAULT_MONTHLY_MESSAGE_CAP} messages) "
            "for the placement prep assistant. Please practice interviews or check back next month."
        )


async def respond_to_chat(
    session_id: str,
    user_id: str,
    message: str,
    college_id: str | None = None,
) -> dict[str, Any]:
    """Retrieve verified knowledge base chunks, personalize with student weak
    areas, and generate a grounded answer with citations or decline if below
    similarity threshold (BUILD_SPEC Part 4.6).
    """
    client = await get_client()

    # 1. Rate limit & monthly quota check
    if os.environ.get("UPSTASH_REDIS_REST_URL") and os.environ.get("UPSTASH_REDIS_REST_TOKEN"):
        allowed = await check_and_increment_quota(
            f"ratelimit:chat:{user_id}",
            limit=25,
            window_seconds=60,
        )
        if not allowed:
            raise RateLimitExceededError("Too many chat messages. Please wait a moment before trying again.")

    await _check_monthly_quota(client, user_id)

    # 2. Get student's open weak areas for personalization
    weak_res = (
        await client.table("weak_areas")
        .select("skill, severity, notes")
        .eq("user_id", user_id)
        .eq("is_resolved", False)
        .execute()
    )
    weak_areas = weak_res.data or []

    # 3. Embed student's query
    query_embedding = await gemini.embed_text(message)
    models_config = load_models()
    embedding_model_id = models_config["embedding"]["model_id"]
    query_tokens = max(1, len(message) // 4)
    cost_paise = compute_cost_paise(
        provider="gemini",
        model=embedding_model_id,
        units={"input_tokens": query_tokens},
    )
    await log_usage_event(
        feature="embedding",
        provider="gemini",
        model=embedding_model_id,
        units={"input_tokens": query_tokens},
        cost_paise=cost_paise,
        user_id=user_id,
        college_id=college_id,
        chat_session_id=session_id,
    )

    # 4. Fetch reviewed kb_chunks and join with kb_documents
    chunks_res = (
        await client.table("kb_chunks")
        .select("id, document_id, chunk_index, content, embedding, kb_documents!inner(id, title, category, company_name, source_url, status)")
        .eq("kb_documents.status", "reviewed")
        .execute()
    )

    chunks_data = chunks_res.data or []
    scored_chunks: list[dict[str, Any]] = []

    for item in chunks_data:
        raw_emb = item.get("embedding")
        if not raw_emb:
            continue
        if isinstance(raw_emb, str):
            try:
                emb_vec = json.loads(raw_emb)
            except (json.JSONDecodeError, TypeError):
                continue
        elif isinstance(raw_emb, list):
            emb_vec = raw_emb
        else:
            continue

        sim = cosine_similarity(query_embedding, emb_vec)
        scored_chunks.append({
            "chunk_id": item["id"],
            "document_id": item["document_id"],
            "document_title": item["kb_documents"]["title"],
            "document_category": item["kb_documents"]["category"],
            "source_url": item["kb_documents"]["source_url"],
            "content": item["content"],
            "similarity": sim,
        })

    scored_chunks.sort(key=lambda x: x["similarity"], reverse=True)
    top_chunks = [c for c in scored_chunks if c["similarity"] >= SIMILARITY_THRESHOLD][:4]

    # 5. Threshold-based branch: decline if nothing meets the similarity threshold
    if not top_chunks:
        # Collect available reviewed document titles to suggest relevant topics
        distinct_titles = sorted({c["document_title"] for c in scored_chunks})[:6]
        content = (
            "I don't have reliable or verified information on that topic in our curated placement knowledge base.\n\n"
            "To keep all placement guidance accurate and trustworthy, I only answer from verified senior experiences, "
            "company patterns, and approved college placement resources."
        )
        if distinct_titles:
            content += "\n\n**Here are topics I do cover and can help you with:**\n" + "\n".join(
                f"- {title}" for title in distinct_titles
            )

        # Write assistant message to chat_messages
        await client.table("chat_messages").insert({
            "session_id": session_id,
            "role": "assistant",
            "content": content,
            "citations": [],
            "declined": True,
            "model_id": gemini.GEMINI_CONVERSATION_MODEL_ID,
        }).execute()

        return {
            "content": content,
            "citations": [],
            "declined": True,
            "model_id": gemini.GEMINI_CONVERSATION_MODEL_ID,
        }

    # 6. Relevant chunks found: call conversation model for grounded reply with citations
    chat_result = await gemini.generate_chat_reply(
        question=message,
        context_chunks=top_chunks,
        weak_areas=weak_areas,
    )

    conv_cost = compute_cost_paise(
        provider="gemini",
        model=chat_result.model_id,
        units={
            "input_tokens": chat_result.input_tokens,
            "output_tokens": chat_result.output_tokens,
            "thoughts_tokens": chat_result.thoughts_tokens,
        },
    )
    await log_usage_event(
        feature="chat_message",
        provider="gemini",
        model=chat_result.model_id,
        units={
            "input_tokens": chat_result.input_tokens,
            "output_tokens": chat_result.output_tokens,
            "thoughts_tokens": chat_result.thoughts_tokens,
        },
        cost_paise=conv_cost,
        user_id=user_id,
        college_id=college_id,
        chat_session_id=session_id,
    )

    # Validate and filter citations so they strictly reference the retrieved documents
    valid_doc_map = {c["document_id"]: c for c in top_chunks}
    valid_title_map = {c["document_title"].lower(): c for c in top_chunks}
    clean_citations: list[dict[str, Any]] = []
    seen_ids: set[str] = set()

    for cit in chat_result.citations:
        doc_id = cit.get("document_id")
        title = cit.get("title", "")
        matched = valid_doc_map.get(doc_id) or valid_title_map.get(title.lower())
        if matched and matched["document_id"] not in seen_ids:
            seen_ids.add(matched["document_id"])
            clean_citations.append({
                "document_id": matched["document_id"],
                "title": matched["document_title"],
                "source_url": matched["source_url"],
            })

    # Ensure at least the top matching source is cited if the model was sparse
    if not clean_citations and top_chunks:
        clean_citations.append({
            "document_id": top_chunks[0]["document_id"],
            "title": top_chunks[0]["document_title"],
            "source_url": top_chunks[0]["source_url"],
        })

    # Write assistant message to chat_messages
    await client.table("chat_messages").insert({
        "session_id": session_id,
        "role": "assistant",
        "content": chat_result.content,
        "citations": clean_citations,
        "declined": False,
        "model_id": chat_result.model_id,
    }).execute()

    return {
        "content": chat_result.content,
        "citations": clean_citations,
        "declined": False,
        "model_id": chat_result.model_id,
    }
