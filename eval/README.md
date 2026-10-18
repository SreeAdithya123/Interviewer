# Eval

This directory holds the evaluation/cost harness for Vyoman Interviewer, per `docs/BUILD_SPEC.md`.

- `cost_report.py` — the Phase 1 go/no-go report (BUILD_SPEC Part 7): cost per interview by provider, p50/p95 turn latency, and STT fallback rate, read from the live `usage_events`/`interview_turns` tables. See `services/engine/README.md`'s "Phase 1: running the cost/latency go/no-go test" section for how to run it. `requirements.txt` lists its (minimal) dependencies.
- The golden-set evaluation harness proper (Phase 7) is not built yet.
