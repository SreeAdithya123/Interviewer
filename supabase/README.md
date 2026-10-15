# Supabase

`config.toml` is a hand-authored placeholder until the `supabase` CLI is installed (`npm i -g supabase`, or via `scoop`/`brew`) and someone runs `supabase init` / `supabase link` for real.

`migrations/` has the schema and RLS policies (24 tables, per `docs/BUILD_SPEC.md` Part 5 and Part 4.1) — see `migrations/README.md` for the migration order and, importantly, for exactly what has and hasn't been verified: **none of this has been run against a live Postgres/Supabase instance yet**, since no Docker, local Postgres, or cloud Supabase project was reachable while it was written.

`seed/` (demo college, batches, students, question bank sample, KB sample) is still empty — not part of this round of work.
