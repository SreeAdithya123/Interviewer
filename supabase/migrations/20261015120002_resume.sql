-- Phase 2 data model: resume builder and scanner.
-- Tables: resumes, job_descriptions, resume_scans.
-- See docs/BUILD_SPEC.md Part 4.3 (resume builder) and Part 4.4 (resume
-- scanner).

-- ---------------------------------------------------------------------------
-- resumes: JSON Resume-shaped data, versioned, one marked primary.
-- ---------------------------------------------------------------------------
create table public.resumes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null default 'My Resume',
  template text not null default 'minimal-ats',
  data jsonb not null default '{}',
  version int not null default 1,
  is_primary boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index resumes_user_id_idx on public.resumes(user_id);

-- At most one primary resume per student.
create unique index resumes_one_primary_per_user_idx
  on public.resumes(user_id)
  where is_primary;

create trigger resumes_set_updated_at
  before update on public.resumes
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- job_descriptions: a pasted JD, optionally used by a resume_scans row.
-- ---------------------------------------------------------------------------
create table public.job_descriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text,
  company_name text,
  raw_text text not null,
  parsed_skills jsonb,
  source_url text,
  created_at timestamptz not null default now()
);

create index job_descriptions_user_id_idx on public.job_descriptions(user_id);

-- ---------------------------------------------------------------------------
-- resume_scans: the four honest checks from Part 4.4 (parse health, JD
-- match, bullet quality, formatting risks). jd_match is nullable because a
-- scan without a pasted job description skips that check entirely.
-- ---------------------------------------------------------------------------
create table public.resume_scans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  resume_id uuid references public.resumes(id) on delete set null,
  job_description_id uuid references public.job_descriptions(id) on delete set null,
  parsed_resume jsonb not null,
  parse_health jsonb not null,
  jd_match jsonb,
  bullet_quality jsonb not null,
  formatting_risks jsonb not null,
  created_at timestamptz not null default now()
);

create index resume_scans_user_id_idx on public.resume_scans(user_id);
create index resume_scans_resume_id_idx on public.resume_scans(resume_id);
