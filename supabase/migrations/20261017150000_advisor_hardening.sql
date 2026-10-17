-- Phase 2 hardening: fix issues Supabase's own advisors found on the first
-- real apply of this schema (project rhynjyamkeqsdvymmzhc) — none of this
-- was observable without a live project. See docs/DECISIONS.md for the
-- full writeup of why each fix is shaped the way it is.

-- 1. set_updated_at had a mutable search_path (function_search_path_mutable
--    advisor, WARN) — pin it like every other helper function already was.
alter function public.set_updated_at() set search_path = public;

-- 2. Several SECURITY DEFINER helper/trigger functions were reachable by
--    anon/authenticated via PostgREST's auto-exposed /rest/v1/rpc/<name>
--    (anon_security_definer_function_executable /
--    authenticated_security_definer_function_executable advisors, WARN).
--    profile_college_id/interview_owner_id/interview_college_id/
--    chat_session_owner_id take an arbitrary id and return ownership or
--    college data for ANY row by design (so RLS policies can use them),
--    which means calling them directly as anon/authenticated would leak
--    that mapping for a guessed/enumerated id. Move them to a `private`
--    schema instead of revoking EXECUTE (revoking would also break the RLS
--    policies that call them, since policy evaluation still needs EXECUTE
--    on the function for the querying role). ALTER FUNCTION ... SET SCHEMA
--    preserves the function's OID, so the triggers and already-created
--    policies that reference these keep working unchanged; only the
--    PostgREST RPC route (which only exposes the `public` schema) goes
--    away.
create schema if not exists private;

alter function public.current_user_role() set schema private;
alter function public.current_user_college_id() set schema private;
alter function public.is_platform_admin() set schema private;
alter function public.is_college_admin() set schema private;
alter function public.profile_college_id(uuid) set schema private;
alter function public.interview_owner_id(uuid) set schema private;
alter function public.interview_college_id(uuid) set schema private;
alter function public.chat_session_owner_id(uuid) set schema private;
alter function public.guard_profile_privilege_columns() set schema private;
alter function public.handle_new_user() set schema private;

-- 3. question_bank, interview_templates and plans were meant to be
--    directly readable by authenticated (and, for plans, anon) clients.
--    This project turns out to auto-enable RLS on every new public-schema
--    table (Supabase's own rls_auto_enable() event trigger, not anything
--    earlier migrations did) — with RLS enabled and no policy, all
--    non-owner access is denied regardless of the GRANT SELECT already
--    issued in 20261015120007_row_level_security.sql, so these three need
--    an explicit policy, not just a grant.
--    kb_documents/kb_chunks/tts_cache were meant to have zero
--    anon/authenticated access anyway, so the auto-enabled, policy-less RLS
--    already sitting on them is correct as-is and needs no policy added.
create policy question_bank_select on public.question_bank
  for select
  to authenticated
  using (true);

create policy interview_templates_select on public.interview_templates
  for select
  to authenticated
  using (true);

create policy plans_select on public.plans
  for select
  to anon, authenticated
  using (true);
