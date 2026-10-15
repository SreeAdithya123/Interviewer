"""FastAPI entrypoint for the Vyoman Interviewer engine service.

Phase 0 scope: project skeleton + health check only. Business logic for
interview, resume, chat, reports, providers, and costs lands in later phases.
"""

from fastapi import FastAPI

app = FastAPI(title="Vyoman Interviewer Engine")


@app.get("/health")
def health() -> dict[str, str]:
    """Liveness/readiness check used by Cloud Run and local tooling."""
    return {"status": "ok"}
