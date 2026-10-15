-- Phase 2 data model: row level security for every user/college-scoped
-- table, per docs/BUILD_SPEC.md Part 4.1:
--   "Every student belongs to one college and one batch. RLS enforces:
--    students see only their own rows; college admins see only their
--    college's rows; platform admins see everything."
-- and Part 4.7 ("Student detail: read-only view of reports and resume" —
-- i.e. a college_admin's access is read-only everywhere below).
--
-- Not every table gets RLS. question_bank, interview_templates,
-- kb_documents, kb_chunks, plans and tts_cache hold platform-curated or
-- public reference data, not user- or college-scoped rows, so Part 4.1's
-- rules don't apply to them; the final section of this file locks down
-- their default Supabase grants instead (see its header comment).
--
-- Written and self-reviewed without a live Postgres/Supabase instance to
-- run `supabase db push`, `supabase test db`, or the Part 2 "RLS tests
-- proving a student cannot read another student's data" against. See
-- supabase/migrations/README.md for exactly what this does and doesn't
-- verify.

-- =============================================================================
-- Helper functions
-- =============================================================================
-- Each is STABLE (safe to call more than once per statement) and SECURITY
-- DEFINER, running as the function owner (the migration role, which owns
-- public.profiles and is therefore exempt from its RLS) rather than as the
-- calling role. Without that, current_user_role() would itself be subject
-- to profiles' own RLS policies below, which call current_user_role() —
-- infinite recursion. This is also what keeps every policy below a single
-- function call instead of a repeated subquery, per the task's "use a
-- helper SQL function ... to keep policies DRY" instruction.

create or replace function public.current_user_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid();
$$;

create or replace function public.current_user_college_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select college_id from public.profiles where id = auth.uid();
$$;

create or replace function public.is_platform_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.current_user_role() = 'platform_admin';
$$;

create or replace function public.is_college_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.current_user_role() = 'college_admin';
$$;

-- profile_college_id: for tables that only carry user_id (e.g. resumes),
-- so a college_admin's read policy can still check "does this row's owner
-- belong to my college" without a RLS-recursion-prone inline subquery
-- against profiles repeated in every policy.
create or replace function public.profile_college_id(p_user_id uuid)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select college_id from public.profiles where id = p_user_id;
$$;

-- interview_owner_id / interview_college_id: for interview_turns, which
-- has no user_id/college_id of its own.
create or replace function public.interview_owner_id(p_interview_id uuid)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select user_id from public.interviews where id = p_interview_id;
$$;

create or replace function public.interview_college_id(p_interview_id uuid)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select college_id from public.interviews where id = p_interview_id;
$$;

-- chat_session_owner_id: for chat_messages, which has no user_id of its
-- own.
create or replace function public.chat_session_owner_id(p_session_id uuid)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select user_id from public.chat_sessions where id = p_session_id;
$$;

-- =============================================================================
-- colleges
-- =============================================================================
alter table public.colleges enable row level security;

create policy colleges_select on public.colleges
  for select
  using (
    id = public.current_user_college_id()
    or public.is_platform_admin()
  );

create policy colleges_insert on public.colleges
  for insert
  with check (public.is_platform_admin());

create policy colleges_update on public.colleges
  for update
  using (public.is_platform_admin())
  with check (public.is_platform_admin());

create policy colleges_delete on public.colleges
  for delete
  using (public.is_platform_admin());

-- =============================================================================
-- batches
-- =============================================================================
alter table public.batches enable row level security;

create policy batches_select on public.batches
  for select
  using (
    college_id = public.current_user_college_id()
    or public.is_platform_admin()
  );

create policy batches_insert on public.batches
  for insert
  with check (public.is_platform_admin());

create policy batches_update on public.batches
  for update
  using (public.is_platform_admin())
  with check (public.is_platform_admin());

create policy batches_delete on public.batches
  for delete
  using (public.is_platform_admin());

-- =============================================================================
-- profiles
-- =============================================================================
alter table public.profiles enable row level security;

create policy profiles_select on public.profiles
  for select
  using (
    id = auth.uid()
    or (public.is_college_admin() and college_id = public.current_user_college_id())
    or public.is_platform_admin()
  );

create policy profiles_update on public.profiles
  for update
  using (id = auth.uid() or public.is_platform_admin())
  with check (id = auth.uid() or public.is_platform_admin());

-- Everyday signup inserts go through handle_new_user() (0001), which runs
-- as the table owner and so is exempt from this policy entirely — this one
-- only governs a direct authenticated-role INSERT, which platform_admin
-- tooling may occasionally need (e.g. backfills) and nobody else should.
create policy profiles_insert on public.profiles
  for insert
  with check (public.is_platform_admin());

create policy profiles_delete on public.profiles
  for delete
  using (public.is_platform_admin());

-- =============================================================================
-- invitations
-- =============================================================================
alter table public.invitations enable row level security;

create policy invitations_select on public.invitations
  for select
  using (
    (public.is_college_admin() and college_id = public.current_user_college_id())
    or public.is_platform_admin()
  );

create policy invitations_insert on public.invitations
  for insert
  with check (
    (public.is_college_admin() and college_id = public.current_user_college_id())
    or public.is_platform_admin()
  );

create policy invitations_update on public.invitations
  for update
  using (
    (public.is_college_admin() and college_id = public.current_user_college_id())
    or public.is_platform_admin()
  )
  with check (
    (public.is_college_admin() and college_id = public.current_user_college_id())
    or public.is_platform_admin()
  );

create policy invitations_delete on public.invitations
  for delete
  using (public.is_platform_admin());

-- =============================================================================
-- resumes
-- =============================================================================
alter table public.resumes enable row level security;

create policy resumes_select on public.resumes
  for select
  using (
    user_id = auth.uid()
    or (public.is_college_admin() and public.profile_college_id(user_id) = public.current_user_college_id())
    or public.is_platform_admin()
  );

create policy resumes_insert on public.resumes
  for insert
  with check (user_id = auth.uid() or public.is_platform_admin());

create policy resumes_update on public.resumes
  for update
  using (user_id = auth.uid() or public.is_platform_admin())
  with check (user_id = auth.uid() or public.is_platform_admin());

create policy resumes_delete on public.resumes
  for delete
  using (user_id = auth.uid() or public.is_platform_admin());

-- =============================================================================
-- job_descriptions (no college_admin visibility: Part 4.7 scopes college
-- admin's read-only student view to "reports and resume" only)
-- =============================================================================
alter table public.job_descriptions enable row level security;

create policy job_descriptions_select on public.job_descriptions
  for select
  using (user_id = auth.uid() or public.is_platform_admin());

create policy job_descriptions_insert on public.job_descriptions
  for insert
  with check (user_id = auth.uid() or public.is_platform_admin());

create policy job_descriptions_update on public.job_descriptions
  for update
  using (user_id = auth.uid() or public.is_platform_admin())
  with check (user_id = auth.uid() or public.is_platform_admin());

create policy job_descriptions_delete on public.job_descriptions
  for delete
  using (user_id = auth.uid() or public.is_platform_admin());

-- =============================================================================
-- resume_scans: SELECT/DELETE only. A scan is produced by the engine
-- (service role, which bypasses RLS) after it actually calls Gemini and
-- checks quota, so there is no insert/update policy for the authenticated
-- role — the same billable-action rule applied to interviews,
-- interview_turns, interview_reports, weak_areas and chat_messages below.
-- =============================================================================
alter table public.resume_scans enable row level security;

create policy resume_scans_select on public.resume_scans
  for select
  using (user_id = auth.uid() or public.is_platform_admin());

create policy resume_scans_delete on public.resume_scans
  for delete
  using (user_id = auth.uid() or public.is_platform_admin());

-- =============================================================================
-- interviews: SELECT only for the authenticated role. Starting an
-- interview enforces a quota and builds the stage plan server-side (Part
-- 4.5), so the engine's service role is the only writer; DELETE is left to
-- platform_admin only (no routine reason for a client to delete history).
-- =============================================================================
alter table public.interviews enable row level security;

create policy interviews_select on public.interviews
  for select
  using (
    user_id = auth.uid()
    or (public.is_college_admin() and college_id = public.current_user_college_id())
    or public.is_platform_admin()
  );

create policy interviews_delete on public.interviews
  for delete
  using (public.is_platform_admin());

-- =============================================================================
-- interview_turns: SELECT only, ownership resolved via interview_id.
-- =============================================================================
alter table public.interview_turns enable row level security;

create policy interview_turns_select on public.interview_turns
  for select
  using (
    public.interview_owner_id(interview_id) = auth.uid()
    or (public.is_college_admin() and public.interview_college_id(interview_id) = public.current_user_college_id())
    or public.is_platform_admin()
  );

-- =============================================================================
-- interview_reports: SELECT only; written by the engine on report
-- completion.
-- =============================================================================
alter table public.interview_reports enable row level security;

create policy interview_reports_select on public.interview_reports
  for select
  using (
    user_id = auth.uid()
    or (public.is_college_admin() and college_id = public.current_user_college_id())
    or public.is_platform_admin()
  );

-- =============================================================================
-- weak_areas: SELECT only; written back by the engine from a report or
-- scan.
-- =============================================================================
alter table public.weak_areas enable row level security;

create policy weak_areas_select on public.weak_areas
  for select
  using (
    user_id = auth.uid()
    or (public.is_college_admin() and college_id = public.current_user_college_id())
    or public.is_platform_admin()
  );

-- =============================================================================
-- chat_sessions: ordinary client CRUD (starting/renaming/deleting a chat
-- costs nothing by itself; the billable part is each message).
-- =============================================================================
alter table public.chat_sessions enable row level security;

create policy chat_sessions_select on public.chat_sessions
  for select
  using (user_id = auth.uid() or public.is_platform_admin());

create policy chat_sessions_insert on public.chat_sessions
  for insert
  with check (user_id = auth.uid() or public.is_platform_admin());

create policy chat_sessions_update on public.chat_sessions
  for update
  using (user_id = auth.uid() or public.is_platform_admin())
  with check (user_id = auth.uid() or public.is_platform_admin());

create policy chat_sessions_delete on public.chat_sessions
  for delete
  using (user_id = auth.uid() or public.is_platform_admin());

-- =============================================================================
-- chat_messages: SELECT only; both the student's question and the
-- assistant's answer are written by the engine (service role) after
-- retrieval + the LLM call, which is also where the monthly message cap
-- (Part 4.6) is enforced.
-- =============================================================================
alter table public.chat_messages enable row level security;

create policy chat_messages_select on public.chat_messages
  for select
  using (
    public.chat_session_owner_id(session_id) = auth.uid()
    or public.is_platform_admin()
  );

-- =============================================================================
-- usage_events: SELECT only. A pure system ledger — always written by the
-- engine's service role, never by an authenticated client.
-- =============================================================================
alter table public.usage_events enable row level security;

create policy usage_events_select on public.usage_events
  for select
  using (
    user_id = auth.uid()
    or (public.is_college_admin() and college_id = public.current_user_college_id())
    or public.is_platform_admin()
  );

-- =============================================================================
-- quotas: students/college admins can see their own consumption;
-- platform_admin manages limits.
-- =============================================================================
alter table public.quotas enable row level security;

create policy quotas_select on public.quotas
  for select
  using (
    (scope = 'user' and user_id = auth.uid())
    or (scope = 'college' and college_id = public.current_user_college_id() and public.is_college_admin())
    or public.is_platform_admin()
  );

create policy quotas_insert on public.quotas
  for insert
  with check (public.is_platform_admin());

create policy quotas_update on public.quotas
  for update
  using (public.is_platform_admin())
  with check (public.is_platform_admin());

create policy quotas_delete on public.quotas
  for delete
  using (public.is_platform_admin());

-- =============================================================================
-- payments: SELECT only. Rows are only ever created/updated by the
-- Razorpay webhook handler running with the service role — never trusted
-- from a client-authenticated write, since that would let a client mark
-- its own payment "captured".
-- =============================================================================
alter table public.payments enable row level security;

create policy payments_select on public.payments
  for select
  using (
    user_id = auth.uid()
    or (public.is_college_admin() and college_id = public.current_user_college_id())
    or public.is_platform_admin()
  );

-- =============================================================================
-- demo_requests: the only table here an unauthenticated (anon) visitor can
-- write to at all, since it is the public landing-site "Book a Demo" form.
-- =============================================================================
alter table public.demo_requests enable row level security;

create policy demo_requests_insert on public.demo_requests
  for insert
  to anon, authenticated
  with check (true);

create policy demo_requests_select on public.demo_requests
  for select
  using (public.is_platform_admin());

create policy demo_requests_update on public.demo_requests
  for update
  using (public.is_platform_admin())
  with check (public.is_platform_admin());

create policy demo_requests_delete on public.demo_requests
  for delete
  using (public.is_platform_admin());

-- =============================================================================
-- golden_set_ratings: internal to the platform_admin / eval harness; no
-- student or college_admin access at all.
-- =============================================================================
alter table public.golden_set_ratings enable row level security;

create policy golden_set_ratings_all on public.golden_set_ratings
  for all
  using (public.is_platform_admin())
  with check (public.is_platform_admin());

-- =============================================================================
-- Non-RLS tables hardening.
--
-- question_bank, interview_templates, kb_documents, kb_chunks, plans and
-- tts_cache hold no user- or college-scoped rows, so Part 4.1's RLS rule
-- doesn't apply and none of them get ALTER TABLE ... ENABLE ROW LEVEL
-- SECURITY. But a freshly created Supabase project's default privileges
-- still grant anon/authenticated broad access to every new public-schema
-- table regardless of RLS, so each one gets an explicit grant here instead
-- of being left on the default:
--   * question_bank / interview_templates: SELECT for any authenticated
--     user (the engine reads them while running an interview); no writes
--     from anon/authenticated at all — Part 4.8's review workflow is
--     mediated by the platform-admin tooling going through the engine's
--     service role, not a direct client write, so even platform_admin
--     edits these through the engine, not through their own browser JWT.
--   * plans: SELECT for anon too (the unauthenticated pricing page reads
--     it), no writes from anon/authenticated.
--   * kb_documents / kb_chunks: no anon/authenticated access at all,
--     neither read nor write — the prep assistant's retrieval runs
--     server-side in the engine and returns only cited titles/links via
--     chat_messages, which is RLS-protected above. Browsing the raw
--     knowledge base through PostgREST is never a legitimate client
--     operation.
--   * tts_cache: no anon/authenticated access at all; purely an
--     engine-internal cache.
-- service_role is unaffected by any REVOKE/GRANT here — it already holds
-- full privileges on every table and ignores RLS entirely.
-- =============================================================================

revoke insert, update, delete on public.question_bank from authenticated, anon;
grant select on public.question_bank to authenticated;

revoke insert, update, delete on public.interview_templates from authenticated, anon;
grant select on public.interview_templates to authenticated;

revoke all on public.kb_documents from authenticated, anon;
revoke all on public.kb_chunks from authenticated, anon;

revoke insert, update, delete on public.plans from authenticated, anon;
grant select on public.plans to authenticated, anon;

revoke all on public.tts_cache from authenticated, anon;
