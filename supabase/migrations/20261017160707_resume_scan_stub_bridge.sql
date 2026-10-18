-- Phase 1 (keyless slice) bridge: lets the resume scanner page save a scan
-- row for the signed-in caller even though there is no engine/service-role
-- writer yet (see docs/BUILD_SPEC.md Part 4.4 and the scope boundary in
-- docs/DECISIONS.md for why this exists and what replaces it).
--
-- 20261015120007_row_level_security.sql / 20261017150000_advisor_hardening.sql
-- deliberately gave `resume_scans` SELECT/DELETE policies only ("A scan is
-- produced by the engine (service role, which bypasses RLS) ... so there is
-- no insert/update policy for the authenticated role"). That is still the
-- right long-term shape — a real scan is a billable, quota-checked action
-- that must be written by a trusted server, not a browser client. But this
-- environment has no service-role key (see
-- 20261017160000_accept_invitation.sql's header for the same constraint),
-- and apps/web/lib/ai-stubs/scan-resume.ts only returns fake, clearly-marked
-- preview data until Gemini/OCR credentials exist (BUILD_SPEC Part 7 Phase
-- 1 is blocked on API keys) — there is nothing billable to protect yet.
--
-- So, exactly like accept_invitation(), this adds one narrowly-scoped
-- SECURITY DEFINER function instead of a blanket INSERT policy: it always
-- writes auth.uid() as the owner (never a client-supplied user id), and it
-- checks that any resume_id/job_description_id passed in actually belongs
-- to the caller before inserting. When the real engine (service role) is
-- wired up in Phase 1, this function should be dropped and replaced with a
-- real engine-side insert, matching interviews/interview_reports/etc.
create or replace function public.create_stub_resume_scan(
  p_resume_id uuid,
  p_job_description_id uuid,
  p_parsed_resume jsonb,
  p_parse_health jsonb,
  p_jd_match jsonb,
  p_bullet_quality jsonb,
  p_formatting_risks jsonb
)
returns public.resume_scans
language plpgsql
security definer
set search_path = public
as $$
declare
  v_scan public.resume_scans;
begin
  if auth.uid() is null then
    raise exception 'You must be signed in to scan a resume.';
  end if;

  if p_resume_id is not null and not exists (
    select 1 from public.resumes where id = p_resume_id and user_id = auth.uid()
  ) then
    raise exception 'Resume not found.';
  end if;

  if p_job_description_id is not null and not exists (
    select 1 from public.job_descriptions where id = p_job_description_id and user_id = auth.uid()
  ) then
    raise exception 'Job description not found.';
  end if;

  insert into public.resume_scans (
    user_id,
    resume_id,
    job_description_id,
    parsed_resume,
    parse_health,
    jd_match,
    bullet_quality,
    formatting_risks
  ) values (
    auth.uid(),
    p_resume_id,
    p_job_description_id,
    p_parsed_resume,
    p_parse_health,
    p_jd_match,
    p_bullet_quality,
    p_formatting_risks
  )
  returning * into v_scan;

  return v_scan;
end;
$$;

-- Same lockdown shape as accept_invitation(): only the authenticated role
-- (a signed-in browser session) can call this; anon has no session to scan
-- for, and service_role already bypasses grants entirely.
revoke all on function public.create_stub_resume_scan(uuid, uuid, jsonb, jsonb, jsonb, jsonb, jsonb) from public;
revoke all on function public.create_stub_resume_scan(uuid, uuid, jsonb, jsonb, jsonb, jsonb, jsonb) from anon;
grant execute on function public.create_stub_resume_scan(uuid, uuid, jsonb, jsonb, jsonb, jsonb, jsonb) to authenticated;
