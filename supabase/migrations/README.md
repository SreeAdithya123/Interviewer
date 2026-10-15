# Migrations

This directory is the Postgres/Supabase schema for Vyoman Interviewer, written against `docs/BUILD_SPEC.md` Part 5 (data model) and Part 4.1 (roles and tenancy). It applies in filename order (Supabase's `<YYYYMMDDHHMMSS>_<name>.sql` convention):

| # | File | Tables | Notes |
|---|---|---|---|
| 1 | `20261015120001_core_tenancy.sql` | `colleges`, `batches`, `profiles`, `invitations` | Enables `pgcrypto`; defines the shared `set_updated_at()` trigger function, the `auth.users` → `profiles` bootstrap trigger (`handle_new_user`), and the role/college/batch self-escalation guard (`guard_profile_privilege_columns`). |
| 2 | `20261015120002_resume.sql` | `resumes`, `job_descriptions`, `resume_scans` | |
| 3 | `20261015120003_interview.sql` | `question_bank`, `interview_templates`, `interviews`, `interview_turns`, `interview_reports`, `weak_areas` | |
| 4 | `20261015120004_knowledge_base_and_chat.sql` | `kb_documents`, `kb_chunks`, `chat_sessions`, `chat_messages` | Enables the `vector` extension; `kb_chunks.embedding` is `vector(768)` (current Gemini text-embedding dimension) with an HNSW cosine index. |
| 5 | `20261015120005_billing_and_ops.sql` | `usage_events`, `plans`, `quotas`, `tts_cache`, `payments` | |
| 6 | `20261015120006_misc.sql` | `demo_requests`, `golden_set_ratings` | |
| 7 | `20261015120007_row_level_security.sql` | — | Helper functions (`current_user_role()`, `current_user_college_id()`, `is_platform_admin()`, `is_college_admin()`, plus a few parent-lookup helpers) and every `CREATE POLICY`, plus hardening grants for the tables that intentionally have no RLS. |

All 24 tables named in BUILD_SPEC Part 5 exist, once, across files 1–6 (verified by grepping `create table public\.` and diffing against the spec's list — see the session's report for the exact command). Row level security (`ALTER TABLE ... ENABLE ROW LEVEL SECURITY`) is on for the 18 tables that hold user- or college-scoped data; the remaining 6 (`question_bank`, `interview_templates`, `kb_documents`, `kb_chunks`, `plans`, `tts_cache`) are platform-curated or public reference data and are deliberately excluded per Part 4.1 — migration 7's header and footer comments explain each one's access model (grants/revokes) instead.

## What this is, and isn't

**This schema has never been applied to a real Postgres or Supabase instance.** There was no Docker, no local Postgres, and no cloud Supabase project reachable for this project in the environment this was written in, so none of the following has happened yet:

- Running `supabase db push` / `supabase migration up` against a real database.
- Running the Part 2 Phase 2 acceptance check: "RLS tests proving a student cannot read another student's data and a college admin cannot read another college's data."
- Confirming pgvector's `hnsw` index type, `gen_random_uuid()`/`gen_random_bytes()` from `pgcrypto`, or any other extension-provided function actually behaves as expected on the target Postgres version.
- Confirming the `auth.users` → `profiles` trigger fires correctly for both email-OTP and Google sign-in on a real Supabase Auth setup.

**What was done instead**, to catch what a static review can catch without a database:

- A line-by-line manual read of every statement in every file, checking parentheses/quoting/semicolons, column types, `CHECK` constraints, foreign keys and their `ON DELETE` behavior, and cross-file ordering (every `references public.X` targets a table created in the same file or an earlier-numbered one — verified by script, not just by eye).
- A `sqlparse`-based script (Python) that tokenizes every file and confirms: no tokenizer error tokens, every real statement ends in `;`, and parentheses balance per file, including inside the `$$ ... $$`-quoted `plpgsql`/`sql` function bodies. `sqlparse` is a lenient, dialect-agnostic tokenizer, not a Postgres grammar — it would not catch, for example, a misspelled keyword that is still syntactically token-shaped, or a reference to a column that doesn't exist. No `psql`, `postgres`, or `initdb` binary was available to install and actually run these migrations for real syntax/semantic validation.
- A found-and-fixed bug from this same review: `profiles` originally had a `CHECK` constraint requiring every `role = 'student'` row to have a non-null `college_id`/`batch_id`. That's correct as an eventual-consistency rule (Part 4.1), but it would have made every new signup fail immediately, because `handle_new_user()` inserts a brand-new student's profile with both columns still null (they aren't assigned a college until they accept an invite). The constraint was removed; the invariant is now an application-layer concern enforced at invite-acceptance time, documented in a comment on the `profiles` table in migration 1.

Because of this, **treat every file here as a strong first draft that still needs to be run against a real Supabase project (even a free-tier one) before anything depends on it.** The single most likely class of remaining problem is a Postgres-version-specific detail (pgvector's `hnsw` index availability, exact `auth.*` schema behavior, default grants) that only a live `supabase db push` and the Phase 2 RLS test suite can actually confirm.

## Not covered by this change

- `supabase/seed/` (demo college, batches, students, question bank sample, KB sample) — listed in the repo layout (Part 3) but not part of this schema/RLS task.
- Auth flow wiring, role-based routing, and the invitation-acceptance endpoint that actually sets a student's `college_id`/`batch_id`/`role` after signup.
- Regenerating `supabase/config.toml` via a real `supabase init`/`supabase link` once the CLI is installed (still hand-authored from Phase 0).
