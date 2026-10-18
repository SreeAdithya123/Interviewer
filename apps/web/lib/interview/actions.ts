"use client";

/**
 * Client-side wrappers around the `*_stub_interview` RPC functions
 * (supabase/migrations/20261017180000_interview_stub_bridge.sql). These
 * are real writes to the real `interviews`/`interview_turns`/
 * `interview_reports` tables under the signed-in user's own session — only
 * the *content* of a turn/report is stub-generated (see
 * lib/ai-stubs/interview-engine.ts), not the write path itself.
 *
 * TODO(phase-1): once the real engine exists, these calls move server-side
 * (the engine's service role writes directly) and this file's RPC calls
 * can be deleted along with the SQL functions they wrap.
 */

import { createClient } from "@/lib/supabase/client";
import type {
  Difficulty,
  Interview,
  InterviewReport,
  InterviewStage,
  InterviewType,
  QuestionSource,
} from "@/lib/interview/types";
import type { StubReport } from "@/lib/ai-stubs/interview-engine";

function rpcError(error: { message: string } | null, fallback: string): never {
  throw new Error(error?.message || fallback);
}

export async function createInterview(input: {
  interviewType: InterviewType;
  targetRole: string;
  companyType: string;
  difficulty: Difficulty;
}): Promise<Interview> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("create_stub_interview", {
    p_interview_type: input.interviewType,
    p_target_role: input.targetRole || null,
    p_company_type: input.companyType || null,
    p_difficulty: input.difficulty,
  });
  if (error || !data) rpcError(error, "Could not create the interview.");
  return data as Interview;
}

export async function startInterview(interviewId: string): Promise<Interview> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("start_stub_interview", {
    p_interview_id: interviewId,
  });
  if (error || !data) rpcError(error, "Could not start the interview.");
  return data as Interview;
}

export async function recordInterviewTurn(input: {
  interviewId: string;
  turnNumber: number;
  stage: InterviewStage;
  questionText: string;
  questionSource: QuestionSource;
  isFollowUp: boolean;
  transcript: string;
  answerDurationSeconds: number;
}) {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("record_stub_interview_turn", {
    p_interview_id: input.interviewId,
    p_turn_number: input.turnNumber,
    p_stage: input.stage,
    p_question_text: input.questionText,
    p_question_source: input.questionSource,
    p_is_follow_up: input.isFollowUp,
    p_transcript: input.transcript,
    p_answer_duration_seconds: input.answerDurationSeconds,
  });
  if (error || !data) rpcError(error, "Could not save that answer.");
  return data;
}

export async function finishInterview(input: {
  interviewId: string;
  durationSeconds: number;
  eyeContactPct: number | null;
  postureStabilityPct: number | null;
  report: StubReport;
}): Promise<InterviewReport> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("finish_stub_interview", {
    p_interview_id: input.interviewId,
    p_duration_seconds: input.durationSeconds,
    p_eye_contact_pct: input.eyeContactPct,
    p_posture_stability_pct: input.postureStabilityPct,
    p_scores: input.report.scores,
    p_overall_score: input.report.overall_score,
    p_strengths: input.report.strengths,
    p_weak_areas_summary: input.report.weak_areas_summary,
    p_practice_actions: input.report.practice_actions,
  });
  if (error || !data) rpcError(error, "Could not save the report.");
  return data as InterviewReport;
}
