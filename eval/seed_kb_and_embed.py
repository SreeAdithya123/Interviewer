"""Seed knowledge base documents and generate embeddings into kb_chunks.

Reads the 10 curated documents from supabase/seed/002_knowledge_base_seed.sql
(or embeds existing reviewed kb_documents) and runs them through
app.chat.engine.embed_and_save_document.
"""

from __future__ import annotations

import asyncio
import os
import re
import sys
from pathlib import Path

# Add services/engine to sys.path so app.* imports resolve cleanly
engine_path = Path(__file__).resolve().parent.parent / "services" / "engine"
if str(engine_path) not in sys.path:
    sys.path.insert(0, str(engine_path))

from dotenv import load_dotenv

load_dotenv(engine_path / ".env")

from app.chat.engine import embed_and_save_document
from app.db import get_client


async def seed_and_embed_all() -> None:
    client = await get_client()
    seed_sql_path = Path(__file__).resolve().parent.parent / "supabase" / "seed" / "002_knowledge_base_seed.sql"
    sql_content = seed_sql_path.read_text(encoding="utf-8")

    # Extract insert values from the SQL file
    pattern = re.compile(
        r"\(\s*'([0-9a-fA-F-]+)',\s*'([^']+)',\s*'([^']+)',\s*(null|'[^']*'),\s*(null|'[^']*'),\s*'(.*?)',\s*'reviewed',\s*now\(\)\s*\)",
        re.DOTALL,
    )

    matches = pattern.findall(sql_content)
    print(f"Found {len(matches)} documents in seed file.")

    for m in matches:
        doc_id, title, category, company_name, source_url, raw_text = m
        company = None if company_name == "null" else company_name.strip("'")
        url = None if source_url == "null" else source_url.strip("'")
        text = raw_text.replace("''", "'")

        row = {
            "id": doc_id,
            "title": title,
            "category": category,
            "company_name": company,
            "source_url": url,
            "raw_text": text,
            "status": "draft",
        }
        await client.table("kb_documents").upsert(row, on_conflict="id").execute()
        print(f"Upserted doc: {title} ({doc_id})")

    # Now run embedding on all 10 documents
    docs_res = await client.table("kb_documents").select("id, title").execute()
    docs = docs_res.data or []
    print(f"\nEmbedding {len(docs)} documents...")

    total_chunks = 0
    for d in docs:
        doc_id = d["id"]
        title = d["title"]
        res = await embed_and_save_document(doc_id)
        chunks = res["chunks_created"]
        total_chunks += chunks
        print(f"  [OK] [{chunks} chunks] {title}")

    print(f"\nDone! Successfully embedded {len(docs)} documents into {total_chunks} total chunks.")


if __name__ == "__main__":
    asyncio.run(seed_and_embed_all())
