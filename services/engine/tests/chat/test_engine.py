"""Tests for app/chat/engine.py: chunking, vector similarity, knowledge base
embedding, and prep assistant RAG responses.
"""

from __future__ import annotations

import json
from unittest.mock import AsyncMock, patch

import pytest

from app.chat.engine import (
    ChatQuotaExhaustedError,
    DocumentNotFoundError,
    chunk_text,
    cosine_similarity,
    embed_and_save_document,
    respond_to_chat,
)
from app.providers.gemini import ChatReplyResult
from tests.interview.fakes import FakeClient


def test_chunk_text_empty() -> None:
    assert chunk_text("") == []
    assert chunk_text("   \n\n  ") == []


def test_chunk_text_short() -> None:
    text = "Short single paragraph about campus placements."
    chunks = chunk_text(text, chunk_size=500)
    assert len(chunks) == 1
    assert chunks[0] == text


def test_chunk_text_splits_paragraphs_with_overlap() -> None:
    p1 = "First paragraph discussing data structures and algorithms preparation."
    p2 = "Second paragraph covering dynamic programming and graph algorithms."
    p3 = "Third paragraph detailing system design fundamentals for junior roles."
    text = f"{p1}\n\n{p2}\n\n{p3}"
    chunks = chunk_text(text, chunk_size=90, overlap=20)
    assert len(chunks) >= 2
    assert p1 in chunks[0]
    assert p3 in chunks[-1]


def test_cosine_similarity() -> None:
    v1 = [1.0, 0.0, 0.0]
    v2 = [1.0, 0.0, 0.0]
    v3 = [0.0, 1.0, 0.0]
    v4 = [-1.0, 0.0, 0.0]

    assert abs(cosine_similarity(v1, v2) - 1.0) < 1e-6
    assert abs(cosine_similarity(v1, v3) - 0.0) < 1e-6
    assert abs(cosine_similarity(v1, v4) - (-1.0)) < 1e-6
    assert cosine_similarity([0.0, 0.0], [1.0, 1.0]) == 0.0
    assert cosine_similarity([], [1.0]) == 0.0


@pytest.mark.asyncio
async def test_embed_and_save_document_raises_on_missing_doc() -> None:
    fake_client = FakeClient()
    fake_client.tables["kb_documents"] = []
    with (
        patch("app.chat.engine.get_client", return_value=fake_client),
        pytest.raises(DocumentNotFoundError),
    ):
        await embed_and_save_document("non-existent-id")


@pytest.mark.asyncio
async def test_embed_and_save_document_success() -> None:
    doc_id = "doc-1"
    fake_client = FakeClient()
    fake_client.tables["kb_documents"] = [{
        "id": doc_id,
        "title": "Amazon Interview Guide",
        "category": "company_pattern",
        "company_name": "Amazon",
        "raw_text": "Amazon SDE interview pattern.\n\nLeadership principles are crucial.",
        "status": "draft",
    }]
    fake_client.tables["kb_chunks"] = []
    fake_client.tables["usage_events"] = []

    with (
        patch("app.chat.engine.get_client", return_value=fake_client),
        patch("app.chat.engine.gemini.embed_text", new=AsyncMock(return_value=[0.1] * 768)),
        patch("app.chat.engine.log_usage_event", new=AsyncMock()),
    ):
        result = await embed_and_save_document(doc_id, reviewer_id="admin-1")

    assert result["ok"] is True
    assert result["chunks_created"] >= 1
    assert len(fake_client.tables["kb_chunks"]) == result["chunks_created"]
    assert fake_client.tables["kb_documents"][0]["status"] == "reviewed"
    assert fake_client.tables["kb_documents"][0]["reviewed_by"] == "admin-1"


