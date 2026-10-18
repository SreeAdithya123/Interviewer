-- RLS isolation test (BUILD_SPEC.md Part 7 Phase 2 acceptance criterion:
-- "RLS tests proving a student cannot read another student's data and a
-- college admin cannot read another college's data"). Never run against
-- the live project before 2026-10-18 -- the RLS policies had only been
-- reviewed by reading the SQL, never actually exercised. This is that
-- real test, run directly against Postgres via the standard Supabase
-- pattern for testing RLS from SQL: SET ROLE authenticated plus
-- request.jwt.claim.sub (what auth.uid() actually reads -- see
-- auth.uid()'s own definition), inside one transaction so SET LOCAL
-- actually applies to the queries that follow it.
--
-- How to run: paste into the Supabase SQL editor (or any client with a
-- service-role/superuser connection -- the setup/cleanup steps need
-- privileges past what `authenticated` has) against a project whose
-- schema matches supabase/migrations/. Each SELECT's comment states the
-- expected result; read the actual output against it. Everything this
-- script creates is deleted in the cleanup block at the end, inside the
-- same transaction, so a successful COMMIT leaves no trace either way.
--
-- Last run for real 2026-10-18 against rhynjyamkeqsdvymmzhc, via this
-- project's Supabase MCP connection rather than this exact file (this
-- file is that session's queries, cleaned up and written down afterward
-- for reuse) -- see docs/PROGRESS.md for the real result. All checks
-- passed: no cross-student or cross-college leak found.

begin;

-- ---------------------------------------------------------------------
-- Setup: one throwaway college ("B") and one throwaway college_admin
-- profile scoped to it, so there's a second college to test isolation
-- against -- the live project had only ever seeded one. The real
-- on_auth_user_created trigger creates the matching `profiles` row
-- (role defaults to 'student'), which the UPDATE below promotes to
-- college_admin in college B.
-- ---------------------------------------------------------------------

insert into colleges (id, name, slug, is_active) values
  ('2aef6a99-3460-490b-819d-54e0c9732f7b', 'RLS Isolation Test College B', 'rls-isolation-test-college-b', true);

insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
values (
  'df3d0ff6-961f-424f-91ad-1c7e75e794f4',
  '00000000-0000-0000-0000-000000000000',
  'authenticated', 'authenticated',
  'rls-isolation-test-admin@example.invalid',
  crypt('not-a-real-password', gen_salt('bf')),
  now(), '{"provider":"email","providers":["email"]}', '{}', now(), now()
);

update profiles set role = 'college_admin', college_id = '2aef6a99-3460-490b-819d-54e0c9732f7b'
where id = 'df3d0ff6-961f-424f-91ad-1c7e75e794f4';

-- ---------------------------------------------------------------------
-- Test 1: college B's admin must see none of the real college's data.
-- Expected: every column 0, except profiles_visible = 1 (their own row
-- -- college B has no other members).
-- ---------------------------------------------------------------------

set local role authenticated;
set local request.jwt.claim.sub = 'df3d0ff6-961f-424f-91ad-1c7e75e794f4';
select
  (select count(*) from interviews) as interviews_visible,          -- expect 0
  (select count(*) from profiles) as profiles_visible,               -- expect 1 (self only)
  (select count(*) from resumes) as resumes_visible,                 -- expect 0
  (select count(*) from interview_reports) as reports_visible,       -- expect 0
  (select count(*) from weak_areas) as weak_areas_visible;           -- expect 0

reset role;

-- ---------------------------------------------------------------------
-- Test 2: a real student must not see another real student's profile,
-- or another real user's interviews.
-- Replace the two UUIDs below with two real `profiles.id` values of
-- role='student' from the project being tested, and a third real
-- profiles.id (any role) that has at least one real `interviews` row,
-- if you want that third assertion to be a meaningful non-trivial check
-- rather than vacuously 0.
-- ---------------------------------------------------------------------

set local role authenticated;
set local request.jwt.claim.sub = '86163c14-4ba9-457f-9785-e9afd9f63db7'; -- student A
select
  (select count(*) from profiles) as total_profiles_visible,                                              -- expect 1 (self only)
  (select count(*) from profiles where id = '07dd8621-bbf0-4b08-b2b9-fc402ebc21a8') as other_student_visible, -- expect 0 (student B)
  (select count(*) from interviews where user_id = '54c3fbbe-793b-43c5-8ecf-29c7fd378465') as other_users_interviews_visible; -- expect 0

reset role;

-- ---------------------------------------------------------------------
-- Test 3: platform_admin must see everything (RLS isn't accidentally
-- over-restricting the one role that's supposed to see all of it).
-- Expected: counts matching the real, unrestricted totals.
-- ---------------------------------------------------------------------

set local role authenticated;
set local request.jwt.claim.sub = '54c3fbbe-793b-43c5-8ecf-29c7fd378465'; -- platform_admin
select
  (select count(*) from profiles) as all_profiles,
  (select count(*) from colleges) as all_colleges;

reset role;

-- ---------------------------------------------------------------------
-- Cleanup (also runs if you SELECT the above and then just COMMIT;
-- nothing here depends on the test results).
-- ---------------------------------------------------------------------

delete from profiles where id = 'df3d0ff6-961f-424f-91ad-1c7e75e794f4';
delete from auth.users where id = 'df3d0ff6-961f-424f-91ad-1c7e75e794f4';
delete from colleges where id = '2aef6a99-3460-490b-819d-54e0c9732f7b';

commit;
