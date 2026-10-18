-- Phase 1 (keyless slice) bridge: lets the AI-interview pages
-- (apps/web/app/app/interview/...) create a real interview, persist its
-- turn-by-turn transcript, and save its report row for the signed-in
-- caller, even though there is no engine/service-role writer yet.
--
-- Exactly the same situation as 20261017170000_resume_scan_stub_bridge.sql
-- (read that file's header first — this one assumes it): 0007/advisor
-- hardening deliberately left `interviews`/`interview_turns`/
-- `interview_reports` SELECT-only ("the engine's service role is the only
-- writer" / "written by the engine on report completion"), which is the
-- right long-term shape for a billable, quota-checked, LLM-graded action.
-- But this environment has no service-role key, and the real engine
-- doesn't exist yet (BUILD_SPEC Part 7 Phase 1 is blocked on provider API
-- keys) — apps/web/lib/ai-stubs/interview-engine.ts only ever returns
-- fixture questions and a fixture-derived report, clearly labeled as a
-- preview in the UI. There is nothing billable or ungraded-by-a-real-model
-- to protect yet.
--
-- So, exactly like create_stub_resume_scan(), this adds three narrowly
-- scoped SECURITY DEFINER functions instead of blanket INSERT/UPDATE
-- policies. Each one always acts as auth.uid() (never a client-supplied
-- user id) and checks the interview it's touching already belongs to the
-- caller before writing anything. When the real engine (service role) is
-- wired up in Phase 1, these three should be dropped and replaced with
-- real engine-side writes, matching resume_scans/chat_messages' eventual
-- path back to engine-only writes.
--
-- Deliberately NOT written here: audio_key handling (the room page keeps
-- recorded blobs in-browser only in stub mode, per
-- apps/web/app/app/interview/[interviewId]/page.tsx's own header comment —
-- there is no R2 upload wired yet either, so question_audio_key/
-- answer_audio_key are always left null), and the separate `weak_areas`
-- table (the report page reads weak areas straight off
-- interview_reports.weak_areas_summary; writing the normalized
-- `weak_areas` table too is real-engine work, out of scope here — see
-- docs/DECISIONS.md).

-- ---------------------------------------------------------------------------
-- create_stub_interview: step 1 of BUILD_SPEC Part 4.5 — "Student picks
-- interview type, target role, company type, difficulty" → a real
-- `interviews` row, status 'pending'. No quota check (that's a real-engine
-- concern per 4.5's "Quotas ... enforced before an interview starts" — not
-- meaningful to enforce against fixture data).
-- ---------------------------------------------------------------------------
create or replace function public.create_stub_interview(
  p_interview_type text,
  p_target_role text,
  p_company_type text,
  p_difficulty text
)
returns public.interviews
language plpgsql
security definer
set search_path = public
as $$
declare
  v_interview public.interviews;
begin
  if auth.uid() is null then
    raise exception 'You must be signed in to start an interview.';
  end if;

  insert into public.interviews (
    user_id,
    college_id,
    interview_type,
    target_role,
    company_type,
    difficulty,
    status
  )
  select
    auth.uid(),
    p.college_id,
    p_interview_type,
    p_target_role,
    p_company_type,
    p_difficulty,
    'pending'
  from public.profiles p
  where p.id = auth.uid()
  returning * into v_interview;

  return v_interview;
end;
$$;

-- ---------------------------------------------------------------------------
-- start_stub_interview: the interview room's first load — flips 'pending'
-- to 'in_progress' and opens the 'intro' stage. Idempotent: calling it
-- again on an already-in_progress interview just returns the current row,
-- so a page refresh/retry can't error out mid-interview.
-- ---------------------------------------------------------------------------
create or replace function public.start_stub_interview(p_interview_id uuid)
returns public.interviews
language plpgsql
security definer
set search_path = public
as $$
declare
  v_interview public.interviews;
begin
  if auth.uid() is null then
    raise exception 'You must be signed in to start an interview.';
  end if;

  select * into v_interview from public.interviews where id = p_interview_id;

  if v_interview.id is null or v_interview.user_id != auth.uid() then
    raise exception 'Interview not found.';
  end if;

  if v_interview.status in ('completed', 'abandoned') then
    raise exception 'This interview has already ended.';
  end if;

  if v_interview.status = 'pending' then
    update public.interviews
    set status = 'in_progress',
        started_at = now(),
        current_stage = 'intro'
    where id = p_interview_id
    returning * into v_interview;
  end if;

  return v_interview;
end;
$$;

-- ---------------------------------------------------------------------------
-- record_stub_interview_turn: one call per turn from the interview room,
-- right after the stub engine "decides" the next question and the student
-- has answered the previous one. `on conflict` makes a retried call (e.g.
-- a flaky network request fired twice) safe instead of erroring on the
-- (interview_id, turn_number) unique constraint.
-- ---------------------------------------------------------------------------
create or replace function public.record_stub_interview_turn(
  p_interview_id uuid,
  p_turn_number int,
  p_stage text,
  p_question_text text,
  p_question_source text,
  p_is_follow_up boolean,
  p_transcript text,
  p_answer_duration_seconds numeric
)
returns public.interview_turns
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner uuid;
  v_status text;
  v_turn public.interview_turns;
begin
  if auth.uid() is null then
    raise exception 'You must be signed in to record an interview turn.';
  end if;

  select user_id, status into v_owner, v_status
  from public.interviews where id = p_interview_id;

  if v_owner is null or v_owner != auth.uid() then
    raise exception 'Interview not found.';
  end if;

  if v_status != 'in_progress' then
    raise exception 'This interview is not in progress.';
  end if;

  insert into public.interview_turns (
    interview_id,
    turn_number,
    stage,
    question_text,
    question_source,
    is_follow_up,
    transcript,
    answer_duration_seconds
  ) values (
    p_interview_id,
    p_turn_number,
    p_stage,
    p_question_text,
    p_question_source,
    p_is_follow_up,
    p_transcript,
    p_answer_duration_seconds
  )
  on conflict (interview_id, turn_number) do update
    set transcript = excluded.transcript,
        answer_duration_seconds = excluded.answer_duration_seconds
  returning * into v_turn;

  update public.interviews set current_stage = p_stage where id = p_interview_id;

  return v_turn;
end;
$$;

-- ---------------------------------------------------------------------------
-- finish_stub_interview: ends the interview and writes its report in one
-- call. The report is unambiguously stub-generated — model_id/
-- prompt_version always say so — never a real evaluation-model output.
-- `on conflict (interview_id)` makes re-finishing (e.g. the student hits
-- the 25-minute cap right as they also tap "End") idempotent.
-- ---------------------------------------------------------------------------
create or replace function public.finish_stub_interview(
  p_interview_id uuid,
  p_duration_seconds int,
  p_eye_contact_pct numeric,
  p_posture_stability_pct numeric,
  p_scores jsonb,
  p_overall_score numeric,
  p_strengths jsonb,
  p_weak_areas_summary jsonb,
  p_practice_actions jsonb
)
returns public.interview_reports
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner uuid;
  v_status text;
  v_college_id uuid;
  v_report public.interview_reports;
begin
  if auth.uid() is null then
    raise exception 'You must be signed in to finish an interview.';
  end if;

  select user_id, status, college_id into v_owner, v_status, v_college_id
  from public.interviews where id = p_interview_id;

  if v_owner is null or v_owner != auth.uid() then
    raise exception 'Interview not found.';
  end if;

  if v_status in ('completed', 'abandoned') then
    raise exception 'This interview has already ended.';
  end if;

  update public.interviews
  set status = 'completed',
      ended_at = now(),
      duration_seconds = p_duration_seconds,
      eye_contact_pct = p_eye_contact_pct,
      posture_stability_pct = p_posture_stability_pct
  where id = p_interview_id;

  insert into public.interview_reports (
    interview_id,
    user_id,
    college_id,
    status,
    scores,
    overall_score,
    strengths,
    weak_areas_summary,
    practice_actions,
    eye_contact_pct,
    posture_stability_pct,
    model_id,
    prompt_version
  ) values (
    p_interview_id,
    auth.uid(),
    v_college_id,
    'completed',
    p_scores,
    p_overall_score,
    p_strengths,
    p_weak_areas_summary,
    p_practice_actions,
    p_eye_contact_pct,
    p_posture_stability_pct,
    'stub-fixture-v1',
    'stub-v1'
  )
  on conflict (interview_id) do update
    set status = excluded.status,
        scores = excluded.scores,
        overall_score = excluded.overall_score,
        strengths = excluded.strengths,
        weak_areas_summary = excluded.weak_areas_summary,
        practice_actions = excluded.practice_actions,
        eye_contact_pct = excluded.eye_contact_pct,
        posture_stability_pct = excluded.posture_stability_pct,
        model_id = excluded.model_id,
        prompt_version = excluded.prompt_version
  returning * into v_report;

  return v_report;
end;
$$;

-- Same lockdown shape as accept_invitation()/create_stub_resume_scan():
-- only the authenticated role (a signed-in browser session) can call
-- these; anon has no interview to touch, and service_role already
-- bypasses grants entirely.
revoke all on function public.create_stub_interview(text, text, text, text) from public;
revoke all on function public.create_stub_interview(text, text, text, text) from anon;
grant execute on function public.create_stub_interview(text, text, text, text) to authenticated;

revoke all on function public.start_stub_interview(uuid) from public;
revoke all on function public.start_stub_interview(uuid) from anon;
grant execute on function public.start_stub_interview(uuid) to authenticated;

revoke all on function public.record_stub_interview_turn(uuid, int, text, text, text, boolean, text, numeric) from public;
revoke all on function public.record_stub_interview_turn(uuid, int, text, text, text, boolean, text, numeric) from anon;
grant execute on function public.record_stub_interview_turn(uuid, int, text, text, text, boolean, text, numeric) to authenticated;

revoke all on function public.finish_stub_interview(uuid, int, numeric, numeric, jsonb, numeric, jsonb, jsonb, jsonb) from public;
revoke all on function public.finish_stub_interview(uuid, int, numeric, numeric, jsonb, numeric, jsonb, jsonb, jsonb) from anon;
grant execute on function public.finish_stub_interview(uuid, int, numeric, numeric, jsonb, numeric, jsonb, jsonb, jsonb) to authenticated;
