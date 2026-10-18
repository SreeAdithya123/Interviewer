-- Seed data for the real interview engine's turn loop
-- (services/engine/app/interview/engine.py: get_next_turn / _pick_question),
-- per docs/BUILD_SPEC.md Part 3 ("supabase/seed/: ... question bank
-- sample") and Part 7 Phase 2.
--
-- Why this exists: the live project had zero `interview_templates` and
-- zero `question_bank` rows as of 2026-10-18, discovered while wiring
-- apps/web's interview room off the stub bridge
-- (20261017160925_interview_stub_bridge.sql) onto the real engine. Without
-- this, `get_next_turn` either raises (no template_id) or finds no
-- reviewed questions and finishes the interview immediately with zero
-- turns asked — so this is required, not optional, for the real engine to
-- produce a working interview.
--
-- Scope, honestly: one shared 5-stage plan (intro=1, resume_deep_dive=2,
-- technical=3, behavioral=2, closing=1 question, matching
-- apps/web/lib/interview/constants.ts's STUB_TURN_PLAN's primary-question
-- counts exactly, so the real interview is the same length as the stub one
-- students have already been previewing) reused across all four
-- `interview_type` templates, and the SAME 9 questions per type repeated
-- across all three `difficulty` values (36 unique questions total, 108
-- rows) rather than 108 genuinely distinct ones. Real per-difficulty
-- question variants are a content-curation task for the Part 4.8 question
-- bank editor, not something to fabricate here. Every question is
-- generic — no company name, no invented statistic — per BUILD_SPEC Part 1
-- ("no hallucinated interview questions attributed to companies").
--
-- Also note a pre-existing, separate limitation this does NOT fix:
-- `_pick_question` only applies its `company_type`/`role` filters when the
-- interview row has a non-empty value for either (apps/web's setup form
-- takes free text for both, not a fixed choice) — every row seeded here
-- has `company_type`/`role` left NULL, so it matches only when a student
-- leaves those fields blank. Typing a specific role or company today
-- still yields zero questions for every stage, since nothing here (or in
-- the engine) was seeded/written to match arbitrary free text. See
-- docs/DECISIONS.md.

with q(interview_type, stage, question_text) as (
  values
    ('hr', 'intro', 'Tell me about yourself and why you''re interested in this role.'),
    ('hr', 'resume_deep_dive', 'Walk me through the project on your resume you''re most proud of.'),
    ('hr', 'resume_deep_dive', 'What was the most challenging part of that project, and how did you handle it?'),
    ('hr', 'technical', 'How do you approach learning a new tool or technology quickly when a project requires it?'),
    ('hr', 'technical', 'Describe a time you had to make a decision with incomplete information.'),
    ('hr', 'technical', 'How do you prioritize tasks when everything feels urgent?'),
    ('hr', 'behavioral', 'Tell me about a time you disagreed with a teammate. How did you resolve it?'),
    ('hr', 'behavioral', 'Describe a situation where you had to work under a tight deadline.'),
    ('hr', 'closing', 'Where do you see yourself professionally in the next few years, and why does this role fit?'),

    ('technical', 'intro', 'Tell me about your technical background and the kind of problems you enjoy working on.'),
    ('technical', 'resume_deep_dive', 'Pick a project from your resume and walk me through its architecture.'),
    ('technical', 'resume_deep_dive', 'What would you do differently if you rebuilt that project today?'),
    ('technical', 'technical', 'How would you design a rate limiter for an API with multiple clients?'),
    ('technical', 'technical', 'Explain the difference between a process and a thread, and when you''d choose one over the other.'),
    ('technical', 'technical', 'How do you approach debugging a production issue you can''t reproduce locally?'),
    ('technical', 'behavioral', 'Tell me about a time your code caused a bug in production. What did you do?'),
    ('technical', 'behavioral', 'Describe a time you had to push back on a technical decision you disagreed with.'),
    ('technical', 'closing', 'What kind of technical problems are you hoping to work on next, and why?'),

    ('behavioral', 'intro', 'Tell me a bit about yourself and what you''re looking for in your next role.'),
    ('behavioral', 'resume_deep_dive', 'Tell me about a project on your resume where you had to collaborate closely with others.'),
    ('behavioral', 'resume_deep_dive', 'What was your specific contribution versus the team''s?'),
    ('behavioral', 'technical', 'How do you stay organized when juggling multiple responsibilities at once?'),
    ('behavioral', 'technical', 'Describe how you''d approach a task you''ve never done before.'),
    ('behavioral', 'technical', 'How do you make sure your work meets a high bar of quality?'),
    ('behavioral', 'behavioral', 'Tell me about the most difficult feedback you''ve received and how you responded.'),
    ('behavioral', 'behavioral', 'Describe a time you had to influence someone without having authority over them.'),
    ('behavioral', 'closing', 'What does success look like for you in this role six months from now?'),

    ('mixed', 'intro', 'Tell me about yourself and what''s brought you to this interview today.'),
    ('mixed', 'resume_deep_dive', 'Walk me through the resume project you consider your best work.'),
    ('mixed', 'resume_deep_dive', 'What tradeoffs did you make in that project, and would you make the same ones again?'),
    ('mixed', 'technical', 'How do you approach a problem you don''t immediately know how to solve?'),
    ('mixed', 'technical', 'Describe a technical or analytical decision you made that you''re proud of.'),
    ('mixed', 'technical', 'How do you verify your work is correct before calling it done?'),
    ('mixed', 'behavioral', 'Tell me about a conflict you had at work or in a team project, and how it ended.'),
    ('mixed', 'behavioral', 'Describe a time you had to learn something completely new under time pressure.'),
    ('mixed', 'closing', 'Why are you interested in this type of role, and what do you want to be doing a year from now?')
),
difficulties(difficulty) as (values ('easy'), ('medium'), ('hard')),
reviewer as (
  select id from public.profiles where role = 'platform_admin' order by created_at limit 1
)
-- question_bank has no natural unique constraint to key an ON CONFLICT off
-- of, so re-runnability is a plain NOT EXISTS guard on content instead.
insert into public.question_bank (
  stage, interview_type, difficulty, question_text, status, source, created_by, reviewed_by, reviewed_at
)
select
  q.stage, q.interview_type, d.difficulty, q.question_text,
  'reviewed', 'seed', reviewer.id, reviewer.id, now()
from q
cross join difficulties d
cross join reviewer
where not exists (
  select 1 from public.question_bank qb
  where qb.stage = q.stage
    and qb.interview_type = q.interview_type
    and qb.difficulty = d.difficulty
    and qb.question_text = q.question_text
);

insert into public.interview_templates (name, interview_type, stages, max_follow_ups_per_question, max_answer_seconds, max_duration_seconds, is_active)
values
  ('hr_default', 'hr',
   '[{"stage":"intro","question_count":1},{"stage":"resume_deep_dive","question_count":2},{"stage":"technical","question_count":3},{"stage":"behavioral","question_count":2},{"stage":"closing","question_count":1}]'::jsonb,
   2, 180, 1500, true),
  ('technical_default', 'technical',
   '[{"stage":"intro","question_count":1},{"stage":"resume_deep_dive","question_count":2},{"stage":"technical","question_count":3},{"stage":"behavioral","question_count":2},{"stage":"closing","question_count":1}]'::jsonb,
   2, 180, 1500, true),
  ('behavioral_default', 'behavioral',
   '[{"stage":"intro","question_count":1},{"stage":"resume_deep_dive","question_count":2},{"stage":"technical","question_count":3},{"stage":"behavioral","question_count":2},{"stage":"closing","question_count":1}]'::jsonb,
   2, 180, 1500, true),
  ('mixed_default', 'mixed',
   '[{"stage":"intro","question_count":1},{"stage":"resume_deep_dive","question_count":2},{"stage":"technical","question_count":3},{"stage":"behavioral","question_count":2},{"stage":"closing","question_count":1}]'::jsonb,
   2, 180, 1500, true)
on conflict (name) do nothing;
