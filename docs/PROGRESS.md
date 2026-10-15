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
