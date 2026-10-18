/**
 * STUB interview engine — NOT a real AI engine.
 *
 * docs/BUILD_SPEC.md Part 4.5 describes a real engine that builds a stage
 * plan, pulls questions from the curated `question_bank` (filtered by
 * role/company type/difficulty, plus resume-specific questions), decides
 * follow-ups with an LLM, transcribes answers with Groq/Sarvam, and scores
 * the finished interview with an evaluation model. None of that exists
 * yet: BUILD_SPEC Part 7 Phase 1 (real provider calls) is blocked on
 * Gemini/Groq/Sarvam API keys.
 *
 * This module returns realistic-SHAPED fake data from a small local
 * fixture list instead — matching `question_bank`'s columns closely enough
 * that swapping this module out for a real engine call later shouldn't
 * need UI changes. Everything it returns must be treated as preview
 * content, never a real transcription or a real evaluation:
 *   - `question_text` is a real, hand-written interview question (it reads
 *     fine on screen), but which one gets picked is fixture lookup, not a
 *     model call.
 *   - `transcript` is NOT a transcription of the student's recorded audio
 *     (there is no STT provider wired up) — it is a canned sample answer,
 *     and every page that renders it must label it as such.
 *   - The report's scores/evidence/strengths/weak areas are derived from
 *     those canned transcripts with simple arithmetic, not a real
 *     evaluation-model call.
 *
 * TODO(phase-1): once GEMINI_API_KEY/GROQ_API_KEY/SARVAM_API_KEY (etc.)
 * exist, replace this module's three exports with real engine calls (the
 * FastAPI service, per BUILD_SPEC Part 2) and delete the fixture data
 * below.
 */

import { STUB_TURN_PLAN } from "@/lib/interview/constants";
import type { Difficulty, InterviewStage, InterviewType, ReportScores } from "@/lib/interview/types";

/**
 * `interview_reports.model_id` this stub writes (via
 * finish_stub_interview(), see
 * supabase/migrations/20261017180000_interview_stub_bridge.sql). Every page
 * that renders a report's score/strengths/practice_actions — not just the
 * student's own report page — must check this and show a preview marker,
 * the same way lib/ai-stubs/chat-respond.ts's STUB_MODEL_ID/isStubReply
 * gates the chat UI's badge. A college_admin/platform_admin dashboard that
 * aggregates these scores without checking this would present fixture
 * output as a real evaluation, which is exactly what this app promises
 * never to do.
 */
export const STUB_REPORT_MODEL_ID = "stub-fixture-v1";

export function isStubReport(modelId: string | null): boolean {
  return modelId === STUB_REPORT_MODEL_ID;
}

export interface StubQuestion {
  id: string;
  stage: InterviewStage;
  interview_type: InterviewType[];
  difficulty: Difficulty[];
  question_text: string;
  tags: string[];
}

// ---------------------------------------------------------------------------
// Fixture question bank — shaped like `question_bank` rows, but these are
// NOT read from that table (it is unseeded in this environment). A real
// `question_bank` row also carries `ideal_answer_notes`/`source`/`status`;
// left out here since the stub never reviews or grades against them.
// ---------------------------------------------------------------------------
const ALL_TYPES: InterviewType[] = ["hr", "technical", "behavioral", "mixed"];
const ALL_DIFFICULTIES: Difficulty[] = ["easy", "medium", "hard"];

