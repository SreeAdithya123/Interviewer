# Vyoman Interviewer — Engine Service

FastAPI engine service. Phase 0 scope: project skeleton + a working health
check (`GET /health`). Business logic for interview/resume/chat/reports/
providers/costs is added in later phases.

## Requirements

- Python 3.12+ (3.13 also works)

## Setup

From `services/engine/`:

```bash
python -m venv .venv
```

Activate the virtual environment:

```bash
# macOS/Linux
source .venv/bin/activate

# Windows (PowerShell)
.venv\Scripts\Activate.ps1

# Windows (Git Bash)
source .venv/Scripts/activate
```

Install dependencies:

```bash
pip install -r requirements-dev.txt
```

(`requirements-dev.txt` pulls in `requirements.txt` plus `pytest`, `httpx`,
and `ruff`. For a production install, use `pip install -r requirements.txt`
only.)

## Run the dev server

```bash
uvicorn app.main:app --reload --port 8000
```

Then check:

```bash
curl http://localhost:8000/health
# {"status":"ok"}
```

## Run tests

```bash
pytest
```

## Lint

```bash
ruff check .
```

## Docker

```bash
docker build -t vyoman-engine .
docker run -p 8080:8080 vyoman-engine
```

Cloud Run sets `$PORT` (default 8080); the container's `CMD` reads it.

## Phase 1: running the cost/latency go/no-go test

BUILD_SPEC.md Part 7 Phase 1 is a go/no-go gate: at least 5 complete real
interviews, then a cost/latency report compared against the targets in
BUILD_SPEC.md Part 1 (under ₹15/interview, p50 turn latency under 2.5s).
None of this can run until the provider keys below exist — until then,
`eval/cost_report.py` will honestly report "no interviews found", which is
expected, not a bug.

1. **Fill in the provider keys in `services/engine/.env`** (copy from
   `.env.example` if you don't have a `.env` yet). `SUPABASE_URL` and
   `SUPABASE_SERVICE_ROLE_KEY` are already set for the live project; what's
   still empty and blocks this phase is `GROQ_API_KEY`, `SARVAM_API_KEY`,
   `GEMINI_API_KEY`, `R2_ACCOUNT_ID`/`R2_ACCESS_KEY_ID`/`R2_SECRET_ACCESS_KEY`,
   and `UPSTASH_REDIS_REST_URL`/`UPSTASH_REDIS_REST_TOKEN`.
2. **Start the engine** the normal way (see "Run the dev server" above):
   `uvicorn app.main:app --reload --port 8000`.
3. **Open `http://localhost:8000/internal/test-interview`** in a browser.
   This is a plain, unstyled internal page (not part of `apps/web`, the real
   product) that drives one real interview end to end through the engine's
   real HTTP routes — create, start, record-and-submit each turn, finish,
   and poll the report — with basic browser audio recording
   (`MediaRecorder`). It is gated off when `ENVIRONMENT=production`.
   Click through it **5 times** to produce 5 complete interviews. You can
   record real answers yourself, or generate synthetic test audio for the
   others (BUILD_SPEC.md Part 7 explicitly allows this: "I will do some
   myself; you can generate synthetic audio for others") — the simplest
   synthetic options are a short TTS-generated WAV/WebM clip (any TTS, it
   doesn't need to be Sarvam) or even a few seconds of silence, either of
   which lets a script click through the same page's `fetch()` calls
   without a human or a real microphone.
4. **Run the report**:
   ```bash
   python eval/cost_report.py
   ```
   (or, from the repo root, `services/engine/.venv/Scripts/python.exe
   eval/cost_report.py` on Windows / `services/engine/.venv/bin/python
   eval/cost_report.py` on macOS/Linux — the engine's own virtualenv already
   has everything this script needs; see `eval/requirements.txt` if you'd
   rather run it from a separate one). It defaults to the last 24 hours;
   pass `--hours N` or `--since`/`--until` (ISO 8601) to widen the window.
5. Compare the printed cost-per-interview and p50/p95 latency numbers
   against the ₹15 / 2.5s targets and report the real result — that
   comparison is the actual Phase 1 checkpoint, per BUILD_SPEC.md Part 7.
