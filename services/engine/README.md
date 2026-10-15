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
