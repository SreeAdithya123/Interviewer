/**
 * Hard limits from docs/BUILD_SPEC.md Part 4.5: "answers capped at 180
 * seconds, interviews at 25 minutes" — matching `interview_templates`'
 * `max_answer_seconds`/`max_duration_seconds` defaults in
 * supabase/migrations/20261015120003_interview.sql. Enforced in the UI
 * even in stub mode (no real engine/template row backs these yet).
 */
export const MAX_ANSWER_SECONDS = 180;
export const MAX_INTERVIEW_SECONDS = 25 * 60;

/** Stub-mode turn plan: a fixed sequence of stages (and which entries are
 * a follow-up to the turn right before them) the stub engine walks
 * through, in order. The real engine builds this dynamically per
 * `interview_templates.stages` + question-bank filtering (BUILD_SPEC Part
 * 4.5 step 2); that table is unseeded in this environment, so the stub
 * engine runs against this hardcoded plan instead. One entry is marked
 * `isFollowUp` so the UI/report exercise that path too, honoring "max 2
 * follow-ups per question" by using exactly one. */
export const STUB_TURN_PLAN: { stage: import("./types").InterviewStage; isFollowUp: boolean }[] = [
  { stage: "intro", isFollowUp: false },
  { stage: "resume_deep_dive", isFollowUp: false },
  { stage: "resume_deep_dive", isFollowUp: false },
  { stage: "technical", isFollowUp: false },
  { stage: "technical", isFollowUp: false },
  { stage: "technical", isFollowUp: true },
  { stage: "technical", isFollowUp: false },
  { stage: "behavioral", isFollowUp: false },
  { stage: "behavioral", isFollowUp: false },
  { stage: "closing", isFollowUp: false },
];

export const STUB_TOTAL_TURNS = STUB_TURN_PLAN.length;
