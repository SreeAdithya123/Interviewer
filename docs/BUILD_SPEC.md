# Vyoman Interviewer: Claude Code build prompt

How to use this file:
1. Create an empty repo and save this file inside it as `docs/BUILD_SPEC.md`. If you can export the Lovable project behind https://vyoman-interviewer-ewl.pages.dev/ "https://github.com/SreeAdithya123/Vyoman-interviewer.git"to GitHub, copy its source into `reference/lovable-site/` so Claude Code can port the exact design.
2. Start Claude Code in the repo and send: "Read docs/BUILD_SPEC.md fully, then execute Phase 0 and Phase 1. Follow the working rules in Part 6."
3. After each checkpoint, start the next phase with: "Continue with Phase N from docs/BUILD_SPEC.md."

---

## Part 1: Context and intent

I'm Sree, founder of Vyoman AI Solutions. I'm building Vyoman Interviewer, an AI interview practice platform sold to Indian universities and colleges (placement cells), with tier-1 colleges as the long-term target. Students use it to practice interviews, build and check resumes, and prepare for placements. The college's placement officer (TPO) uses it to see which students are ready and where the batch is weak. Later, recruiters will use the same assessments to screen candidates, but that is not part of this build.

Two things decide whether this business works, and every technical decision should serve them:

1. Quality. Colleges and students pay because the feedback is accurate and trustworthy. Scores must be evidence-backed and consistent. Nothing on the platform may be invented: no fake scores, no made-up resume metrics, no hallucinated interview questions attributed to companies.
2. Margins. My previous version used real-time ElevenLabs voice billed per minute and lost money. This version uses a turn-based interview loop that must cost under ₹15 per 20-minute interview, all-in. Every provider call is logged with its cost so I always know my real unit economics.

It must be ready to scale to around 500 concurrent interviews and 50,000 interviews a month without a redesign, because placement season creates sharp spikes.

---

## Part 2: Stack (decided, do not re-litigate)

| Layer | Choice |
|---|---|
| Web app and landing site | Next.js (App Router, TypeScript), Tailwind CSS, shadcn/ui, deployed to Vercel |
| Auth, database, storage policies | Supabase (Postgres, Auth, row-level security, pgvector, Supabase Queues/pgmq), Mumbai region |
| Interview, resume and chat engine | One Python service: FastAPI, deployed as a container to Google Cloud Run, asia-south1 |
| Audio and file storage | Cloudflare R2 via signed upload/download URLs (browser uploads directly) |
| Rate limits and quotas | Upstash Redis |
| Speech to text | Groq Whisper Large v3 (primary), Sarvam STT (fallback for accent or Telugu-English mixing, and on Groq failure or rate limit) |
| Text to speech | Sarvam Bulbul v3, cached in R2 by hash of (text, voice) |
| Conversation model | Gemini 2.5 Flash-Lite |
| Evaluation model | Gemini 3.5 Flash (configurable, chosen by the eval harness) |
| Resume parsing | Gemini with native PDF input; OCR fallback for scanned PDFs |
| Embeddings | Current Gemini embedding model into pgvector |
| In-browser | Silero VAD (@ricky0123/vad-web) for end-of-answer detection, MediaPipe Face Landmarker for eye contact and posture metrics |
| Email | Resend |
| Payments (late phase) | Razorpay |
| Monitoring | Sentry, PostHog |

Model names, SDK methods and API shapes change often. Before writing any provider integration, check the provider's current official docs and pin exact model IDs in one config file (`services/engine/app/config/models.yaml`). Put all provider prices in `services/engine/app/config/pricing.yaml` so cost is computed from config, not hardcoded.

### Design system (match the existing site exactly)

The visual reference is my current site, https://vyoman-interviewer-ewl.pages.dev/ (built in Lovable). The whole product, landing site and app alike, must look like it. If the Lovable source code is in this repo (see `reference/lovable-site/`), port its tokens and components directly instead of recreating them. If it isn't, build from the tokens below.

Tokens (shadcn-style HSL CSS variables):

