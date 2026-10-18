-- Phase 2 follow-on: give the platform-admin content-editor UIs (built in
-- apps/web/app/app/{question-bank,knowledge-base,plans}) somewhere to
-- actually write to.
--
-- Why this is needed: 20261015120007_row_level_security.sql deliberately
-- left question_bank/plans as SELECT-only and kb_documents/kb_chunks with
-- zero anon/authenticated access at all, on the assumption that writes to
-- this platform-curated content would go through the engine's service-role
-- key. That assumption doesn't hold in this environment: there is no
-- service-role key configured here (see
-- 20261017160000_accept_invitation.sql's header comment), and the engine
-- itself doesn't exist yet (Phase 1 is blocked on provider API keys). The
-- only thing that can write this content right now is the platform_admin's
-- own browser session, i.e. the `authenticated` Postgres role running as
-- is_platform_admin() = true. So:
--   * question_bank: add INSERT/UPDATE/DELETE, gated to platform_admin
--     only (the existing question_bank_select policy, open to any
--     authenticated user, is untouched).
--   * plans: add INSERT/UPDATE/DELETE, gated to platform_admin only (the
--     existing plans_select policy, open to anon+authenticated, is
--     untouched).
--   * kb_documents: add full CRUD (SELECT included — it had none),
--     gated to platform_admin only. kb_chunks is NOT touched here: it
--     stays with zero anon/authenticated grants and zero policies,
--     exactly as 20261015120007 left it, because chunking/embedding is
--     still engine-internal (Phase 1 work) and the knowledge-base editor's
--     "approve" action only flips kb_documents.status, per
--     lib/ai-stubs/embed-document.ts.
--
-- Also: chat_messages (prep assistant). Its RLS has only ever had a SELECT
-- policy because the real engine was assumed to write both the student's
-- message and the assistant's reply via the service role. With no engine
-- and no service-role key, the student's own browser session has to write
-- both sides of the conversation for Phase 2's UI to function at all (the
-- assistant "reply" is a clearly-labeled mock from
-- lib/ai-stubs/chat-respond.ts, never a real engine answer) — so add an
-- INSERT policy scoped to the session's owner (or platform_admin). This is
-- a temporary bridge: once the real engine exists, it should take over
-- writing chat_messages via the service role (which bypasses RLS
-- entirely), and this policy can be narrowed back down or removed.
--
-- None of this touches student/college_admin-scoped tables (interviews,
-- resumes, resume_scans, interview_reports, weak_areas, usage_events, ...),
-- which keep exactly the read/write shape 20261015120007 gave them.

-- ---------------------------------------------------------------------------
-- question_bank
-- ---------------------------------------------------------------------------
grant insert, update, delete on public.question_bank to authenticated;

create policy question_bank_insert on public.question_bank
  for insert
  to authenticated
  with check (private.is_platform_admin());

create policy question_bank_update on public.question_bank
  for update
  to authenticated
  using (private.is_platform_admin())
  with check (private.is_platform_admin());

create policy question_bank_delete on public.question_bank
  for delete
  to authenticated
  using (private.is_platform_admin());

-- ---------------------------------------------------------------------------
-- plans
-- ---------------------------------------------------------------------------
grant insert, update, delete on public.plans to authenticated;

create policy plans_insert on public.plans
  for insert
  to authenticated
  with check (private.is_platform_admin());

create policy plans_update on public.plans
  for update
  to authenticated
  using (private.is_platform_admin())
  with check (private.is_platform_admin());

create policy plans_delete on public.plans
  for delete
  to authenticated
  using (private.is_platform_admin());

-- ---------------------------------------------------------------------------
-- kb_documents (kb_chunks intentionally left untouched — see header)
-- ---------------------------------------------------------------------------
grant select, insert, update, delete on public.kb_documents to authenticated;

create policy kb_documents_select on public.kb_documents
  for select
  to authenticated
  using (private.is_platform_admin());

create policy kb_documents_insert on public.kb_documents
  for insert
  to authenticated
  with check (private.is_platform_admin());

create policy kb_documents_update on public.kb_documents
  for update
  to authenticated
  using (private.is_platform_admin())
  with check (private.is_platform_admin());

create policy kb_documents_delete on public.kb_documents
  for delete
  to authenticated
  using (private.is_platform_admin());

-- ---------------------------------------------------------------------------
-- chat_messages: allow the session owner (or platform_admin) to insert —
-- see header comment. chat_messages already has full table-level grants
-- for authenticated from its initial creation, so no GRANT is needed here,
-- only the missing RLS policy.
-- ---------------------------------------------------------------------------
create policy chat_messages_insert on public.chat_messages
  for insert
  to authenticated
  with check (
    private.chat_session_owner_id(session_id) = auth.uid()
    or private.is_platform_admin()
  );
