-- Phase 2 data model: the AI interview product.
-- Tables: question_bank, interview_templates, interviews, interview_turns,
-- interview_reports, weak_areas.
-- See docs/BUILD_SPEC.md Part 4.5 (AI interview) and Part 4.8 (question
-- bank review workflow).
--
-- question_bank and interview_templates are platform-curated reference
-- data, not user- or college-scoped, so they are deliberately left without
-- row level security in 0007 — see that file's header comment for their
-- write-access model instead.

-- ---------------------------------------------------------------------------
-- question_bank: curated questions, tagged and reviewed before use. Only
-- status = 'reviewed' rows are selected by the engine when it builds an
-- interview plan (Part 4.8: "Only reviewed questions are used in
-- interviews" — enforced by the engine's query, not by this table alone).
-- ---------------------------------------------------------------------------
create table public.question_bank (
  id uuid primary key default gen_random_uuid(),
  stage text not null
    check (stage in ('intro', 'resume_deep_dive', 'technical', 'behavioral', 'closing')),
  interview_type text not null
    check (interview_type in ('hr', 'technical', 'behavioral', 'mixed')),
  company_type text,
  role text,
  difficulty text not null
    check (difficulty in ('easy', 'medium', 'hard')),
  question_text text not null,
  ideal_answer_notes text,
  tags text[] not null default '{}',
  source text,
  status text not null default 'draft'
    check (status in ('draft', 'reviewed', 'retired')),
  created_by uuid references public.profiles(id) on delete set null,
  reviewed_by uuid references public.profiles(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index question_bank_lookup_idx
  on public.question_bank(interview_type, stage, difficulty, status);

create trigger question_bank_set_updated_at
  before update on public.question_bank
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- interview_templates: the stage-machine plan defaults the engine reads
-- when it sets up a new interview (Part 4.5 step 2).
-- ---------------------------------------------------------------------------
create table public.interview_templates (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  interview_type text not null
    check (interview_type in ('hr', 'technical', 'behavioral', 'mixed')),
  stages jsonb not null,
  max_follow_ups_per_question int not null default 2,
  max_answer_seconds int not null default 180,
  max_duration_seconds int not null default 1500,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger interview_templates_set_updated_at
  before update on public.interview_templates
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- interviews: one row per attempt. college_id is denormalized from the
-- owning profile at creation time so the college admin dashboard (Part 4.7)
-- and its RLS policy can filter by college without joining through
-- profiles on every row.
-- ---------------------------------------------------------------------------
create table public.interviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  college_id uuid references public.colleges(id) on delete set null,
  template_id uuid references public.interview_templates(id) on delete set null,
  interview_type text not null
    check (interview_type in ('hr', 'technical', 'behavioral', 'mixed')),
  target_role text,
  company_type text,
  difficulty text not null
    check (difficulty in ('easy', 'medium', 'hard')),
  status text not null default 'pending'
    check (status in ('pending', 'in_progress', 'completed', 'abandoned')),
  current_stage text
    check (current_stage is null or current_stage in (
      'intro', 'resume_deep_dive', 'technical', 'behavioral', 'closing'
    )),
  started_at timestamptz,
  ended_at timestamptz,
  duration_seconds int,
  eye_contact_pct numeric(5,2),
  posture_stability_pct numeric(5,2),
  total_cost_paise int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index interviews_user_id_idx on public.interviews(user_id);
create index interviews_college_id_idx on public.interviews(college_id);
create index interviews_status_idx on public.interviews(status);

create trigger interviews_set_updated_at
  before update on public.interviews
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- interview_turns: one row per question asked (and its answer), including
-- LLM-written follow-ups. No user_id/college_id of its own — ownership is
-- resolved through interview_id via the helper functions defined in 0007.
-- ---------------------------------------------------------------------------
create table public.interview_turns (
  id uuid primary key default gen_random_uuid(),
  interview_id uuid not null references public.interviews(id) on delete cascade,
  turn_number int not null,
  stage text not null
    check (stage in ('intro', 'resume_deep_dive', 'technical', 'behavioral', 'closing')),
  question_text text not null,
  question_source text not null
    check (question_source in ('question_bank', 'resume_specific', 'follow_up')),
  question_bank_id uuid references public.question_bank(id) on delete set null,
  is_follow_up boolean not null default false,
  follow_up_of_turn_id uuid references public.interview_turns(id) on delete set null,
  question_audio_key text,
  answer_audio_key text,
  answer_duration_seconds numeric(6,2),
  transcript text,
  stt_provider text
    check (stt_provider is null or stt_provider in ('groq', 'sarvam')),
  stt_fallback_used boolean not null default false,
  latency_ms int,
  created_at timestamptz not null default now(),
  unique (interview_id, turn_number)
);

create index interview_turns_interview_id_idx on public.interview_turns(interview_id);

-- ---------------------------------------------------------------------------
-- interview_reports: one per interview. scores/overall_score/model_id/
-- prompt_version are nullable because a row is created with status =
-- 'pending' as soon as the report job is queued (Phase 4: "queue-based
-- report generation with retries") and only filled in once the evaluation
-- call actually completes.
-- ---------------------------------------------------------------------------
create table public.interview_reports (
  id uuid primary key default gen_random_uuid(),
  interview_id uuid not null unique references public.interviews(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  college_id uuid references public.colleges(id) on delete set null,
  status text not null default 'pending'
    check (status in ('pending', 'completed', 'failed')),
  scores jsonb,
  overall_score numeric(5,2),
  strengths jsonb not null default '[]',
  weak_areas_summary jsonb not null default '[]',
  practice_actions jsonb not null default '[]',
  eye_contact_pct numeric(5,2),
  posture_stability_pct numeric(5,2),
  model_id text,
  prompt_version text,
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index interview_reports_user_id_idx on public.interview_reports(user_id);
create index interview_reports_college_id_idx on public.interview_reports(college_id);

create trigger interview_reports_set_updated_at
  before update on public.interview_reports
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- weak_areas: written back to the student profile from either an
-- interview report or a resume scan (Part 4.2, Part 4.5 step 8).
-- ---------------------------------------------------------------------------
create table public.weak_areas (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  college_id uuid references public.colleges(id) on delete set null,
  skill text not null,
  severity text not null
    check (severity in ('low', 'medium', 'high')),
  source text not null
    check (source in ('interview_report', 'resume_scan')),
  source_interview_id uuid references public.interviews(id) on delete set null,
  source_resume_scan_id uuid references public.resume_scans(id) on delete set null,
  notes text,
  is_resolved boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint weak_areas_source_reference check (
    (source = 'interview_report' and source_interview_id is not null)
    or (source = 'resume_scan' and source_resume_scan_id is not null)
  )
);

create index weak_areas_user_id_idx on public.weak_areas(user_id);
create index weak_areas_college_id_idx on public.weak_areas(college_id);

create trigger weak_areas_set_updated_at
  before update on public.weak_areas
  for each row execute function public.set_updated_at();