| Token | HSL | Approx hex | Use |
|---|---|---|---|
| `--background` | 232 40% 98% | #F8F8FC | Light sections, app background |
| `--foreground` | 240 10% 9% | #151518 | Body text on light |
| `--ink` | 240 12% 4% | #09090B | Dark sections (hero, footer), dark cards |
| `--ink-soft` | 240 10% 8% | #131316 | Raised surfaces on dark |
| `--ink-foreground` | 40 30% 96% | #F7F5F1 | Warm off-white text on dark |
| `--ink-muted` | 240 6% 62% | #9A9AA3 | Secondary text on dark |
| `--primary` | 244 66% 58% | #574DDB | Indigo: primary buttons, links, user chat bubbles |
| `--primary-hover` | 244 60% 50% | #4237C7 | |
| `--secondary` | 202 88% 58% | #36ADF2 | Sky blue accents, glows |
| `--accent` | 342 80% 68% | #EF6C93 | Pink accents, "now available" pills |
| `--muted` | 232 24% 95% | #EFF0F5 | Alternate light sections |
| `--muted-foreground` | 240 6% 42% | #64646F | Secondary text on light |
| `--border` | 240 12% 90% | #E3E3E9 | Hairlines |
| `--radius` | | 0.9rem | Cards and inputs |

Typography:
- Headlines: "Clash Display" (fallback Space Grotesk), very large and tight on hero (around 96px desktop), bold.
- Body: "Plus Jakarta Sans".
- Numbers and metrics: "Space Grotesk".
- Resume templates only: Playfair Display, Merriweather, Lora, Source Serif 4.

