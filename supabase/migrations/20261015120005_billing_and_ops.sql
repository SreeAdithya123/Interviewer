-- Phase 2 data model: usage metering, plans/quotas, the TTS cache, and
-- payments.
-- Tables: usage_events, plans, quotas, tts_cache, payments.
-- See docs/BUILD_SPEC.md Part 1 (margins/cost per interview), Part 4.8
-- (cost dashboard), Part 4.9 (pricing) and Part 2 (Razorpay, late phase).
--
-- plans is public pricing reference data, not user- or college-scoped, so
-- it is deliberately left without row level security in 0007 — see that
-- file's header comment for its access model instead.

-- ---------------------------------------------------------------------------
-- usage_events: one row per provider call (STT, TTS, LLM, embeddings, OCR),
-- per Part 5 ("Every provider call ... writes one usage_events row").
-- user_id/college_id are nullable because not every event is tied to one
-- student (e.g. a KB embedding run during document review).
-- ---------------------------------------------------------------------------
create table public.usage_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete set null,
  college_id uuid references public.colleges(id) on delete set null,
  feature text not null
    check (feature in (
      'interview', 'resume_scan', 'resume_parse', 'chat_message',
      'tts', 'stt', 'embedding', 'ocr'
    )),
  provider text not null,
  model text,
  units jsonb not null default '{}',
  cost_paise int not null default 0,
  interview_id uuid references public.interviews(id) on delete set null,
  chat_session_id uuid references public.chat_sessions(id) on delete set null,
  resume_scan_id uuid references public.resume_scans(id) on delete set null,
  created_at timestamptz not null default now()
);

create index usage_events_user_id_idx on public.usage_events(user_id);
create index usage_events_college_id_idx on public.usage_events(college_id);
create index usage_events_created_at_idx on public.usage_events(created_at);
create index usage_events_feature_idx on public.usage_events(feature);

-- ---------------------------------------------------------------------------
-- plans: per-student and per-college pricing/quota plans (Part 4.9).
-- price_paise is expected to hold placeholder values until real pricing is
-- set (see docs/DECISIONS.md / seed data) — the spec explicitly says
-- prices are "clearly marked placeholders".
-- ---------------------------------------------------------------------------
create table public.plans (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  audience text not null check (audience in ('student', 'college')),
  billing_period text not null default 'yearly'
    check (billing_period in ('monthly', 'yearly')),
  price_paise int not null,
  currency text not null default 'INR',
  interview_quota_per_period int,
  resume_scan_quota_per_period int,
  chat_message_quota_per_period int,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger plans_set_updated_at
  before update on public.plans
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- quotas: per-student and per-college quota consumption for a given
-- period, per feature. Exactly one of user_id/college_id is set, matching
-- `scope`; two partial unique indexes (rather than one composite unique
-- constraint) enforce one row per subject+feature+period, because a plain
-- composite UNIQUE constraint treats NULL user_id/college_id values as
-- always distinct and would silently allow duplicate college-scope rows.
-- ---------------------------------------------------------------------------
create table public.quotas (
  id uuid primary key default gen_random_uuid(),
  scope text not null check (scope in ('user', 'college')),
  user_id uuid references public.profiles(id) on delete cascade,
  college_id uuid references public.colleges(id) on delete cascade,
  feature text not null
    check (feature in ('interview', 'resume_scan', 'chat_message')),
  period_start date not null,
  period_end date not null,
  limit_units int not null,
  used_units int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint quotas_scope_reference check (
    (scope = 'user' and user_id is not null and college_id is null)
    or (scope = 'college' and college_id is not null and user_id is null)
  )
);

create index quotas_user_id_idx on public.quotas(user_id);
create index quotas_college_id_idx on public.quotas(college_id);

create unique index quotas_user_period_idx
  on public.quotas(user_id, feature, period_start)
  where scope = 'user';

create unique index quotas_college_period_idx
  on public.quotas(college_id, feature, period_start)
  where scope = 'college';

create trigger quotas_set_updated_at
  before update on public.quotas
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- tts_cache: TTS audio cached in R2 by hash of (text, voice), per Part 2.
-- ---------------------------------------------------------------------------
create table public.tts_cache (
  id uuid primary key default gen_random_uuid(),
  cache_key text not null unique,
  text_hash text not null,
  voice text not null,
  audio_key text not null,
  characters int not null,
  provider text not null default 'sarvam',
  hit_count int not null default 0,
  created_at timestamptz not null default now(),
  last_used_at timestamptz not null default now()
);

create index tts_cache_voice_idx on public.tts_cache(voice);

-- ---------------------------------------------------------------------------
-- payments: Razorpay payments, for either a student add-on pack or a
-- college's institutional plan (Part 2, Part 7 Phase 7).
-- ---------------------------------------------------------------------------
create table public.payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete set null,
  college_id uuid references public.colleges(id) on delete set null,
  plan_id uuid references public.plans(id) on delete set null,
  razorpay_order_id text unique,
  razorpay_payment_id text unique,
  amount_paise int not null,
  currency text not null default 'INR',
  status text not null default 'created'
    check (status in ('created', 'authorized', 'captured', 'failed', 'refunded')),
  receipt text,
  notes jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint payments_payer_reference check (user_id is not null or college_id is not null)
);

create index payments_user_id_idx on public.payments(user_id);
create index payments_college_id_idx on public.payments(college_id);

create trigger payments_set_updated_at
  before update on public.payments
  for each row execute function public.set_updated_at();
