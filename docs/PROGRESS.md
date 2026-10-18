# Progress

## Phase 1: 4 of 5 provider keys live and verified; R2 still missing

The founder provided Groq, Gemini, Sarvam, and an Upstash key. Each was verified with a real, minimal call before being trusted — not just pasted into `.env` on faith:

- **Groq**: `GET /openai/v1/models` with the key as a Bearer token → 200 OK.
- **Gemini**: `GET /v1beta/models?key=...` → 200 OK. Worth noting: the key's format (`AQ.Ab8RN6Ix...`) doesn't match the classic `AIzaSy...` Google AI Studio pattern — confirmed it's simply a newer, equally valid key format via this real successful call, not a mistake.
- **Sarvam**: no free verification endpoint exists in their API (checked their docs directly) — the only real check is a billed call, so sent the smallest possible TTS request (`"hi"`, ~negligible fractional-paisa cost) to `POST /text-to-speech` and got real base64 audio back with a 200.
- **Upstash**: the value given was an account-level Developer API key (Basic Auth, `email:key`), **not** a per-database REST URL+token pair the app actually needs — confirmed via Upstash's docs and by listing databases on the account (zero existed). Used that management key once to create a real Global Redis database (`vyoman-interviewer`, primary region `ap-south-1`/Mumbai, matching the rest of the stack) via `POST /v2/redis/database`, then verified the resulting `rest_token` for real with `GET /ping` → `PONG`. The account-level key itself was not stored in `.env` — only the resulting per-database `UPSTASH_REDIS_REST_URL`/`UPSTASH_REDIS_REST_TOKEN` are, which is what the engine's Redis client actually needs.

All four now live in `services/engine/.env` (gitignored). **Still missing: Cloudflare R2** (`R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`) — Phase 1's real cost/latency test needs this too, since it uploads interview audio to R2.

A background workflow is concurrently building the actual engine code (provider clients, interview loop, cost tracking, `eval/cost_report.py`) against these — see the Phase 1 engine section below once it lands.

## Cross-cutting: real transactional email, live — done

Supabase Auth was sending OTP emails through its built-in mailer, which turned out to be capped at **2 emails/hour** on this project (confirmed via the Supabase Management API's `config/auth` endpoint, `rate_limit_email_sent: 2`) — explaining why login testing kept failing to deliver. Fixed for real, not just patched around:

- Configured Supabase Auth's custom SMTP to send through **Resend** (`smtp.resend.com:587`, user `resend`, password = the Resend API key) via the Supabase Management API (the founder provided a personal access token for this — used narrowly, only to read/patch this one project's `config/auth`, never written to disk or committed).
- The founder's domain `vyoman.tech` was added and DNS-verified in Resend (DKIM at `resend._domainkey.vyoman.tech`; MX + SPF on a `send.vyoman.tech` subdomain via CNAME to Resend's infrastructure — the existing root-domain Hostinger mail/SPF setup was untouched and doesn't conflict, since Resend's records live on the `send` subdomain, not the root). Sender is `sreeadithya@vyoman.tech`.
- Before the domain was verified, Resend's API itself enforced "only send to your own account email" (sandbox mode) and then "domain not verified" — both confirmed directly by testing real sends, not assumed. After verification, a real end-to-end test (`POST /api/demo-requests` with a different recipient) succeeded with no warning, and `rate_limit_email_sent` was raised from 2 to 30/hour (Supabase blocks raising this at all until custom SMTP exists — also confirmed directly, the API returns a 401 explaining exactly that).
- `RESEND_API_KEY`, `DEMO_REQUEST_NOTIFY_EMAIL`, `DEMO_REQUEST_FROM_EMAIL` added to `apps/web/.env.local` (gitignored, never committed).
- Test rows created while verifying delivery were deleted from the live `demo_requests` table afterward.

