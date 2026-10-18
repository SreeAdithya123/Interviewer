#!/usr/bin/env python3
"""Phase 1 cost/latency report for Vyoman Interviewer.

BUILD_SPEC.md Part 7, Phase 1 (the go/no-go gate) asks for a script that
prints, for all test interviews: cost per interview broken down by provider,
p50/p95 turn latency, and the STT fallback rate. This is that script.

It reads real rows from the live Supabase project's `usage_events` table
(feature='interview') via the same service-role credentials the real engine
uses (services/engine/.env's SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY), joins
in `interview_turns` by `interview_id` for latency/fallback numbers, and
never calls a paid provider API itself -- it only reads rows the real engine
already wrote.

Usage:
    python eval/cost_report.py                    # last 24 hours (default)
    python eval/cost_report.py --hours 48          # last 48 hours
    python eval/cost_report.py --since 2026-10-01T00:00:00Z --until 2026-10-18T00:00:00Z

Phase 1 has not been run for real yet (no provider keys exist in
services/engine/.env -- see services/engine/README.md), so `usage_events`
has zero feature='interview' rows today. Running this script against the
live, empty table should -- and does -- print an honest "no interviews
found" message and exit 0, rather than crash. Once real interviews exist,
output looks like this:

    Vyoman Interviewer -- Phase 1 cost/latency report
    Window: 2026-10-17T12:00:00+00:00 to 2026-10-18T12:00:00+00:00

    Interviews in window: 5

    Cost per interview (INR), broken down by provider:
      interview_id | gemini | groq | sarvam | total
      3fa85f64     | 3.90   | 2.10 | 6.30   | 12.30
      7c9e6679     | 4.20   | 1.95 | 7.10   | 13.25
      ...

      Mean cost per interview   : INR 13.02
      Median cost per interview : INR 12.80

    Mean cost per interview by provider:
      gemini    : INR 4.05
      groq      : INR 2.03
      sarvam    : INR 6.94

    Turn latency (interview_turns.latency_ms):
      p50: 1870 ms
      p95: 3420 ms
      n turns with latency recorded: 58 / 58

    STT fallback rate (interview_turns.stt_fallback_used):
      16 / 58 turns fell back to Sarvam -> 27.6%

    Target check (BUILD_SPEC.md Part 1 / Part 7 Phase 1):
      cost/interview < INR 15.00 : PASS (mean INR 13.02)
      p50 turn latency < 2500ms  : PASS (p50 1870 ms)
"""

from __future__ import annotations

import argparse
import math
import os
import statistics
import sys
from collections import defaultdict
from datetime import UTC, datetime, timedelta
from pathlib import Path
from typing import Any

try:
    from dotenv import load_dotenv
except ImportError:  # pragma: no cover - only hit on a truly bare interpreter
    load_dotenv = None

try:
    from supabase import create_client
except ImportError:  # pragma: no cover
    print(
        "Missing dependency: supabase-py is not installed.\n"
        "Install it with:  pip install -r eval/requirements.txt\n"
        "(or reuse services/engine/.venv, which already has it installed).",
        file=sys.stderr,
    )
    sys.exit(1)


REPO_ROOT = Path(__file__).resolve().parent.parent
ENGINE_ENV_PATH = REPO_ROOT / "services" / "engine" / ".env"

# BUILD_SPEC.md Part 1: "under ₹15 per 20-minute interview, all-in."
TARGET_COST_PAISE = 1500
# BUILD_SPEC.md Part 4.5: "Target per-turn latency ... p50 under 2.5s, p95 under 4s."
TARGET_P50_LATENCY_MS = 2500
TARGET_P95_LATENCY_MS = 4000
# BUILD_SPEC.md Part 7 Phase 1 acceptance: "at least 5 complete test interviews".
MIN_INTERVIEWS_FOR_GATE = 5


def load_credentials() -> tuple[str, str]:
    """Return (SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY).

    Prefers whatever is already in the process environment (e.g. CI secrets);
    otherwise falls back to services/engine/.env, the same file the real
    engine reads its own credentials from, so this script needs no separate
    configuration in the common case of running it on a dev machine.
    """
    url = os.environ.get("SUPABASE_URL")
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
    if (not url or not key) and load_dotenv is not None and ENGINE_ENV_PATH.exists():
        load_dotenv(ENGINE_ENV_PATH)
        url = url or os.environ.get("SUPABASE_URL")
        key = key or os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
    if not url or not key:
        print(
            "SUPABASE_URL and/or SUPABASE_SERVICE_ROLE_KEY are not set.\n"
            f"Expected them in the environment, or in {ENGINE_ENV_PATH}\n"
            "(the same real credentials the engine itself uses -- see "
            "services/engine/README.md).",
            file=sys.stderr,
        )
        sys.exit(1)
    return url, key