const FIXTURE_QUESTIONS: StubQuestion[] = [
  {
    id: "intro-1",
    stage: "intro",
    interview_type: ALL_TYPES,
    difficulty: ALL_DIFFICULTIES,
    question_text: "Tell me a little about yourself and what you're looking for in this role.",
    tags: ["warmup"],
  },
  {
    id: "intro-2",
    stage: "intro",
    interview_type: ALL_TYPES,
    difficulty: ALL_DIFFICULTIES,
    question_text: "Walk me through your background and why this role caught your interest.",
    tags: ["warmup"],
  },
  {
    id: "resume-1",
    stage: "resume_deep_dive",
    interview_type: ALL_TYPES,
    difficulty: ALL_DIFFICULTIES,
    question_text:
      "Pick the project on your resume you're most proud of — walk me through the problem, your specific contribution, and the outcome.",
    tags: ["resume"],
  },
  {
    id: "resume-2",
    stage: "resume_deep_dive",
    interview_type: ALL_TYPES,
    difficulty: ALL_DIFFICULTIES,
    question_text:
      "Tell me about a technical decision you made on one of your projects. What would you do differently if you started it again today?",
    tags: ["resume"],
  },
  {
    id: "resume-3",
    stage: "resume_deep_dive",
    interview_type: ALL_TYPES,
    difficulty: ALL_DIFFICULTIES,
    question_text: "Of everything on your resume, which skill do you feel least confident about, and why?",
    tags: ["resume"],
  },
  {
    id: "tech-easy-1",
    stage: "technical",
    interview_type: ["technical", "mixed"],
    difficulty: ["easy"],
    question_text: "What's the difference between a process and a thread, and when would you choose one over the other?",
    tags: ["fundamentals"],
  },
  {
    id: "tech-easy-2",
    stage: "technical",
    interview_type: ["technical", "mixed"],
    difficulty: ["easy"],
    question_text: "Explain the difference between SQL and NoSQL databases and when you'd pick one over the other.",
    tags: ["fundamentals", "databases"],
  },
  {
    id: "tech-medium-1",
    stage: "technical",
    interview_type: ["technical", "mixed"],
    difficulty: ["medium"],
    question_text: "How would you design a rate limiter for a public API? Walk me through your approach.",
    tags: ["system-design"],
  },
  {
    id: "tech-medium-2",
    stage: "technical",
    interview_type: ["technical", "mixed"],
    difficulty: ["medium"],
    question_text: "How do you approach debugging an issue that only reproduces in production, not locally?",
    tags: ["debugging"],
  },
  {
    id: "tech-hard-1",
    stage: "technical",
    interview_type: ["technical", "mixed"],
    difficulty: ["hard"],
    question_text:
      "Design a URL-shortening service that needs to scale to 100 million requests a day. What are the key components and bottlenecks?",
    tags: ["system-design"],
  },
  {
    id: "tech-hard-2",
    stage: "technical",
    interview_type: ["technical", "mixed"],
    difficulty: ["hard"],
    question_text: "Where would you introduce caching in a read-heavy service, and what consistency problems would that create?",
    tags: ["system-design"],
  },
  {
    id: "behavioral-1",
    stage: "behavioral",
    interview_type: ["hr", "behavioral", "mixed"],
    difficulty: ALL_DIFFICULTIES,
    question_text: "Tell me about a time you disagreed with a teammate. How did you handle it?",
    tags: ["conflict"],
  },
  {
    id: "behavioral-2",
    stage: "behavioral",
    interview_type: ["hr", "behavioral", "mixed"],
    difficulty: ALL_DIFFICULTIES,
    question_text: "Describe a situation where you had to learn something new quickly under a deadline.",
    tags: ["learning"],
  },
  {
    id: "behavioral-3",
    stage: "behavioral",
    interview_type: ["hr", "behavioral", "mixed"],
    difficulty: ALL_DIFFICULTIES,
    question_text: "Tell me about a time something you worked on failed. What did you learn from it?",
    tags: ["failure"],
  },
  {
    id: "behavioral-4",
    stage: "behavioral",
    interview_type: ["hr", "behavioral", "mixed"],
    difficulty: ALL_DIFFICULTIES,
    question_text: "Why do you want to work in a role like this one, specifically?",
    tags: ["motivation"],
  },
  {
    id: "closing-1",
    stage: "closing",
    interview_type: ALL_TYPES,
    difficulty: ALL_DIFFICULTIES,
    question_text: "Do you have any questions for us, or anything you'd like to add about your fit for this role?",
    tags: ["closing"],
  },
];

const FOLLOW_UP_PROMPTS = [
  "Can you make that more concrete — walk me through a specific example or number?",
  "What trade-off did you consider there, and why did you pick this approach over the alternative?",
  "What would break first if this had to handle ten times the load?",
];

// Canned "sample answers" used as the turn's stub transcript — never a
// real transcription of the student's recorded audio (see module header).
const SAMPLE_ANSWER_SENTENCES = [
  "In my last project I focused on breaking the problem into smaller pieces before writing any code.",
  "I'd start by clarifying the constraints, then sketch two or three approaches before picking one.",
  "The main trade-off was between build speed and long-term maintainability, and I leaned toward maintainability.",
  "I ran into a scaling issue once it hit real traffic, which taught me to load-test earlier next time.",
  "I made sure to communicate the blocker to my team as soon as I found it, instead of sitting on it.",
  "Looking back, I'd add monitoring from day one instead of bolting it on after the first incident.",
];

function pseudoRandom(seed: string): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return hash / 0xffffffff;
}

function pick<T>(items: T[], seed: string): T {
  const index = Math.floor(pseudoRandom(seed) * items.length) % items.length;
  return items[index];
}

/** Simulated "thinking" delay so the turn-by-turn loop feels like it's
 * doing something, per BUILD_SPEC Part 4.5 step 6 ("a short pre-recorded
 * acknowledgement clip so the gap feels natural") — here it's just a
 * pause, no audio. */
function thinkingDelay(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 700 + Math.floor(Math.random() * 500)));
}

export interface StubTurnPlanEntry {
  turnNumber: number;
  stage: InterviewStage;
  isFollowUp: boolean;
}

/** The fixed sequence of stages this stub interview will walk through.
 * `turnNumber` is 1-indexed to match `interview_turns.turn_number`. */
export function getStubTurnPlan(): StubTurnPlanEntry[] {
  return STUB_TURN_PLAN.map((entry, index) => ({ turnNumber: index + 1, ...entry }));
}

/**
 * Returns the next stub question for a turn. Simulates a short "thinking"
 * delay, then picks a fixture question matching the stage/type/difficulty
 * that hasn't been asked yet in this interview (or a canned follow-up
 * prompt when `isFollowUp` is true).
 */