Signature patterns to reproduce:
- Floating pill navbar centered at the top, translucent with backdrop blur, logo mark (dark circle with "V") plus "Vyoman" wordmark, nav links, and an indigo pill "Start free" button with a circular arrow icon.
- Hero on near-black with a faint grid pattern and soft indigo and sky-blue glow blobs in the corners. An eyebrow pill (small uppercase tracked text with a waveform icon, thin border). A two-line headline where the second line uses a gradient text fill from coral/orange into indigo/violet.
- Pill buttons with a trailing circular arrow badge: one light (off-white fill, dark text) and one outlined dark.
- Key phrases in section headlines highlighted with gradient text (orange to violet, or magenta to pink).
- Sections alternate between near-black and very light lavender-white (#F8F8FC and #EFF0F5).
- Dark rounded "device" cards showing the product in action, such as a live interview chat with a "LIVE SESSION" pill and timer, AI bubbles in dark gray and user bubbles in indigo.
- White feature cards with an icon in a soft gray circle, bold title, muted description, very soft ambient shadows (`--shadow-ambient`).
- Scroll reveal: sections fade in from a blur (filter blur plus opacity) with expo easing `cubic-bezier(.16, 1, .3, 1)`. Respect `prefers-reduced-motion`.
- Smooth, generous whitespace, rounded everything, no harsh borders.

The app screens (student, college admin, platform admin) use the same tokens and components: light `--background` canvas, white cards, indigo primary actions, dark ink panels for the live interview room.

---

## Part 3: Repo layout

```
apps/web/                 Next.js app: landing site + student app + college admin + platform admin
services/engine/          FastAPI service with modules: interview, resume, chat, reports, providers, costs
services/engine/prompts/  Versioned prompt files (each has a version id stored with every output it produces)
supabase/migrations/      Schema, RLS policies, functions
supabase/seed/            Seed data: one demo college, batches, students, question bank sample, KB sample
eval/                     Golden set and evaluation harness
docs/                     BUILD_SPEC.md, PROGRESS.md, DECISIONS.md, lessons/
.github/workflows/        CI: lint, typecheck, tests for web and engine
```

---

## Part 4: Product specification

### 4.1 Roles and tenancy
- Roles: `student`, `college_admin`, `platform_admin`.
- Every student belongs to one college and one batch. RLS enforces: students see only their own rows; college admins see only their college's rows; platform admins see everything.
- The engine verifies the Supabase JWT on every request and uses the service role only server-side.
- Auth: email OTP and Google sign-in. College admins invite students by CSV upload or invite link.

### 4.2 The student profile (the spine)
All features read from and write to one student profile: primary resume (structured JSON), target roles and companies, interview history, latest scores, and a list of weak areas with severity and source. Design this first; every feature depends on it.

### 4.3 Resume builder
- Resumes are stored as JSON (JSON Resume schema) with versions; one is marked primary.
- Form-based editor with live preview. PDF is generated in the browser from 2 or 3 single-column, ATS-safe templates (real selectable text, no tables, no text in images).
- AI bullet rewriting: turns a bullet into action plus result. It must never invent numbers. If a bullet lacks a metric, it asks the student a specific question ("How many users used it?") and uses their answer.

### 4.4 Resume scanner
- Upload PDF or use a built resume. Parse into the same JSON structure.
- Optional job description paste.
- Output four honest checks, each with specific fixes:
  1. Parse health: does the text extract cleanly, are sections detected.
  2. Job description match: skills present, skills missing, with where they should go.
  3. Bullet quality: per bullet, with rewrite suggestions.
  4. Formatting risks.
- Do not show a single "ATS score" percentage. No universal ATS score exists, and placement officers know it.

### 4.5 AI interview (the core product)
Turn-based loop that feels conversational:

1. Student picks interview type (HR, technical, behavioral, mixed), target role, company type, difficulty.
2. Engine builds a plan as a state machine with stages: intro, resume deep-dive, technical, behavioral, closing. Questions come from the curated question bank, filtered by role, company type and difficulty, plus resume-specific questions generated from the student's projects. The LLM only writes follow-ups inside a stage; it does not control the stage order.
3. Question audio plays (from TTS cache when available). Browser records the answer with MediaRecorder (Opus/WebM). Silero VAD detects end of answer; the student can also tap "Done".
4. Browser uploads audio straight to R2, then calls the engine with the object key.
5. Engine: transcribe (Groq, with resume skills and tech terms passed as a vocabulary hint; Sarvam fallback), save transcript, decide follow-up or next question (max 2 follow-ups per question), synthesize follow-up audio (cached), return the next turn.
6. While waiting, the browser plays a short pre-recorded acknowledgement clip so the gap feels natural.
7. MediaPipe runs in the browser and sends only aggregate metrics (eye contact percentage, posture stability) at the end. No video is uploaded or stored.
8. On finish, a report job goes to the queue. A worker runs one evaluation call with the evaluation model using a structured JSON schema:
   - Dimensions: communication clarity, answer structure, technical depth, relevance, confidence and delivery (using audio metrics and MediaPipe aggregates).
   - Every score includes evidence: exact quotes from the transcript that justify it.
   - Strengths, weak areas (written back to the student profile), and 3 concrete practice actions.
   - The report stores model id and prompt version.
9. Report page: scores with evidence, full transcript with audio playback per answer, weak areas, recommended next interview.

Hard limits: answers capped at 180 seconds, interviews at 25 minutes. Quotas per college plan and per student are enforced before an interview starts.

Target per-turn latency (answer upload complete to next question audio ready): p50 under 2.5s, p95 under 4s.

### 4.6 Prep assistant (chatbot)
- Retrieval over the curated knowledge base only: senior interview experiences, company-wise patterns, topic resources, college placement info.
- Every answer cites its sources (document titles, linked). If retrieval finds nothing relevant above a similarity threshold, it says it doesn't have reliable information on that, and suggests related topics it does cover. It never answers company-specific claims from general model knowledge.
- Reads the student's weak areas so "what should I practice?" is personal.
- Monthly message cap per student.

### 4.7 College admin dashboard
- Overview: batch readiness distribution, readiness by department, top 10 weak skills across the batch, weekly activity, quota usage.
- Students table: search, filter by batch/department/readiness, CSV export.
- Student detail: read-only view of reports and resume.
- Invites: CSV upload with validation and error rows shown, invite links, resend.

### 4.8 Platform admin (for me)
- Colleges, batches, plans and quotas.
- Question bank editor: add, tag (company type, role, stage, difficulty, source), review workflow (draft, reviewed, retired). Only reviewed questions are used in interviews.
- Knowledge base editor: add documents, review, then chunk and embed on approval.
- Cost dashboard: cost per interview (p50, p95), cost per college, cost per feature, daily spend, provider error and fallback rates.
- Golden set tool: human raters score sampled interviews blind on the same rubric; scores feed the eval harness.

### 4.9 Landing site
Keep the structure and feel of the existing home page: floating pill nav (Product, Philosophy, Features, Pricing, plus "For Colleges"), dark hero with the "The sky is not the limit. It is the foundation." headline, a light Product section with the live-interview device card, a Philosophy section (Vyoman means sky in Sanskrit), a Features grid of cards, Pricing, and a dark footer. Drop the Careers and Community sections until they have real content.

Pages: Home, For Colleges, For Students, Pricing, About, Book a Demo, Privacy Policy, Terms.
- Home: the existing hero and sections above, with the feature grid updated to the real feature set (AI interview, evidence-backed reports, resume builder, resume scanner, prep assistant, placement dashboard), a section on why scores are trustworthy (every score shows the exact lines it is based on), and calls to action for both "Start practicing" and "Book a demo for your college".
- For Colleges: dashboard screenshots from the real app, pilot program, data privacy and India data residency.
- Pricing: per-student-per-year college plan and student plan, with prices as clearly marked placeholders for me to fill in.
- Book a Demo form writes to a `demo_requests` table and emails me via Resend.
- Do not invent testimonials, customer logos, user counts or outcome statistics. Use clearly marked placeholders where those would go.
- Privacy Policy and Terms are placeholder drafts marked "needs legal review", referencing India's DPDP Act.
- SEO: metadata, Open Graph images, sitemap, robots.txt. Fast on mobile.

---

## Part 5: Data model (minimum)

Design the exact columns yourself; these tables must exist:

`colleges`, `batches`, `profiles` (user, role, college, batch, department, graduation year), `invitations`, `resumes` (versioned JSON, primary flag), `job_descriptions`, `resume_scans`, `question_bank`, `interview_templates`, `interviews`, `interview_turns` (question text and source, audio keys, transcript, STT provider, latency), `interview_reports` (scores with evidence, model id, prompt version), `weak_areas`, `kb_documents`, `kb_chunks` (pgvector embedding), `chat_sessions`, `chat_messages` (with citations), `usage_events` (user, college, feature, provider, model, units such as audio seconds, input tokens, output tokens, characters, cost in paise, timestamp), `plans`, `quotas`, `tts_cache`, `demo_requests`, `golden_set_ratings`, `payments`.

Every provider call (STT, TTS, LLM, embeddings, OCR) writes one `usage_events` row. Interviews store their total cost.

---

## Part 6: Working rules

When you have enough information to act, act. Do not re-derive facts already established in this spec, re-litigate a decision already made here, or narrate options you will not pursue. If you are weighing a choice the spec doesn't cover, make a recommendation, pick it, and record it in `docs/DECISIONS.md` with one line of reasoning.

Don't add features, refactor, or introduce abstractions beyond what the task requires. Don't design for hypothetical future requirements: do the simplest thing that works well. Avoid premature abstraction and half-finished implementations. Don't add error handling, fallbacks, or validation for scenarios that cannot happen. Trust internal code and framework guarantees. Only validate at system boundaries (user input, external APIs). The provider fallbacks in this spec are real requirements, not speculative ones. Recruiter screening, real-time voice, coding rounds and SSO are out of scope for this build.

Never call paid provider APIs in automated tests. Use recorded fixtures and mocks. Real provider calls happen only in the Phase 1 cost test and in manual verification.

Never commit secrets. Keep every key in `.env` files listed in `.env.example` with a comment explaining each.

Before reporting progress, audit each claim against a tool result from this session. Only report work you can point to evidence for; if something is not yet verified, say so explicitly. Report outcomes faithfully: if tests fail, say so with the output; if a step was skipped, say that; when something is done and verified, state it plainly without hedging.

Pause for me only when the work genuinely requires me: a destructive or irreversible action, a real scope change, input that only I can provide (API keys, prices, brand assets, a go/no-go decision), or the checkpoints marked in Part 7. If you hit one of these, ask and end the turn, rather than ending on a promise.

Between checkpoints, work autonomously. For reversible actions that follow from this spec, proceed without asking. Before ending your turn, check your last paragraph. If it is a plan, a list of next steps, or a promise about work you have not done ("I'll…"), do that work now. End your turn only when the phase is complete or you are blocked on input only I can provide.

Delegate independent subtasks to subagents and keep working while they run. Intervene if a subagent goes off track or is missing relevant context. At the end of every phase, have a fresh subagent that did not write the code verify the phase against its acceptance criteria in this spec, and fix what it finds before reporting.

Keep `docs/PROGRESS.md` updated at the end of each phase: what was built, what was verified and how, what is pending. Store reusable lessons in `docs/lessons/`, one lesson per file with a one-line summary at the top. Record corrections and confirmed approaches alike, including why they mattered. Update an existing note rather than creating a duplicate; delete notes that turn out to be wrong.

You have ample context remaining. Do not stop, summarize, or suggest a new session on account of context limits. Continue the work.

When you finish a phase, write the summary for someone who didn't watch you work. Lead with the outcome in one sentence. Then what was verified and how, what isn't working yet, and the one or two things you need from me, each explained plainly. Write complete sentences, spell out terms, and give each file or command its own plain-language clause.

---

## Part 7: Build phases

Each phase lists acceptance criteria. A phase is done only when every criterion is verified with evidence.

### Phase 0: Scaffold
- Monorepo per Part 3, Next.js app, FastAPI service with health endpoint, Supabase project wiring, `.env.example`, CI running lint, typecheck and tests for both apps, `docs/PROGRESS.md` and `docs/DECISIONS.md`.
- Acceptance: CI passes on a clean clone; web and engine both run locally with one documented command each.
- Checkpoint if any required API key is missing: list exactly which keys you need and where I get each one, then stop.

### Phase 1: Interview cost and latency test (go/no-go gate)
- Minimal internal page (no styling needed) that runs a full 20-minute-style turn-based interview end to end with real providers: question bank sample, TTS with caching, recording with VAD, R2 upload, Groq STT with Sarvam fallback, Flash-Lite follow-ups, evaluation report with evidence, `usage_events` logging.
- Script `eval/cost_report.py` that prints, for all test interviews: cost per interview broken down by provider, p50 and p95 turn latency, STT fallback rate.
- Acceptance: at least 5 complete test interviews recorded (I will do some myself; you can generate synthetic audio for others); cost report produced from real `usage_events` rows.
- CHECKPOINT: report the real cost per interview and latency numbers, compare them with the targets (under ₹15 per interview, p50 turn latency under 2.5s), and stop. I decide whether to proceed.

### Phase 2: Data model, auth, roles, landing site
- Full schema, RLS policies, seed data, auth flows, role-based routing, invitation flow.
- RLS tests proving a student cannot read another student's data and a college admin cannot read another college's data.
- In parallel (subagent): the full landing site per 4.9.
- Acceptance: RLS tests pass; seed college logs in as each role and sees only what it should; landing pages pass Lighthouse performance and accessibility at 90 or above on mobile; demo form writes a row and sends an email.

### Phase 3: Resume builder and scanner
- Per 4.3 and 4.4, writing to the student profile.
- Acceptance: a built resume exports a PDF whose text extracts cleanly; the scanner correctly parses 5 sample resumes (include one scanned PDF) into the JSON structure; bullet rewriting never adds a number that wasn't in the input or the student's answer (write a test with fixtures for this).

### Phase 4: Interview product
- Turn the Phase 1 loop into the real product per 4.5: setup screen, polished interview room (question audio, recording state, timer, VAD feedback, acknowledgement clips), queue-based report generation with retries, report page, history, weak areas written to the profile, quotas and hard limits, MediaPipe aggregates.
- Acceptance: a full interview completes in the browser on desktop and on mobile Chrome; killing the report worker mid-job and restarting it still produces the report; quota exhaustion blocks a new interview with a clear message; every report score has evidence quotes that exist verbatim in the transcript (automated check).

### Phase 5: College admin and platform admin
- Per 4.7 and 4.8, including cost dashboard and question bank and KB review workflows.
- Acceptance: CSV invite with deliberately bad rows shows row-level errors; dashboard numbers match a direct SQL query on seed data; cost dashboard totals match the sum of `usage_events`.

### Phase 6: Prep assistant
- Per 4.6, built on the reviewed knowledge base.
- Acceptance: on a test set of 20 questions (10 covered by the KB, 10 not covered), it cites correct sources for the covered ones and declines the uncovered ones without inventing an answer. Commit the test set to `eval/`.

### Phase 7: Quality harness and hardening
- `eval/` harness: runs the evaluation prompt against the golden set and reports how often AI scores land within 1 point of human scores, per dimension. Prompt versions are compared side by side.
- Rate limits, Sentry, PostHog, k6 load test script simulating 500 concurrent interviews against mocked providers, Cloud Run and Vercel deploy workflows, Razorpay for student add-on packs.
- Acceptance: load test passes with p95 engine response under target on mocked providers; deploy workflows succeed to a staging environment; eval harness runs with the seed golden set.
- CHECKPOINT: summarize production readiness, open risks, and anything I must do manually before launch.
