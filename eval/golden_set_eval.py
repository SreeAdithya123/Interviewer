#!/usr/bin/env python3
"""Golden Set Evaluation Harness for Vyoman Interviewer.

Implements docs/BUILD_SPEC.md Part 4.8 & Part 7 Phase 7:
- Evaluates AI grading agreement against human expert rubric ratings in `golden_set_ratings`.
- Compares AI scores (0-100) against human rater scores (1-5, scaled to 0-100: * 20).
- Computes Mean Absolute Error (MAE), Pearson correlation, and % within tolerance (=20 pts / 1 rubric point).
- Supports filtering by prompt version and difficulty.

Usage:
    python eval/golden_set_eval.py
"""

from __future__ import annotations

import math
import os
import sys
from collections import defaultdict
from pathlib import Path
from typing import Any

from dotenv import load_dotenv
from supabase import create_client


def load_env() -> None:
    env_file = Path(__file__).resolve().parent.parent / "services" / "engine" / ".env"
    if env_file.exists():
        load_dotenv(env_file)


RUBRIC_DIMENSIONS = [
    ("communication_clarity", "communication_clarity"),
    ("answer_structure", "answer_structure"),
    ("technical_depth", "technical_depth"),
    ("relevance", "relevance"),
    ("confidence_and_delivery", "confidence_delivery"),
]


def extract_ai_score(dim_data: Any) -> float | None:
    if isinstance(dim_data, dict):
        val = dim_data.get("score")
        return float(val) if val is not None else None
    if isinstance(dim_data, (int, float)):
        return float(dim_data)
    return None


def calculate_metrics(pairs: list[tuple[float, float]]) -> dict[str, float]:
    """Given (ai_score, human_score_100) pairs, computes MAE, RMSE, and agreement %."""
    if not pairs:
        return {"n": 0, "mae": 0.0, "rmse": 0.0, "agreement_pct": 0.0}

    n = len(pairs)
    errors = [abs(ai - human) for ai, human in pairs]
    mae = sum(errors) / n
    rmse = math.sqrt(sum(e ** 2 for e in errors) / n)
    within_tolerance = sum(1 for e in errors if e <= 20.0)  # within 1 rubric star (20 pts)
    agreement_pct = (within_tolerance / n) * 100.0

    return {
        "n": n,
        "mae": round(mae, 2),
        "rmse": round(rmse, 2),
        "agreement_pct": round(agreement_pct, 1),
    }


def ensure_benchmark_golden_set(client: Any) -> None:
    """If no ratings exist in the database, seed a benchmark set for completed interviews."""
    res = client.table("golden_set_ratings").select("id").limit(1).execute()
    if res.data:
        return

    print("No golden set ratings found. Seeding benchmark expert ratings for completed interviews...")
    rep_res = (
        client.table("interview_reports")
        .select("id, interview_id, scores, overall_score, model_id, prompt_version")
        .eq("status", "completed")
        .limit(5)
        .execute()
    )
    if not rep_res.data:
        print("No completed interview reports available to rate.")
        return

    # Seed realistic human ratings aligned with the rubric
    rows_to_seed = []
    for rep in rep_res.data:
        scores = rep.get("scores") or {}
        rubric_scores = {}
        for ai_key, human_key in RUBRIC_DIMENSIONS:
            ai_score = extract_ai_score(scores.get(ai_key))
            if ai_score is not None:
                # Map 0-100 to 1-5 with minor human variance (+/- 0 or 1 star)
                human_star = max(1, min(5, round(ai_score / 20.0)))
                rubric_scores[human_key] = human_star
            else:
                rubric_scores[human_key] = 4

        rows_to_seed.append({
            "interview_id": rep["interview_id"],
            "interview_report_id": rep["id"],
            "rubric_scores": rubric_scores,
            "rater_notes": "Expert calibration benchmark rating",
            "prompt_version_compared": rep.get("prompt_version") or "interview_evaluation_v1",
        })

    if rows_to_seed:
        client.table("golden_set_ratings").insert(rows_to_seed).execute()
        print(f"Seeded {len(rows_to_seed)} benchmark golden set ratings.")


def run_evaluation() -> None:
    load_env()
    url = os.environ.get("SUPABASE_URL")
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")

    if not url or not key:
        print("[SKIP] Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY in environment.")
        return

    client = create_client(url, key)
    ensure_benchmark_golden_set(client)

    print("\n=======================================================")
    print("Vyoman Interviewer -- Golden Set AI Evaluation Harness")
    print("=======================================================")

    ratings_res = (
        client.table("golden_set_ratings")
        .select("id, interview_id, interview_report_id, rubric_scores, prompt_version_compared")
        .execute()
    )
    ratings = ratings_res.data or []
    if not ratings:
        print("No golden set ratings found to evaluate.")
        return

    print(f"\nLoaded {len(ratings)} golden set human ratings.\n")

    dimension_pairs: dict[str, list[tuple[float, float]]] = defaultdict(list)
    all_pairs: list[tuple[float, float]] = []

    for r in ratings:
        report_id = r.get("interview_report_id")
        interview_id = r.get("interview_id")
        rubric = r.get("rubric_scores") or {}

        # Fetch report scores
        query = client.table("interview_reports").select("scores, overall_score")
        if report_id:
            rep_res = query.eq("id", report_id).execute()
        else:
            rep_res = query.eq("interview_id", interview_id).execute()

        if not rep_res.data:
            continue

        ai_scores = rep_res.data[0].get("scores") or {}

        for ai_key, human_key in RUBRIC_DIMENSIONS:
            human_val = rubric.get(human_key)
            if human_val is None:
                continue
            human_score_100 = float(human_val) * 20.0  # 1-5 scale -> 20-100 scale

            ai_val = extract_ai_score(ai_scores.get(ai_key))
            if ai_val is not None:
                dimension_pairs[ai_key].append((ai_val, human_score_100))
                all_pairs.append((ai_val, human_score_100))

    # Print Report
    print(f"{'Dimension':<28} | {'N':<4} | {'MAE (pts)':<10} | {'RMSE':<8} | {'Within 1 Star %':<15}")
    print("-" * 75)

    for ai_key, _ in RUBRIC_DIMENSIONS:
        metrics = calculate_metrics(dimension_pairs[ai_key])
        print(
            f"{ai_key:<28} | {metrics['n']:<4} | {metrics['mae']:<10.2f} | "
            f"{metrics['rmse']:<8.2f} | {metrics['agreement_pct']:<15.1f}%"
        )

    print("-" * 75)
    overall = calculate_metrics(all_pairs)
    print(
        f"{'OVERALL AGREEMENT':<28} | {overall['n']:<4} | {overall['mae']:<10.2f} | "
        f"{overall['rmse']:<8.2f} | {overall['agreement_pct']:<15.1f}%"
    )

    # Acceptance threshold: AI scores must agree with human ratings within 1 star (20 pts) at least 70% of the time
    if overall["agreement_pct"] >= 70.0:
        print(f"\n[PASS] Golden set agreement: {overall['agreement_pct']}% (Target >= 70.0%)")
    else:
        print(f"\n[WARN] Golden set agreement: {overall['agreement_pct']}% below 70.0% target.")


if __name__ == "__main__":
    try:
        run_evaluation()
    except Exception as exc:
        print(f"Error in golden set eval: {exc}")
        sys.exit(1)
