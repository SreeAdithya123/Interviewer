// Hand-written row types for tables the platform-admin / prep-assistant
// pages read and write directly. Mirrors the live schema exactly — see
// supabase/migrations/2026101512000{1,3,4,5,6}_*.sql — do not add columns
// here that aren't in those migrations.

export interface College {
  id: string;
  name: string;
  slug: string;
  city: string | null;
  state: string | null;
  website_url: string | null;
  logo_url: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Batch {
  id: string;
  college_id: string;
  name: string;
  department: string | null;
  graduation_year: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export type PlanAudience = "student" | "college";
export type BillingPeriod = "monthly" | "yearly";

export interface Plan {
  id: string;
  name: string;
  audience: PlanAudience;
  billing_period: BillingPeriod;
  price_paise: number;
  currency: string;
  interview_quota_per_period: number | null;
  resume_scan_quota_per_period: number | null;
  chat_message_quota_per_period: number | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export type QuestionStage = "intro" | "resume_deep_dive" | "technical" | "behavioral" | "closing";
export type InterviewType = "hr" | "technical" | "behavioral" | "mixed";
export type Difficulty = "easy" | "medium" | "hard";
export type ReviewStatus = "draft" | "reviewed" | "retired";

export const QUESTION_STAGES: QuestionStage[] = [
  "intro",
  "resume_deep_dive",
  "technical",
  "behavioral",
  "closing",
];
export const INTERVIEW_TYPES: InterviewType[] = ["hr", "technical", "behavioral", "mixed"];
export const DIFFICULTIES: Difficulty[] = ["easy", "medium", "hard"];
export const REVIEW_STATUSES: ReviewStatus[] = ["draft", "reviewed", "retired"];

export interface QuestionBankRow {
  id: string;
  stage: QuestionStage;
  interview_type: InterviewType;
  company_type: string | null;
  role: string | null;
  difficulty: Difficulty;
  question_text: string;
  ideal_answer_notes: string | null;
  tags: string[];
  source: string | null;
  status: ReviewStatus;
  created_by: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
}

export type KbCategory = "senior_experience" | "company_pattern" | "topic_resource" | "placement_info";

export const KB_CATEGORIES: KbCategory[] = [
  "senior_experience",
  "company_pattern",
  "topic_resource",
  "placement_info",
];

export interface KbDocument {
  id: string;
  title: string;
  category: KbCategory | null;
  company_name: string | null;
  source_url: string | null;
  raw_text: string;
  status: ReviewStatus;
  created_by: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
}

export type UsageFeature =
  | "interview"
  | "resume_scan"
  | "resume_parse"
  | "chat_message"
  | "tts"
  | "stt"
  | "embedding"
  | "ocr";

export interface UsageEvent {
  id: string;
  user_id: string | null;
  college_id: string | null;
  feature: UsageFeature;
  provider: string;
  model: string | null;
  units: Record<string, unknown>;
  cost_paise: number;
  interview_id: string | null;
  chat_session_id: string | null;
  resume_scan_id: string | null;
  created_at: string;
}

export type InterviewStatus = "pending" | "in_progress" | "completed" | "abandoned";

export interface InterviewRow {
  id: string;
  user_id: string;
  college_id: string | null;
  template_id: string | null;
  interview_type: InterviewType;
  target_role: string | null;
  company_type: string | null;
  difficulty: Difficulty;
  status: InterviewStatus;
  current_stage: QuestionStage | null;
  started_at: string | null;
  ended_at: string | null;
  duration_seconds: number | null;
  eye_contact_pct: number | null;
  posture_stability_pct: number | null;
  total_cost_paise: number;
  created_at: string;
  updated_at: string;
}

export interface InterviewTurnRow {
  id: string;
  interview_id: string;
  turn_number: number;
  stage: QuestionStage;
  question_text: string;
  question_source: "question_bank" | "resume_specific" | "follow_up";
  question_bank_id: string | null;
  is_follow_up: boolean;
  follow_up_of_turn_id: string | null;
  answer_duration_seconds: number | null;
  transcript: string | null;
  stt_provider: "groq" | "sarvam" | null;
  stt_fallback_used: boolean;
  latency_ms: number | null;
  created_at: string;
}

export interface InterviewReportRow {
  id: string;
  interview_id: string;
  user_id: string;
  college_id: string | null;
  status: "pending" | "completed" | "failed";
  scores: Record<string, unknown> | null;
  overall_score: number | null;
  strengths: unknown[];
  weak_areas_summary: unknown[];
  practice_actions: unknown[];
  eye_contact_pct: number | null;
  posture_stability_pct: number | null;
  model_id: string | null;
  prompt_version: string | null;
  error_message: string | null;
  created_at: string;
  updated_at: string;
}

/** The same five dimensions interview_reports.scores is evaluated on (Part 4.5 step 8). */
export interface RubricScores {
  communication_clarity: number;
  answer_structure: number;
  technical_depth: number;
  relevance: number;
  confidence_delivery: number;
}

export interface GoldenSetRating {
  id: string;
  interview_id: string;
  interview_report_id: string | null;
  rater_id: string | null;
  rubric_scores: RubricScores;
  rater_notes: string | null;
  prompt_version_compared: string | null;
  created_at: string;
}

export interface ChatSession {
  id: string;
  user_id: string;
  college_id: string | null;
  title: string;
  created_at: string;
  updated_at: string;
}

export interface ChatMessage {
  id: string;
  session_id: string;
  role: "user" | "assistant";
  content: string;
  citations: unknown[];
  declined: boolean;
  model_id: string | null;
  created_at: string;
}
