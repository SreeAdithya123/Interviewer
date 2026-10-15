-- Phase 2 data model: landing-site lead capture and the golden-set eval
-- tool.
-- Tables: demo_requests, golden_set_ratings.
-- See docs/BUILD_SPEC.md Part 4.9 ("Book a Demo form writes to a
-- demo_requests table") and Part 4.8 ("Golden set tool: human raters score
-- sampled interviews blind on the same rubric").

-- ---------------------------------------------------------------------------
-- demo_requests: filled in by an unauthenticated visitor on the public
-- landing site. Columns match exactly what
-- apps/web/app/api/demo-requests/route.ts inserts (collegeName,
-- contactName, email, phone, batchSize, message) — college_name and phone
-- are required by that route's validation, so NOT NULL here mirrors it;
-- batch_size/message are optional there too.
-- ---------------------------------------------------------------------------
create table public.demo_requests (
  id uuid primary key default gen_random_uuid(),
  college_name text not null,
  contact_name text not null,
  email text not null,
  phone text not null,
  batch_size text,
  message text,
  status text not null default 'new'
    check (status in ('new', 'contacted', 'scheduled', 'closed')),
  created_at timestamptz not null default now()
);

create index demo_requests_status_idx on public.demo_requests(status);

-- ---------------------------------------------------------------------------
-- golden_set_ratings: a human rater's blind score of a sampled interview,
-- compared against the AI evaluation for the eval harness (Part 4.8,
-- Part 7 Phase 7). Raters are internal (platform_admin); see 0007.
-- ---------------------------------------------------------------------------
create table public.golden_set_ratings (
  id uuid primary key default gen_random_uuid(),
  interview_id uuid not null references public.interviews(id) on delete cascade,
  interview_report_id uuid references public.interview_reports(id) on delete set null,
  rater_id uuid references public.profiles(id) on delete set null,
  rubric_scores jsonb not null,
  rater_notes text,
  prompt_version_compared text,
  created_at timestamptz not null default now()
);

create index golden_set_ratings_interview_id_idx on public.golden_set_ratings(interview_id);
