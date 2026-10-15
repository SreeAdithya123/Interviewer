# Progress

## Phase 0: Scaffold — done

**What was built**

- `apps/web/`: Next.js 16 (App Router, TypeScript) + Tailwind CSS v3 + shadcn/ui plumbing (`components.json`, `lib/utils.ts`). The exact design tokens from the founder's existing site (`reference/lovable-site/src/index.css` and `tailwind.config.ts`) are ported into `app/globals.css` and `tailwind.config.ts`: the HSL color variables, radius, shadows, ease curves, base typography rules, and the core utility classes/keyframes (`.eyebrow`, `.btn-primary`, `.btn-secondary`, `.text-spectrum`, `.bezel`/`.bezel-core`, `.aurora`, `.grain-fixed`, fade-in/scale-in/aurora/marquee). Fonts: Plus Jakarta Sans and Space Grotesk via `next/font/google`; Clash Display via the same Fontshare `@import` the reference uses (it isn't on Google Fonts). `app/page.tsx` is a minimal placeholder proving the tokens render correctly — it is explicitly not the real landing page, which is Phase 2 work.
- `services/engine/`: FastAPI service with a `GET /health` endpoint, a Dockerfile targeting Cloud Run (port 8080), `requirements.txt`/`requirements-dev.txt`, and empty placeholder packages (`app/interview`, `app/resume`, `app/chat`, `app/reports`, `app/providers`, `app/costs`, `prompts/`) matching the repo layout in the spec — no business logic yet, that belongs to later phases.
- `supabase/`: hand-authored `config.toml` (the Supabase CLI isn't installed locally), empty `migrations/` and `seed/` directories — the real schema is Phase 2.
- `eval/`: placeholder `README.md` — the cost-report script and golden-set harness are Phase 1 and Phase 7 work.
- `.github/workflows/ci.yml`: two independent jobs, `web` (npm ci → lint → typecheck → build → test) and `engine` (pip install → ruff check → pytest), triggered on push/PR to `main`.
- Root `.env.example` listing every environment variable implied by the stack in Part 2, each with a comment on what it's for and where to get it; root `.gitignore`, root `README.md`.
- `reference/lovable-site/`: the founder's existing product (Lovable/Vite build) cloned from its public GitHub repo and copied in minus secrets and git history — source of truth for the design port. It is the previous, real-time-voice architecture being replaced; only its design system is reused.
- Git repository initialized and the scaffold committed (it was never git-initialized before this session).

**What was verified, and how**

- A multi-agent workflow scaffolded `apps/web`, `services/engine`, and the supabase/CI/docs pieces in parallel, each verified with real commands (not just file presence) inside the working copy. A fourth, independent agent then re-verified everything against the Phase 0 acceptance criteria.
- That in-place verification initially reported success, but it ran inside the already-built working tree, which masked a real bug. I caught it myself by actually cloning the freshly-committed repo to a scratch directory and re-running every CI step from zero: `npm ci`/`lint`/`typecheck`/`build`/`test` for the web app, and a fresh venv + `pip install`/`ruff check`/`pytest` for the engine. `npm run typecheck` failed on that clean clone — `app/layout.tsx` used Next.js 16's generated `LayoutProps<"/">` type, which only exists after `.next/types/` has been produced by a build, so a type-check on a truly fresh checkout failed even though it passed in the working copy that had already been built once. Fixed by switching to the stable `{ children: React.ReactNode }` signature (see `docs/DECISIONS.md`), committed, and re-ran the entire clean-clone simulation end to end: `lint`, `typecheck`, `build`, and `test` all pass for `apps/web`, and `ruff check` + `pytest` both pass for `services/engine`, starting from nothing but a fresh `git clone`.
- Confirmed no secrets are tracked: only `.env.example` is committed, no `.env`, `node_modules`, or `.venv` in git.
- Spot-checked that the ported design tokens in `apps/web` match `reference/lovable-site` exactly (`--primary: 244 66% 58%`, `--background: 232 40% 98%`, `--radius: 0.9rem`, among others).

**What is pending / not done**

- No GitHub remote exists yet, so `.github/workflows/ci.yml` has never actually run in GitHub Actions — only simulated locally via fresh clones. Push to a remote once one is set up.
- `npm audit` flags some moderate/high transitive-dependency advisories from the Next.js/Vitest toolchain; not addressed since fixing them risks breaking changes and wasn't required for Phase 0.
- The Supabase CLI isn't installed locally, so `supabase/config.toml` is hand-authored rather than CLI-generated — reconcile with a real `supabase init`/`supabase link` in Phase 2.
- Phase 1 (the interview cost/latency go/no-go test) needs real provider credentials that aren't available in this environment — see the checkpoint below.

## Phase 1: blocked on API keys

Phase 1 requires making real calls to Groq, Sarvam, Gemini, Cloudflare R2, and Upstash Redis to produce genuine cost/latency numbers — it cannot be mocked, since the entire point is to measure real unit economics. None of these credentials exist in this environment yet. See the checkpoint in the chat for the exact list of keys needed and where to get each one.

## Phase 2: data model (schema + RLS) — done; rest of Phase 2 still pending

**What was built**

Seven SQL migration files in `supabase/migrations/`, covering all 24 tables listed in `docs/BUILD_SPEC.md` Part 5:

- `20261015120001_core_tenancy.sql`: `colleges`, `batches`, `profiles`, `invitations`, plus the shared `set_updated_at()` trigger, the `auth.users` → `profiles` bootstrap trigger, and a trigger that blocks a client from self-escalating their own `role`/`college_id`/`batch_id`.
- `20261015120002_resume.sql`: `resumes`, `job_descriptions`, `resume_scans`.
- `20261015120003_interview.sql`: `question_bank`, `interview_templates`, `interviews`, `interview_turns`, `interview_reports`, `weak_areas`.
- `20261015120004_knowledge_base_and_chat.sql`: `kb_documents`, `kb_chunks` (pgvector, `vector(768)`, HNSW cosine index), `chat_sessions`, `chat_messages`.
- `20261015120005_billing_and_ops.sql`: `usage_events`, `plans`, `quotas`, `tts_cache`, `payments`.
- `20261015120006_misc.sql`: `demo_requests`, `golden_set_ratings`.
- `20261015120007_row_level_security.sql`: RLS helper functions and every `CREATE POLICY`/`ALTER TABLE ... ENABLE ROW LEVEL SECURITY` for the 18 user/college-scoped tables (per Part 4.1), plus grant/revoke hardening for the 6 platform-curated/reference tables that intentionally have no RLS (`question_bank`, `interview_templates`, `kb_documents`, `kb_chunks`, `plans`, `tts_cache`).

Also wrote `supabase/migrations/README.md` (migration order, verification scope, explicit "never run against a live DB" caveat) and updated `supabase/README.md` to point at it; added the Phase 2 schema decisions to `docs/DECISIONS.md`.

**What was verified, and how**

- Every table named in BUILD_SPEC Part 5 exists exactly once, across migrations 1–6 (`grep -oE "^create table public\.[a-z_]+"` across all files, diffed against the spec's 24-table list — exact match, both directions).
- RLS coverage: 18 of 24 tables have `ALTER TABLE ... ENABLE ROW LEVEL SECURITY`; the other 6 are exactly the platform-curated/reference tables called out by name (`comm -23` diff between all tables and RLS-enabled tables).
- No duplicate index, policy, or function names across the file set (checked by grep + `sort | uniq -d`).
- Every `references public.X(...)` foreign key targets a table created in the same migration file or an earlier one in filename order (checked by a small Python script, not just by eye).
- A `sqlparse`-based tokenizer check confirms every file has balanced parentheses, balanced `$$`-dollar-quoting (the `plpgsql`/`sql` function bodies), zero tokenizer error tokens, and every real statement ends in `;` (166 statements total across the 7 files).
- A full manual line-by-line read of every statement in every file, which caught and fixed one real bug before it shipped: `profiles` originally had a CHECK constraint requiring students to have a non-null `college_id`/`batch_id`, which would have made `handle_new_user()`'s insert on every new signup fail immediately (a new student doesn't have a college until they accept an invite). Removed; documented as an application-layer invariant instead.

**What was not verified, and why**

**This schema has never been run against a real Postgres or Supabase instance.** No Docker, local Postgres/psql binary, or reachable cloud Supabase project existed in this environment (a Supabase MCP connection was available, but only to an unrelated existing project outside this one — using it, or creating a brand-new cloud project just to test this schema, was not done without asking, since project creation has real cost/consent implications on the user's own account). So, unverified:

- That `supabase db push` / `supabase migration up` actually applies these files cleanly end to end.
- The Phase 2 acceptance criterion from Part 7: "RLS tests proving a student cannot read another student's data and a college admin cannot read another college's data" — no such tests have been run, because there is nothing to run them against yet.
- Any Postgres-version-specific or extension-specific behavior: pgvector's `hnsw` index type, exact `auth.*` schema/trigger behavior, Supabase's exact default grants for a freshly created project.

**What is pending (rest of Phase 2, not part of this piece of work)**

- `supabase/seed/`: demo college, batches, students, question bank sample, KB sample.
- Auth flow wiring (email OTP, Google sign-in), role-based routing, and the invitation-acceptance endpoint that actually sets a student's `college_id`/`batch_id`/`role` after signup.
- The full landing site (Part 4.9) — being built in parallel elsewhere in this repo.
- Running this schema against a real Supabase project and the RLS test suite, once credentials/a project exist.

## Phase 2: landing site (Part 4.9) — done; independent verification pass

**What was built**

The full landing site: `/`, `/for-colleges`, `/for-students`, `/pricing`, `/about`, `/book-a-demo`, `/privacy`, `/terms`, plus `app/sitemap.ts` and `app/robots.ts`. Components live in `apps/web/components/marketing/`. `app/api/demo-requests/route.ts` backs the Book a Demo form: validates input, inserts into Supabase `demo_requests`, emails the founder via Resend, and fails loudly (never a fake success) when either credential set is missing.

**What was verified, and how (independent subagent, did not write this code)**

- `npm run lint`, `npm run typecheck`, `npm run build`, and `npm run test` all exit 0 in `apps/web`.
- Every required route fetched from a running `next dev` instance returns HTTP 200 with real rendered content (titles, hero copy matching BUILD_SPEC verbatim); confirmed in a browser too (screenshots at desktop width match Part 4.9's described hero, pill navbar, and live-interview device card).
- Scanned the Home page's rendered text/HTML for fabricated testimonials, customer logos, user counts, or outcome statistics — none found; `Hero.tsx`'s own comments note the old reference site's "50,000+ interviews / 4.9 rating / 92%" proof strip was deliberately dropped.
- `/pricing` (both the homepage `Pricing` section and the standalone `/pricing` page) shows `₹[price]` / `₹[TBD]` with an explicit "Placeholder price — final pricing to be confirmed" / "pricing finalized after the pilot" label next to every number.
- `app/sitemap.ts` and `app/robots.ts` list exactly the 8 real routes; confirmed by fetching `/sitemap.xml` and `/robots.txt` from the running server.
- Posted to `/api/demo-requests` with no Supabase/Resend env vars set: returned HTTP 502 with a real error message (`"Supabase is not configured: ..."`), not a fake success; `.env.example` only — no live secret values anywhere in the route or `.env.example`.
- `/privacy` and `/terms` are both marked "Draft — needs legal review" and reference India's DPDP Act.

**Bug found and fixed in this pass**

`supabase/migrations/20261015120006_misc.sql`'s `demo_requests` table had columns `full_name`/`designation` instead of `contact_name`/`batch_size`, and no `batch_size` column at all — a mismatch against what `app/api/demo-requests/route.ts` actually inserts (`college_name`, `contact_name`, `email`, `phone`, `batch_size`, `message`). Against a real Supabase project this insert would fail with a "column does not exist" error on every demo request. Fixed by renaming the columns to match the API route exactly (and marking `college_name`/`phone` `NOT NULL` to match the route's validation). No other table had a similar client-code/schema mismatch (grepped `apps/web` for every `.from("...")` call — `demo_requests` is the only one).

**What remains unverifiable without live credentials (not a defect — a known limitation)**

- RLS policies in `20261015120007_row_level_security.sql` were reviewed line-by-line against Part 4.1's access rules (student sees own rows; college_admin sees their college read-only; platform_admin sees everything) and look correct by inspection, but have never run against a real Postgres/Supabase instance, so the Phase 2 acceptance criterion "RLS tests proving a student cannot read another student's data" is still unverified.
- Lighthouse performance/accessibility scores (the other Phase 2 acceptance criterion) were not run in this pass.