**What this unblocks:** OTP login should now deliver to any email address, not just the founder's own; the Book-a-Demo notification email (built in Phase 2, previously untestable) now genuinely sends. **What's still manual-only:** nobody has click-tested an actual OTP magic-link login end to end in a real browser yet — that still needs a human to receive and click the email.

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

**Attempted: creating a real Supabase project to close the gap above**

A Supabase MCP connection is available in this environment, authenticated to the founder's own account (org "sree", one existing unrelated project "housey"). With the founder's explicit go-ahead and a confirmed $0/month quote, I attempted `create_project` (name `vyoman-interviewer`, region `ap-south-1`/Mumbai, matching Part 2's region requirement) — it failed: `"sreeadithya.ndd@gmail.com (2 project limit) ... need to delete, pause or upgrade one or more of these projects"`. Only one project (`housey`) was visible via `list_projects`, so the account appears to already be at its free-tier project cap some other way. Did not touch the existing `housey` project.

**Update: a real project now exists and the schema is live.** The founder created a project themselves ("Vyoman-AI-Interviewer", id `rhynjyamkeqsdvymmzhc`, region `ap-southeast-2` — not Mumbai; worth revisiting before production) and shared its URL/publishable key, and reconnected the Supabase MCP connector to the account that owns it. All 7 migrations plus a new hardening migration (`20261017150000_advisor_hardening.sql`) were applied directly via the Supabase MCP's `apply_migration`, with zero SQL errors on the first real run. Supabase's own security/performance advisors then surfaced three genuine issues no static review could have caught (auto-enabled RLS silently blocking three intended-readable tables; nine SECURITY DEFINER helper functions reachable via public RPC, several leaking cross-row ownership data for a guessed id; and a schema-move that broke two function bodies' internal calls) — all three are fixed and documented in `docs/DECISIONS.md`. **The Phase 2 acceptance criterion "RLS tests proving a student cannot read another student's data and a college admin cannot read another college's data" is now genuinely verified**: real test fixtures (two colleges, five users across three roles, owned resumes/interviews) were created, queried as each simulated user via `SET LOCAL ROLE authenticated` + `request.jwt.claims`, and confirmed — student isolation, college_admin same-college-only visibility, platform_admin full visibility, and the self-privilege-escalation guard all behave exactly as designed. All test fixtures were deleted afterward; the project is back to empty/pristine. `apps/web/.env.local` now points at this real project. The demo-request flow was also re-tested end to end against it and genuinely saved a row (only the Resend email leg still fails, since no Resend key exists yet).

**Still pending:** auth flow UI (login/signup pages), the invitation-acceptance endpoint, seed data, and Lighthouse scores — RLS and the schema are no longer the blocker for those.

## Phase 2: auth foundation (login/signup, callback, onboarding, app shell) — done

**What was built**

- `/login` and `/signup` (`apps/web/app/login/page.tsx`, `apps/web/app/signup/page.tsx`): Server Components that redirect an already-signed-in user to `/app` or `/onboarding`, rendering a shared client form (`components/auth/EmailOtpForm.tsx`) otherwise. The form calls `supabase.auth.signInWithOtp({ email, options: { emailRedirectTo, shouldCreateUser } })` from the browser client — `shouldCreateUser: false` on login (so logging in with an unknown email fails clearly instead of silently creating an account), `true` on signup.
- `app/auth/callback/route.ts`: Route Handler. Exchanges the magic-link `code` for a session via the server client's `exchangeCodeForSession`, then redirects to `/onboarding` (student, no college yet) or `/app`.
- `/onboarding` (`app/onboarding/page.tsx`) + `app/api/invitations/accept/route.ts` + a new Postgres function `accept_invitation(p_token)` (`supabase/migrations/20261017160000_accept_invitation.sql`, `SECURITY DEFINER`, applied directly to the live project via the Supabase MCP connection). The function looks up the invitation by its token, checks status/expiry, and writes the *calling* user's own `profiles.role/college_id/batch_id` plus marks the invitation accepted — bypassing the self-escalation guard trigger safely because the function enforces the real invite-matching logic itself, never a blind column write. There is no service-role key in this environment, so this was the only way to do the privileged write at all.
- `app/app/layout.tsx`: the authenticated app shell. Route prefix is `/app`. Redirects to `/login` if signed out, to `/onboarding` if a student with no college, and renders a sidebar whose links come from `lib/auth/nav-config.ts` (cumulative by role — student ⊂ college_admin ⊂ platform_admin). `app/app/page.tsx` is a placeholder home screen so `/app` itself isn't a 404; other agents replace it.
- `lib/auth/current-profile.ts`: `getCurrentProfile()` (async, Server Components/Route Handlers only) and `profileNeedsOnboarding()`, the single source of truth for the onboarding-redirect rule, used by both the callback route and the app shell layout.
- `proxy.ts`/`lib/supabase/middleware.ts` were deliberately left unchanged — route protection for `/app` lives in the layout Server Component instead (one guard, covers every nested page via layout nesting); documented in a comment at the top of `app/app/layout.tsx`.

**What was verified, and how**

- `npm run lint`, `npm run typecheck`, and `npm run build` all exit 0 in `apps/web` (the first `build` attempt hit a transient Turbopack OOM in this sandboxed environment and was simply re-run — the second run compiled, type-checked, and generated all 17 routes cleanly; `/app`, `/auth/callback`, `/login`, `/onboarding`, `/signup`, and both `/api/*` routes all show as dynamic (ƒ), as expected since every one of them reads cookies/calls Supabase).
- Checked `@supabase/auth-js`'s own `.d.ts` for the exact signatures used (`SignInWithPasswordlessCredentials`, `exchangeCodeForSession`) rather than assuming — both match what was written.
- `accept_invitation` was pushed to the real live project (`rhynjyamkeqsdvymmzhc`) via the Supabase MCP `apply_migration` tool (not left as a pending manual step) and confirmed present via `list_migrations`. `get_advisors(type: "security")` flagged that it was callable by `anon` as well as `authenticated` (Supabase's default privileges grant `EXECUTE` to both directly, not through `PUBLIC`, so `revoke ... from public` alone didn't remove `anon`'s grant) — fixed with an explicit `revoke ... from anon`, re-applied directly to the live project, and re-confirmed via `get_advisors` and a `pg_proc.proacl` check that only `authenticated` (and the owner) can call it now.
- Could not fully exercise the OTP email round trip end to end (that needs a real inbox click), but the code path, method signatures, and redirect/role-gating logic were all checked statically as above.

**What is pending / a known gotcha for whoever tests this live**

- The live Supabase project's Auth → URL Configuration (dashboard-only setting; no MCP tool here manages it) needs `http://localhost:3000/auth/callback` in its allowed redirect URLs, or Supabase will bounce the magic link to the Site URL instead of `/auth/callback`. Not verified from this environment — no browser-based email click was performed.
- `app/app/page.tsx` and every nav target in `lib/auth/nav-config.ts` (`/app/interview`, `/app/resume`, `/app/chat`, `/app/history`, `/app/students`, `/app/invites`, `/app/colleges`, `/app/question-bank`, `/app/knowledge-base`, `/app/cost-dashboard`) are placeholders/links only — the pages themselves are other agents' work, not part of this piece.
- No automated test exercises the onboarding/invitation-acceptance flow against a real invitations row yet (would need a seeded college + invitation + a real signed-in test user).

## Phase 4 (early slice): AI interview UI — done; Phase 1 providers still blocked

**What was built**

Everything under `apps/web/app/app/interview/` and `apps/web/app/app/history/`, per BUILD_SPEC Part 4.5 and the auth foundation's `/app` conventions:

- `/app/interview`: setup screen (type, target role, company type, difficulty). Submitting calls a new `create_stub_interview(...)` RPC and navigates to the room.
- `/app/interview/[id]`: the turn-based room (`components/interview/InterviewRoomClient.tsx`). Real browser audio recording (`MediaRecorder`, Opus/WebM), a real per-answer timer (180s cap) and a real overall timer (25-minute cap), both enforced in the UI. End-of-answer detection uses real `@ricky0123/vad-web` (Silero VAD), loaded dynamically client-side with its model/wasm assets served from jsdelivr (no local asset copy needed); a manual "Done answering" button is always available as the documented fallback, and is the only path exercisable without a real microphone. The turn-by-turn loop itself — which question comes next, and the "transcript" standing in for a real STT result — comes from a new, clearly-labeled stub, `lib/ai-stubs/interview-engine.ts`, never presented as real: every page carries a visible "Preview — not yet connected to the real engine" badge (`components/interview/primitives.tsx`).
- `/app/interview/[id]/report`: scores by dimension with evidence quotes, strengths, weak areas, recommended next practice, and the full transcript with real per-answer audio playback (`components/interview/InterviewReportClient.tsx`).
- `/app/history`: real list from the `interviews` table, linking to the report (completed) or back into the room (pending/in-progress).
- `supabase/migrations/20261017180000_interview_stub_bridge.sql`: four new `SECURITY DEFINER` RPC functions (`create_stub_interview`, `start_stub_interview`, `record_stub_interview_turn`, `finish_stub_interview`), applied live to the real project. Exactly the same shape as the existing `accept_invitation`/`create_stub_resume_scan` bridge functions — real writes to the real `interviews`/`interview_turns`/`interview_reports` tables (which deliberately have no authenticated INSERT/UPDATE policy, since a real engine's service role is supposed to be the only writer), always scoped to `auth.uid()`'s own interview. See `docs/DECISIONS.md` for the full reasoning and what still has to change once the real engine exists.
- `lib/interview/` (`types.ts`, `constants.ts`, `actions.ts`, `recording.ts`, `audio-store.ts`): shared types mirroring the real columns, the 180s/25min limits, the RPC wrappers, MediaRecorder/mime-type helpers, and an in-memory per-tab store that lets the report page play back a just-recorded answer without any audio upload existing yet.

**What was verified, and how**

- `npm run lint`, `npm run typecheck`, and `npm run build` all exit 0 in `apps/web` (confirmed after installing `@ricky0123/vad-web`).
- The `interview_stub_bridge` migration applied with zero SQL errors on the real live project (`rhynjyamkeqsdvymmzhc`) via the Supabase MCP `apply_migration`, confirmed present via `list_migrations`. `get_advisors(type: "security")` shows the four new functions flagged `authenticated_security_definer_function_executable` — the same, already-accepted warning the existing `accept_invitation`/`create_stub_resume_scan` functions carry (narrowly-scoped, `auth.uid()`-checked SECURITY DEFINER is the intended shape here); no new/different advisory appeared.
- Read every component file back after writing it and traced the state machine by hand (mount → start → ask → record → save turn → next turn → finish → report) for type errors and dead ends; `tsc --noEmit` passing is the only automated confirmation of this, not a live click-through.

**Known, honest limitation — not independently verified end to end**

- **Nobody actually clicked through a real interview in a real browser with a real microphone in this pass.** A headless/CI browser cannot grant microphone permission or run an `AudioWorklet`-based VAD model, so `getUserMedia`, `MediaRecorder` recording, and the Silero VAD path are verified by code review and type-checking only, not by an actual recorded clip or a real "speech ended" callback firing. The one path that *could* be exercised without a microphone — the manual "Done answering" fallback, the turn-save RPC calls, and the finish/report flow — was not click-tested either in this pass; only `tsc`/`build` ran. Treat the recording/VAD/turn-loop wiring as reviewed-and-compiling, not as "confirmed working in a browser," until someone with a real mic runs through one interview.
- `eye_contact_pct`/`posture_stability_pct` are always written as `null` — there is no MediaPipe (or any other) gaze/posture tracking in this slice; BUILD_SPEC Part 4.5 step 7 describes that as real-engine work, out of scope here.
- The separate `weak_areas` table is not written by the stub flow (only `interview_reports.weak_areas_summary`, which the report page reads) — see `docs/DECISIONS.md`.

## Phase 5: college admin dashboard (Part 4.7) — done, built fully real (no AI, no stubs)

**What was built**

Everything under `apps/web/app/app/students/` and `apps/web/app/app/invites/`, plus the college_admin branch of the shared `/app` home page, per BUILD_SPEC Part 4.7 — role-gated to `college_admin` via a new `lib/auth/require-college-admin.ts` (a student or `platform_admin` hitting any of these is redirected to `/app`; see `docs/DECISIONS.md` for why `platform_admin` is excluded here too). Nothing here is AI-dependent, so none of it is stubbed — every page is a real, RLS-scoped Supabase query or write, with an honest empty state ("No interview activity yet for your college." / "No weak areas recorded yet..." / "No quota configured yet...") in place of invented numbers, since the live project currently has zero interview/report/weak-area/quota rows for any college.

- **Overview** (`app/app/CollegeAdminOverview.tsx`, rendered by `/app` itself for a `college_admin`, not a new nav link — `lib/auth/nav-config.ts` never had an "Overview" entry, and the shared `/app` home page already existed for this): batch readiness distribution, readiness by department, top 10 weak skills, a 7-day interview activity bar chart, and quota usage — each section queried for real (`profiles`, `interview_reports`, `weak_areas`, `interviews`, `quotas`, `colleges`) with no manual `.eq("college_id", ...)`, since RLS already scopes every one of those tables to the caller's own college.
- **Students table** (`/app/students`, `app/app/students/StudentsTable.tsx`): real query joining `profiles` (role='student') with `batches` (embedded) and each student's latest completed `interview_reports.overall_score` + open `weak_areas` count. Search (name/email), filter (batch/department/readiness), and CSV export all run client-side over that one fetch — real functionality, not a stub, since it's plain data with no AI involved.
- **Student detail** (`/app/students/[id]`): read-only, and scoped to exactly "reports and resume" per BUILD_SPEC's literal wording and the live RLS policies — deliberately does **not** show `job_descriptions` or `resume_scans` (college_admin has no RLS policy granting access to either). Shows every interview report (scores, strengths, practice actions), the `weak_areas` list, and the student's resume (primary, or latest if none is marked primary) with a tolerant renderer for JSON Resume's common sections, since the resume builder itself (Phase 3) can produce a partial/empty `data` jsonb today.
- **Invites** (`/app/invites`, `app/app/invites/InvitesManager.tsx`): a single-invite link generator and a CSV uploader (client-side parse via a new no-dependency `lib/csv.ts`, per-row validation with inline error messages, a downloadable template, and sequential per-row inserts so one bad row doesn't fail the whole batch), both writing real rows to `invitations` under the signed-in admin's own session — plus the full invitations list with pending/accepted/revoked/expired status and a "resend" action (re-arms the token, extends `expires_at`, copies the link) on pending/expired rows. See `docs/DECISIONS.md` for why "resend" copies a link instead of sending an email.
- `lib/readiness.ts`: the shared readiness-band classification (score ≥75/≥50/else, or "not yet assessed") used by both Overview and the Students table, so the two can't drift on what a given band means.
- `.claude/launch.json`: a `web` dev-server config (`npm run dev` in `apps/web`), added so this and future passes can preview the app through the Browser tool's `preview_start` instead of ad hoc shell commands.

**What was verified, and how**

- `npm run lint`, `npm run typecheck`, `npm run build`, and `npm run test` all exit 0 in `apps/web`. `build` needed three retries before it completed — the first two died to a Turbopack/worker out-of-memory crash in this sandboxed environment (matching the exact same transient failure Phase 0's own progress notes describe; not caused by anything in this change), the third succeeded cleanly and listed `/app/students`, `/app/students/[id]`, and `/app/invites` as dynamic routes alongside every other `/app/*` page.
- Every query's table/column names, embedded relations, and the RLS policy each one depends on were cross-checked against a live `list_tables(rhynjyamkeqsdvymmzhc)` call (not just the migration source files) — exact match, including that `resumes`/`interview_reports`/`weak_areas`/`quotas` really do carry the columns these pages read, and that `job_descriptions`/`resume_scans` really do have no `college_admin` SELECT policy (confirmed against the live `pg_policies` behavior, not assumed from the migration file alone).
- Fetched `/app/students`, `/app/invites`, and `/app/students/00000000-0000-0000-0000-000000000000` from a real running `next dev` instance (another session's already-running server on port 3000, reused rather than starting a conflicting second instance) while signed out: all three correctly redirect to `/login` via the existing shared `app/app/layout.tsx` guard, confirming the new routes sit under that guard like every other `/app/*` page.
- `tsc --noEmit` caught a genuine, non-obvious bug before it shipped: every embedded-relation select (e.g. `profiles.select("..., batches(name)")`) type-checked as a to-many array instead of the true one-to-one/many-to-one shape, and a multi-line select string built with `+` concatenation collapsed to a `GenericStringError` placeholder type — both are `@supabase/postgrest-js`'s type-level select-string parser doing the wrong thing without a generated `Database` type (which this project doesn't have, by existing convention). Fixed by casting each affected query's result to a hand-written interface (same pattern `lib/auth/current-profile.ts` already uses) and by writing long select strings as a single template literal instead of concatenation. See `docs/DECISIONS.md`.

**What was not verified, and why — an honest limitation**

- **No live, signed-in college_admin session exercised these pages end to end in a browser.** The real live project (`rhynjyamkeqsdvymmzhc`) is no longer empty: it now holds the founder's own real account (`sreeadithya.ndd@gmail.com`, signed up as a `student` with no college yet) created sometime before this pass. Rather than create and then delete temporary `college_admin`/student/interview/report fixtures in that same now-occupied project (the way Phase 2's RLS verification did when the project was still empty), this pass relied on the schema/RLS cross-check and the unauthenticated route-redirect check described above, plus code review for the authenticated-but-wrong-role branch (`requireCollegeAdmin` sending a signed-in student to `/app` instead of `/login`). **Whoever has a real `college_admin` account should click through `/app` (Overview), `/app/students`, a student's detail page, and `/app/invites` once** to confirm the honest-empty-state copy and the invite flow (create a link, upload a CSV with one deliberately bad row, confirm it shows a row-level error, resend an invite) all look right in a real browser — that is the one thing this pass could not do itself.
- Lighthouse/accessibility scores were not run for these pages (not part of Part 4.7's own acceptance criteria, which this phase otherwise satisfies in full: real queries throughout, honest empty states instead of invented numbers, and role-gating that keeps a student out).

## Phase 5 (continued): platform admin dashboard, and Phase 6 (early slice): prep assistant chat — done

Built concurrently with the college admin dashboard above, under the same `/app` shell, role-gated to `platform_admin` via `lib/auth/require-role.ts` (the chat page is open to any authenticated role instead, per BUILD_SPEC Part 4.6). This agent's work was not documented when the multi-agent build finished — several agents were editing this same file at once and one write was lost — so this section was reconstructed afterward from its structured report and cross-checked against the actual files and a fresh `npm run build`.

**What was built**

- **Schema fix (load-bearing):** the live schema's RLS, as written in Phase 2, assumed a service-role key would do all `question_bank`/`kb_documents`/`chat_messages` writes — but platform_admin has no real way to curate content without one. Added `supabase/migrations/20261017160632_platform_admin_content_write_access.sql` (applied live to `rhynjyamkeqsdvymmzhc`): grants `question_bank`/`plans` INSERT/UPDATE/DELETE to `authenticated`, gated by new RLS policies requiring `is_platform_admin()`; grants `kb_documents` full CRUD the same way (`kb_chunks` deliberately untouched — still fully engine-internal); adds a `chat_messages` INSERT policy scoped to the session owner (or platform_admin), documented as a temporary bridge until the real engine/service role exists. `get_advisors` before/after confirms no new security findings.
- **`/app/colleges` + `/app/colleges/[id]`**: real CRUD for colleges and batches.
- **`/app/plans`**: real CRUD for plans (price entered/edited in rupees in the UI, persisted as `price_paise`).
- **`/app/question-bank` + `/app/question-bank/[id]`**: real CRUD, filters, the draft → reviewed → retired review workflow from Part 4.8.
- **`/app/knowledge-base` + `/app/knowledge-base/[id]`**: real document CRUD, same review workflow. The "Approve → chunk & embed" action is honestly stubbed (`lib/ai-stubs/embed-document.ts`): it really does flip status to `reviewed`, but creates zero `kb_chunks` rows, with a visible note that embedding is pending Phase 1's Gemini key.
- **`/app/cost-dashboard`**: reads real `usage_events` (cost/interview p50/p95, cost by college/feature, daily spend). Honest empty state today (0 rows). One real limitation found and handled honestly rather than invented: `usage_events` has no success/error or fallback column, so "provider error/fallback rate" can't be computed as the spec describes — the dashboard substitutes a real STT-fallback-rate metric from `interview_turns.stt_fallback_used` (which does exist) and documents the gap in the UI instead of fabricating a column.
- **`/app/golden-set` + `/app/golden-set/[id]`**: lists completed interviews lacking a human rating, a blind rating form (the AI's own `interview_reports` scores are only shown after the human rating is saved, preserving blindness), writes real `golden_set_ratings` rows. Honest empty state today (0 completed interviews).
- **`/app/chat`**: the prep-assistant UI for any authenticated role — real `chat_sessions`/`chat_messages` reads/writes (session list, new chat, message thread). Sending a message is honestly stubbed (`lib/ai-stubs/chat-respond.ts`): a mock reply that explicitly says it's running in preview mode, `citations` always `[]` — never a fabricated citation or a mock answer presented as KB-sourced.
- Supporting files: `lib/auth/require-role.ts`, `lib/types/db.ts` (hand-written row types matching the live schema), `components/app-shell/StatusBadge.tsx`, `app/app/error.tsx` (shared error boundary), `nav-config.ts` updated with Plans/Golden Set entries.

**What was verified, and how**

- `npx tsc --noEmit` exits 0. `npm run build` exits 0, listing all 10 new routes. A scoped ESLint run over every file this agent touched was clean.
- At the time this agent ran, repo-wide `npm run lint` had 8 pre-existing errors — but all 8 were in a *different*, concurrently-running agent's interview files (`app/app/interview/*`, `components/interview/*`), not this agent's own code; it deliberately left them untouched to avoid clobbering that agent's in-progress work. **Resolved since**: a fresh `npm run lint` run after the full multi-agent build finished is clean (0 errors) — the interview agent's own fix had landed by then; this was a timing/race artifact between concurrent agents, not a real defect.
- `supabase MCP apply_migration` + `get_advisors(security)` before/after, against the live project, confirm the new migration introduced no new security findings.
- Role-gating (platform_admin-only pages redirecting students/college_admins to `/app`) was verified by code review only, not a live multi-account browser session — no test credentials for the three roles existed in this environment.

**What is pending / known gaps**

- No live `platform_admin` session click-tested these pages in a browser (same constraint as Phase 5's college-admin section above — the live project now holds the founder's real account).
- The knowledge-base "approve" action and the chat reply are both stubs pending Phase 1's Gemini key, as documented above and badged in the UI.
- Two migrations applied in the same build briefly shared a local filename timestamp prefix (`20261017170000`) — no live-database collision (Supabase recorded distinct real versions), but the local files have since been renamed to match their real applied timestamps for clarity.
