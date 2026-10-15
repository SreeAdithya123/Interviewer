# Vyoman Interviewer

Vyoman Interviewer is an AI-powered interview practice platform that runs realistic, voice-driven mock interviews and gives candidates structured feedback.

This is a monorepo: `apps/web` is the Next.js frontend, `services/engine` is the FastAPI interview engine, `supabase/` holds the database schema and config, and `eval/` will hold the golden-set evaluation harness. See [`docs/BUILD_SPEC.md`](docs/BUILD_SPEC.md) for the full product and build spec, including the stack, repo layout, and data model. `reference/lovable-site/` is a copy of the founder's existing product kept for design reference only.

To run things locally:

```bash
cd apps/web && npm install && npm run dev
```

```bash
cd services/engine && pip install -r requirements-dev.txt && uvicorn app.main:app --reload --port 8000
```