@pytest.mark.asyncio
async def test_respond_to_chat_declines_when_under_similarity_threshold() -> None:
    fake_client = FakeClient()
    fake_client.tables["chat_sessions"] = [{"id": "session-1", "user_id": "user-1"}]
    fake_client.tables["chat_messages"] = []
    fake_client.tables["weak_areas"] = []
    fake_client.tables["kb_chunks"] = [{
        "id": "c1",
        "document_id": "d1",
        "content": "Amazon SDE leadership principles.",
        "embedding": json.dumps([1.0, 0.0, 0.0]),
        "kb_documents": {
            "id": "d1",
            "title": "Amazon Guide",
            "category": "company_pattern",
            "company_name": "Amazon",
            "source_url": None,
            "status": "reviewed",
        },
    }]
    fake_client.tables["usage_events"] = []

    # Query vector orthogonal to stored vector -> similarity = 0.0 < SIMILARITY_THRESHOLD
    query_emb = [0.0, 1.0, 0.0]

    with (
        patch("app.chat.engine.get_client", return_value=fake_client),
        patch("app.chat.engine.gemini.embed_text", new=AsyncMock(return_value=query_emb)),
        patch("app.chat.engine.log_usage_event", new=AsyncMock()),
    ):
        result = await respond_to_chat(
            session_id="session-1",
            user_id="user-1",
            message="How do you make south Indian filter coffee?",
        )

    assert result["declined"] is True
    assert result["citations"] == []
    assert "reliable or verified information" in result["content"]
    assert "Amazon Guide" in result["content"]


@pytest.mark.asyncio
async def test_respond_to_chat_answers_and_cites_when_above_threshold() -> None:
    doc_id = "doc-amazon"
    fake_client = FakeClient()
    fake_client.tables["chat_sessions"] = [{"id": "session-1", "user_id": "user-1"}]
    fake_client.tables["chat_messages"] = []
    fake_client.tables["weak_areas"] = [{"user_id": "user-1", "skill": "Behavioral", "severity": "moderate", "notes": "STAR structure", "is_resolved": False}]
    fake_client.tables["kb_chunks"] = [{
        "id": "c1",
        "document_id": doc_id,
        "content": "Amazon tests 16 Leadership Principles such as Customer Obsession.",
        "embedding": json.dumps([1.0, 0.0, 0.0]),
        "kb_documents": {
            "id": doc_id,
            "title": "Amazon Interview Playbook",
            "category": "company_pattern",
            "company_name": "Amazon",
            "source_url": "https://example.com/amazon",
            "status": "reviewed",
        },
    }]
    fake_client.tables["usage_events"] = []

    # Query vector identical to stored chunk -> similarity = 1.0 >= SIMILARITY_THRESHOLD
    query_emb = [1.0, 0.0, 0.0]
    mock_reply = ChatReplyResult(
        content="Amazon tests Leadership Principles with STAR questions.",
        citations=[{"document_id": doc_id, "title": "Amazon Interview Playbook", "source_url": "https://example.com/amazon"}],
        model_id="gemini-3.5-flash-lite",
        input_tokens=100,
        output_tokens=30,
    )

    with (
        patch("app.chat.engine.get_client", return_value=fake_client),
        patch("app.chat.engine.gemini.embed_text", new=AsyncMock(return_value=query_emb)),
        patch("app.chat.engine.gemini.generate_chat_reply", new=AsyncMock(return_value=mock_reply)),
        patch("app.chat.engine.log_usage_event", new=AsyncMock()),
    ):
        result = await respond_to_chat(
            session_id="session-1",
            user_id="user-1",
            message="How are Amazon Leadership Principles tested?",
        )

    assert result["declined"] is False
    assert len(result["citations"]) == 1
    assert result["citations"][0]["document_id"] == doc_id
    assert result["citations"][0]["title"] == "Amazon Interview Playbook"
    assert "Amazon tests Leadership Principles" in result["content"]


@pytest.mark.asyncio
async def test_respond_to_chat_raises_on_quota_exhausted() -> None:
    fake_client = FakeClient()
    fake_client.tables["chat_sessions"] = [{"id": "session-1", "user_id": "user-1"}]
    fake_client.tables["chat_messages"] = [
        {"id": f"msg-{i}", "session_id": "session-1", "role": "user", "created_at": "2099-01-01T00:00:00Z"}
        for i in range(120)
    ]

    with (
        patch("app.chat.engine.get_client", return_value=fake_client),
        pytest.raises(ChatQuotaExhaustedError),
    ):
        await respond_to_chat(
            session_id="session-1",
            user_id="user-1",
            message="Hello",
        )
