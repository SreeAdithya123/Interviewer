"""Evaluation harness for Phase 6: Prep assistant knowledge retrieval and grounding.

Acceptance criteria (BUILD_SPEC Part 7 Phase 6):
"On a test set of 20 questions (10 covered by the KB, 10 not covered), it cites
correct sources for the covered ones and declines the uncovered ones without
inventing an answer."
"""

from __future__ import annotations

import asyncio
import json
import sys
import uuid
from pathlib import Path

# Add services/engine to path
engine_path = Path(__file__).resolve().parent.parent / "services" / "engine"
if str(engine_path) not in sys.path:
    sys.path.insert(0, str(engine_path))

from dotenv import load_dotenv

load_dotenv(engine_path / ".env")

from app.chat.engine import respond_to_chat
from app.db import get_client


async def run_evaluation() -> bool:
    test_set_path = Path(__file__).resolve().parent / "prep_assistant_test_set.json"
    questions = json.loads(test_set_path.read_text(encoding="utf-8"))

    client = await get_client()

    # Get a real profile to reference for the test session
    profiles_res = await client.table("profiles").select("id, college_id").limit(1).execute()
    assert profiles_res.data, "No profile found in live DB to run eval against."
    user_id = profiles_res.data[0]["id"]
    college_id = profiles_res.data[0].get("college_id")

    # Create a scratch chat session for this eval run
    session_res = (
        await client.table("chat_sessions")
        .insert({
            "user_id": user_id,
            "college_id": college_id,
            "title": f"Eval Test Run {uuid.uuid4().hex[:8]}",
        })
        .execute()
    )
    session_id = session_res.data[0]["id"]
    print(f"Created eval chat session: {session_id}")

    results = []
    all_passed = True

    print(f"\nRunning {len(questions)} evaluation questions (10 covered, 10 uncovered)...\n")

    try:
        for idx, item in enumerate(questions, 1):
            q_id = item["id"]
            question = item["question"]
            is_covered = item["covered"]
            expected_title = item.get("expected_doc_title")

            reply = await respond_to_chat(
                session_id=session_id,
                user_id=user_id,
                message=question,
                college_id=college_id,
            )

            passed = False
            details = ""

            if is_covered:
                # Should NOT be declined, must have citations, and citation must match expected document
                has_citations = len(reply.get("citations", [])) > 0
                cited_titles = [c.get("title", "") for c in reply.get("citations", [])]
                title_matched = any(expected_title.lower() in t.lower() or t.lower() in expected_title.lower() for t in cited_titles)
                declined = reply.get("declined", False)

                if not declined and has_citations and title_matched:
                    passed = True
                    details = f"Citations: {cited_titles}"
                else:
                    passed = False
                    details = f"Failed (declined={declined}, has_cit={has_citations}, title_match={title_matched}, cited={cited_titles})"
            else:
                # Uncovered questions MUST be declined with zero citations
                declined = reply.get("declined", False)
                citations = reply.get("citations", [])
                if declined and len(citations) == 0:
                    passed = True
                    details = "Correctly declined without citations"
                else:
                    passed = False
                    details = f"Failed (declined={declined}, citations_len={len(citations)})"

            if not passed:
                all_passed = False

            status_str = "[PASS]" if passed else "[FAIL]"
            category = "Covered" if is_covered else "Uncovered"
            print(f"[{idx:02d}/20] {status_str} ({category}) {q_id}: {question[:60]}...")
            print(f"       Outcome: {details}")

            results.append({
                "id": q_id,
                "category": category,
                "question": question,
                "passed": passed,
                "details": details,
            })
            await asyncio.sleep(1.0)

    finally:
        # Clean up scratch session and its messages
        await client.table("chat_sessions").delete().eq("id", session_id).execute()
        print(f"\nCleaned up scratch session {session_id}.")

    # Summary table
    passed_count = sum(1 for r in results if r["passed"])
    covered_passed = sum(1 for r in results if r["passed"] and r["category"] == "Covered")
    uncovered_passed = sum(1 for r in results if r["passed"] and r["category"] == "Uncovered")

    print("\n" + "=" * 70)
    print("EVALUATION SUMMARY")
    print("=" * 70)
    print(f"Total:            {passed_count} / {len(questions)} passed ({passed_count / len(questions) * 100:.1f}%)")
    print(f"Covered (10):     {covered_passed} / 10 passed")
    print(f"Uncovered (10):   {uncovered_passed} / 10 passed")
    print("=" * 70)

    return all_passed


if __name__ == "__main__":
    success = asyncio.run(run_evaluation())
    sys.exit(0 if success else 1)
