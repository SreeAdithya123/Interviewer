/**
 * Shared types for the AI interview feature, mirroring the real
 * `interviews` / `interview_turns` / `interview_reports` columns exactly
 * (see supabase/migrations/20261015120003_interview.sql). Keeping these in
 * one place means the setup, room, report and history pages all agree on
 * the same shape instead of each re-declaring it slightly differently.
 */

export type InterviewType = "hr" | "technical" | "behavioral" | "mixed";
export type Difficulty = "easy" | "medium" | "hard";
export type InterviewStatus = "pending" | "in_progress" | "completed" | "abandoned";
export type InterviewStage =
  | "intro"
  | "resume_deep_dive"
  | "technical"
  | "behavioral"
  | "closing";
export type QuestionSource = "question_bank" | "resume_specific" | "follow_up";

/** Mirrors `public.interviews`. */
export interface Interview {
  id: string;
  user_id: string;
  college_id: string | null;
  template_id: string | null;
  interview_type: InterviewType;
  target_role: string | null;
  company_type: string | null;
  difficulty: Difficulty;
  status: InterviewStatus;
  current_stage: InterviewStage | null;
  started_at: string | null;
  ended_at: string | null;
  duration_seconds: number | null;
  eye_contact_pct: number | null;
  posture_stability_pct: number | null;
  total_cost_paise: number;
  created_at: string;
  updated_at: string;
}

/** Mirrors `public.interview_turns`. */
export interface InterviewTurn {
  id: string;
  interview_id: string;
  turn_number: number;
  stage: InterviewStage;
  question_text: string;
  question_source: QuestionSource;
  question_bank_id: string | null;
  is_follow_up: boolean;
  follow_up_of_turn_id: string | null;
  question_audio_key: string | null;
  answer_audio_key: string | null;
  answer_duration_seconds: number | null;
  transcript: string | null;
  stt_provider: "groq" | "sarvam" | null;
  stt_fallback_used: boolean;
  latency_ms: number | null;
  created_at: string;
}

/** One dimension inside `interview_reports.scores`. */
export interface ReportDimensionScore {
  score: number;
  summary: string;
  evidence: string[];
}

export interface ReportScores {
  communication_clarity: ReportDimensionScore;
  answer_structure: ReportDimensionScore;
  technical_depth: ReportDimensionScore;
  relevance: ReportDimensionScore;
  confidence_and_delivery: ReportDimensionScore;
}

export interface WeakAreaSummaryItem {
  skill: string;
  severity: "low" | "medium" | "high";
  notes: string;
}

/** Mirrors `public.interview_reports`. */
export interface InterviewReport {
  id: string;
  interview_id: string;
  user_id: string;
  college_id: string | null;
  status: "pending" | "completed" | "failed";
  scores: ReportScores | null;
  overall_score: number | null;
  strengths: string[];
  weak_areas_summary: WeakAreaSummaryItem[];
  practice_actions: string[];
  eye_contact_pct: number | null;
  posture_stability_pct: number | null;
  model_id: string | null;
  prompt_version: string | null;
  error_message: string | null;
  created_at: string;
  updated_at: string;
}

export const INTERVIEW_TYPE_LABELS: Record<InterviewType, string> = {
  hr: "HR",
  technical: "Technical",
  behavioral: "Behavioral",
  mixed: "Mixed",
};

export const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  easy: "Easy",
  medium: "Medium",
  hard: "Hard",
};

export const STAGE_LABELS: Record<InterviewStage, string> = {
  intro: "Introduction",
  resume_deep_dive: "Resume deep-dive",
  technical: "Technical",
  behavioral: "Behavioral",
  closing: "Closing",
};