def _parse_iso(value: str) -> datetime:
    v = value.strip()
    if v.endswith("Z"):
        v = v[:-1] + "+00:00"
    dt = datetime.fromisoformat(v)
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=UTC)
    return dt


def parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument(
        "--hours",
        type=float,
        default=24.0,
        help="Look back this many hours from --until (default: 24). Ignored if --since is given.",
    )
    parser.add_argument(
        "--since",
        type=str,
        default=None,
        help="ISO 8601 start of the window, e.g. 2026-10-01T00:00:00Z. Overrides --hours.",
    )
    parser.add_argument(
        "--until",
        type=str,
        default=None,
        help="ISO 8601 end of the window (default: now).",
    )
    return parser.parse_args(argv)


def resolve_window(args: argparse.Namespace) -> tuple[datetime, datetime]:
    until = _parse_iso(args.until) if args.until else datetime.now(UTC)
    since = _parse_iso(args.since) if args.since else until - timedelta(hours=args.hours)
    return since, until


def percentile(values: list[float], pct: float) -> float | None:
    """Linear-interpolation percentile (same convention as numpy.percentile)."""
    if not values:
        return None
    s = sorted(values)
    if len(s) == 1:
        return s[0]
    k = (len(s) - 1) * (pct / 100.0)
    f, c = math.floor(k), math.ceil(k)
    if f == c:
        return s[int(k)]
    return s[f] * (c - k) + s[c] * (k - f)


def fetch_usage_events(client: Any, since: datetime, until: datetime) -> list[dict[str, Any]]:
    response = (
        client.table("usage_events")
        .select("id,interview_id,provider,cost_paise,created_at")
        .eq("feature", "interview")
        .gte("created_at", since.isoformat())
        .lte("created_at", until.isoformat())
        .execute()
    )
    return response.data or []


def fetch_turns(client: Any, interview_ids: list[str]) -> list[dict[str, Any]]:
    if not interview_ids:
        return []
    response = (
        client.table("interview_turns")
        .select("interview_id,latency_ms,stt_fallback_used")
        .in_("interview_id", interview_ids)
        .execute()
    )
    return response.data or []


def build_report(
    usage_rows: list[dict[str, Any]], turn_rows: list[dict[str, Any]]
) -> dict[str, Any]:
    cost_by_interview_provider: dict[str, dict[str, int]] = defaultdict(lambda: defaultdict(int))
    for row in usage_rows:
        interview_id = row.get("interview_id")
        if not interview_id:
            continue
        provider = row.get("provider") or "unknown"
        cost_by_interview_provider[interview_id][provider] += row.get("cost_paise") or 0

    interview_ids = sorted(cost_by_interview_provider.keys())
    total_per_interview = {
        iid: sum(cost_by_interview_provider[iid].values()) for iid in interview_ids
    }
    providers = sorted({p for per in cost_by_interview_provider.values() for p in per})
    provider_totals = {p: 0 for p in providers}
    for per in cost_by_interview_provider.values():
        for provider, cost in per.items():
            provider_totals[provider] += cost

    totals_list = [total_per_interview[iid] for iid in interview_ids]
    mean_cost_paise = sum(totals_list) / len(totals_list) if totals_list else None
    median_cost_paise = statistics.median(totals_list) if totals_list else None

    latencies = [r["latency_ms"] for r in turn_rows if r.get("latency_ms") is not None]
    fallback_flags = [
        bool(r["stt_fallback_used"]) for r in turn_rows if r.get("stt_fallback_used") is not None
    ]

    return {
        "n_interviews": len(interview_ids),
        "interview_ids": interview_ids,
        "cost_by_interview_provider": cost_by_interview_provider,
        "total_per_interview": total_per_interview,
        "providers": providers,
        "provider_totals": provider_totals,
        "mean_cost_paise": mean_cost_paise,
        "median_cost_paise": median_cost_paise,
        "p50_latency_ms": percentile(latencies, 50),
        "p95_latency_ms": percentile(latencies, 95),
        "n_turns": len(turn_rows),
        "n_turns_with_latency": len(latencies),
        "n_fallback": sum(1 for f in fallback_flags if f),
        "n_fallback_known": len(fallback_flags),
    }


def _paise_to_inr(paise: float) -> float:
    return paise / 100.0