export async function getNextStubTurn(params: {
  interviewType: InterviewType;
  difficulty: Difficulty;
  stage: InterviewStage;
  isFollowUp: boolean;
  turnNumber: number;
  askedQuestionIds: string[];
}): Promise<{ questionText: string; questionId: string | null }> {
  await thinkingDelay();

  if (params.isFollowUp) {
    return {
      questionText: pick(FOLLOW_UP_PROMPTS, `${params.turnNumber}-followup`),
      questionId: null,
    };
  }

  const candidates = FIXTURE_QUESTIONS.filter(
    (q) =>
      q.stage === params.stage &&
      q.interview_type.includes(params.interviewType) &&
      q.difficulty.includes(params.difficulty) &&
      !params.askedQuestionIds.includes(q.id),
  );

  const fallback = FIXTURE_QUESTIONS.filter(
    (q) => q.stage === params.stage && !params.askedQuestionIds.includes(q.id),
  );

  const pool = candidates.length > 0 ? candidates : fallback;
  const chosen = pool.length > 0 ? pick(pool, `${params.turnNumber}-${params.stage}`) : FIXTURE_QUESTIONS[0];

  return { questionText: chosen.question_text, questionId: chosen.id };
}

/**
 * Returns a canned "sample answer" to stand in for a real transcription.
 * Callers MUST label this as preview content — it has nothing to do with
 * what the student actually said into the microphone.
 */
export function getStubTranscript(turnNumber: number): string {
  const sentenceCount = 2 + Math.floor(pseudoRandom(`len-${turnNumber}`) * 2);
  const sentences: string[] = [];
  for (let i = 0; i < sentenceCount; i++) {
    sentences.push(pick(SAMPLE_ANSWER_SENTENCES, `${turnNumber}-${i}`));
  }
  return sentences.join(" ");
}

export interface StubTurnForReport {
  turnNumber: number;
  stage: InterviewStage;
  questionText: string;
  transcript: string;
}

export interface StubReport {
  scores: ReportScores;
  overall_score: number;
  strengths: string[];
  weak_areas_summary: { skill: string; severity: "low" | "medium" | "high"; notes: string }[];
  practice_actions: string[];
}

const DIMENSION_LABELS: { key: keyof ReportScores; label: string; skill: string }[] = [
  { key: "communication_clarity", label: "Communication clarity", skill: "Clear, structured speaking" },
  { key: "answer_structure", label: "Answer structure", skill: "Structuring answers (situation → action → result)" },
  { key: "technical_depth", label: "Technical depth", skill: "Going deeper on technical trade-offs" },
  { key: "relevance", label: "Relevance", skill: "Staying on-topic and answering the actual question" },
  { key: "confidence_and_delivery", label: "Confidence and delivery", skill: "Delivery and pacing under pressure" },
];

/**
 * Builds a fixture-derived report: NOT a real evaluation-model call. Scores
 * are simple arithmetic over the (also fake) transcripts, seeded by the
 * interview id so a given interview's report is stable across reloads.
 */
export function generateStubReport(params: {
  seed: string;
  interviewType: InterviewType;
  turns: StubTurnForReport[];
}): StubReport {
  const scores = {} as ReportScores;

  for (const dim of DIMENSION_LABELS) {
    const base = 62 + Math.floor(pseudoRandom(`${params.seed}-${dim.key}`) * 28); // 62–89
    const evidenceTurns = params.turns.slice(0, 2);
    scores[dim.key] = {
      score: base,
      summary: `${dim.label} looked ${base >= 80 ? "strong" : base >= 70 ? "solid" : "a little thin"} across your answers.`,
      evidence: evidenceTurns.map((t) => {
        const sentence = t.transcript.split(". ")[0];
        return sentence ? `${sentence}.` : t.transcript;
      }),
    };
  }

  const dimensionScores = DIMENSION_LABELS.map((d) => scores[d.key].score);
  const overall = Math.round(dimensionScores.reduce((a, b) => a + b, 0) / dimensionScores.length);

  const sorted = [...DIMENSION_LABELS].sort((a, b) => scores[b.key].score - scores[a.key].score);
  const strongest = sorted.slice(0, 2);
  const weakest = sorted.slice(-2);

  return {
    scores,
    overall_score: overall,
    strengths: strongest.map((d) => `${d.label}: ${scores[d.key].score}/100 — ${scores[d.key].summary}`),
    weak_areas_summary: weakest.map((d) => ({
      skill: d.skill,
      severity: scores[d.key].score < 68 ? "high" : scores[d.key].score < 75 ? "medium" : "low",
      notes: `Scored ${scores[d.key].score}/100 on ${d.label.toLowerCase()} in this interview.`,
    })),
    practice_actions: [
      `Run another ${params.interviewType} interview focused on ${weakest[0]?.label.toLowerCase() ?? "your weakest area"}.`,
      "Record yourself answering one question out loud and time how long it takes you to get to the point.",
      "Pick one past answer and rewrite it using a clear situation → action → result structure.",
    ],
  };
}