def print_report(report: dict[str, Any]) -> None:
    n = report["n_interviews"]
    print(f"Interviews in window: {n}")
    print()

    print("Cost per interview (INR), broken down by provider:")
    header = ["interview_id"] + report["providers"] + ["total"]
    print("  " + " | ".join(header))
    for iid in report["interview_ids"]:
        per = report["cost_by_interview_provider"][iid]
        cells = (
            [iid[:8]]
            + [f"{_paise_to_inr(per.get(p, 0)):.2f}" for p in report["providers"]]
            + [f"{_paise_to_inr(report['total_per_interview'][iid]):.2f}"]
        )
        print("  " + " | ".join(cells))
    print()
    mean_inr = _paise_to_inr(report["mean_cost_paise"])
    median_inr = _paise_to_inr(report["median_cost_paise"])
    print(f"  Mean cost per interview   : INR {mean_inr:.2f}")
    print(f"  Median cost per interview : INR {median_inr:.2f}")
    print()

    print("Mean cost per interview by provider:")
    for p in report["providers"]:
        avg_inr = _paise_to_inr(report["provider_totals"][p]) / n
        print(f"  {p:10s}: INR {avg_inr:.2f}")
    print()

    print("Turn latency (interview_turns.latency_ms):")
    if report["n_turns_with_latency"]:
        print(f"  p50: {report['p50_latency_ms']:.0f} ms")
        print(f"  p95: {report['p95_latency_ms']:.0f} ms")
        print(
            f"  n turns with latency recorded: "
            f"{report['n_turns_with_latency']} / {report['n_turns']}"
        )
    else:
        print("  No turns with a recorded latency_ms yet.")
    print()

    print("STT fallback rate (interview_turns.stt_fallback_used):")
    if report["n_fallback_known"]:
        rate = 100.0 * report["n_fallback"] / report["n_fallback_known"]
        print(
            f"  {report['n_fallback']} / {report['n_fallback_known']} turns "
            f"fell back to Sarvam -> {rate:.1f}%"
        )
    else:
        print("  No turns recorded yet.")
    print()

    print("Target check (BUILD_SPEC.md Part 1 / Part 7 Phase 1):")
    cost_ok = report["mean_cost_paise"] is not None and report["mean_cost_paise"] < TARGET_COST_PAISE
    print(f"  cost/interview < INR 15.00 : {'PASS' if cost_ok else 'FAIL'} (mean INR {mean_inr:.2f})")
    if report["p50_latency_ms"] is not None:
        p50_ok = report["p50_latency_ms"] < TARGET_P50_LATENCY_MS
        print(
            f"  p50 turn latency < 2500ms  : {'PASS' if p50_ok else 'FAIL'} "
            f"(p50 {report['p50_latency_ms']:.0f} ms)"
        )
    else:
        print("  p50 turn latency < 2500ms  : no latency data yet")
    if n < MIN_INTERVIEWS_FOR_GATE:
        print()
        print(
            f"  Note: BUILD_SPEC.md Part 7 Phase 1 wants at least "
            f"{MIN_INTERVIEWS_FOR_GATE} complete test interviews before this "
            f"is a real go/no-go signal -- only {n} found in this window."
        )


def main(argv: list[str] | None = None) -> int:
    args = parse_args(argv)
    since, until = resolve_window(args)
    url, key = load_credentials()

    try:
        client = create_client(url, key)
    except Exception as exc:  # defensive: bad URL/key shape, network init, etc.
        print(f"Could not create the Supabase client: {exc}", file=sys.stderr)
        return 1

    print("Vyoman Interviewer -- Phase 1 cost/latency report")
    print(f"Window: {since.isoformat()} to {until.isoformat()}")
    print()

    try:
        usage_rows = fetch_usage_events(client, since, until)
    except Exception as exc:  # defensive: network error, RLS/auth error, etc.
        print(f"Query against usage_events failed: {exc}", file=sys.stderr)
        return 1

    if not usage_rows:
        print(
            "No interviews found in this time range.\n\n"
            "This is expected until Phase 1's provider keys exist in "
            "services/engine/.env and real interviews are run through "
            "GET /internal/test-interview -- see services/engine/README.md "
            "for exactly how to produce real usage_events rows, then re-run "
            "this script."
        )
        return 0

    interview_ids = sorted({row["interview_id"] for row in usage_rows if row.get("interview_id")})
    try:
        turn_rows = fetch_turns(client, interview_ids)
    except Exception as exc:  # defensive: don't let a turns-query failure hide real cost data
        print(
            f"Warning: query against interview_turns failed ({exc}); "
            "latency and STT-fallback numbers will be omitted below.",
            file=sys.stderr,
        )
        turn_rows = []

    report = build_report(usage_rows, turn_rows)
    print_report(report)
    return 0


if __name__ == "__main__":
    sys.exit(main())
