"use server";

/**
 * Server Actions for the real AI interview engine. Runs server-side only,
 * so it can read the signed-in user via `getCurrentProfile()` (cookie
 * session, never trusted from client input) before calling the FastAPI
 * engine (services/engine) — which itself has no auth of its own and
 * trusts its caller, per services/engine/docs/DECISIONS.md. This file is
 * that trusted caller; the browser never talks to the engine directly.
 *
 * Replaces the previous `create_stub_interview`/`record_stub_interview_turn`/
 * `finish_stub_interview` RPC calls (supabase/migrations/
 * 20261017160925_interview_stub_bridge.sql) now that the real engine
 * exists and has seeded `interview_templates`/`question_bank` rows to
 * work with (supabase/seed/001_interview_templates_and_question_bank.sql)
 * — per that migration's own header, which already called this move
 * "server-side... the engine's service role writes directly" the intended
 * end state. The stub RPC functions themselves are left in the schema for
 * now (harmless, unused) rather than dropped in this same change.
 */

import { getCurrentProfile } from "@/lib/auth/current-profile";
import {
  EngineError,
  engineCreateInterview,
  engineFinishInterview,
  engineGetInterviewTurns,
  engineGetNextTurn,
  engineRetryReport,
  engineSubmitAnswer,
  type DeliveryAggregates,
  type EngineNextTurn,
  type EngineSubmitAnswerResult,
} from "@/lib/interview/engine-client";
import { createClient } from "@/lib/supabase/server";
import type { Difficulty, Interview, InterviewTurn, InterviewType } from "@/lib/interview/types";

async function requireSignedInProfile() {
  const profile = await getCurrentProfile();
  if (!profile) {
    throw new Error("You must be signed in to do this.");
  }
  return profile;
}

export async function createInterview(input: {
  interviewType: InterviewType;
  targetRole: string;
  companyType: string;
  difficulty: Difficulty;
}): Promise<Interview> {
  const profile = await requireSignedInProfile();

  const created = await engineCreateInterview({
    userId: profile.id,
    interviewType: input.interviewType,
    difficulty: input.difficulty,
    targetRole: input.targetRole || null,
    companyType: input.companyType || null,
    collegeId: profile.college_id,
  });

  const supabase = await createClient();
  const { data, error } = await supabase.from("interviews").select("*").eq("id", created.id).single();
  if (error || !data) {
    throw new Error("Interview was created but could not be read back.");
  }
  return data as Interview;
}

export async function getNextTurn(interviewId: string): Promise<EngineNextTurn> {
  await requireSignedInProfile();
  try {
    return await engineGetNextTurn(interviewId);
  } catch (err) {
    // 409 here means the engine's own InvalidInterviewStateError for an
    // interview whose status is already 'completed'/'abandoned' (see
    // services/engine/app/main.py's _raise_for_engine_error). From the
    // room's perspective that's the same actionable outcome as a normal
    // "interview_finished": go to the report — not a dead-end error with
    // a "try again" button that would just 409 again every time. Real
    // case this fixes: React's dev-mode double-invoked mount effect calls
    // this twice; if the first call's side effect already finished the
    // interview server-side before its result could be applied client-side
    // (see InterviewRoomClient's mount-effect comment), the second call
    // used to surface this as a raw, unrecoverable error.
    if (err instanceof EngineError && err.status === 409) {
      return {
        interview_finished: true,
        turn_id: null,
        turn_number: null,
        stage: null,
        question_text: null,
        question_source: null,
        question_bank_id: null,
        is_follow_up: false,
        follow_up_of_turn_id: null,
        question_audio_url: null,
      };
    }
    throw err;
  }
}

export async function submitAnswer(formData: FormData): Promise<EngineSubmitAnswerResult> {
  await requireSignedInProfile();

  const interviewId = String(formData.get("interviewId") ?? "");
  const turnId = String(formData.get("turnId") ?? "");
  const answerDurationSeconds = Number(formData.get("answerDurationSeconds") ?? 0);
  const audio = formData.get("audio");
  const candidateCode = formData.get("candidateCode") ? String(formData.get("candidateCode")) : undefined;
  const codeLanguage = formData.get("codeLanguage") ? String(formData.get("codeLanguage")) : undefined;

  if (!interviewId || !turnId) {
    throw new Error("Missing interviewId or turnId.");
  }
  if (!(audio instanceof Blob)) {
    throw new Error("Missing recorded audio.");
  }

  return engineSubmitAnswer(interviewId, turnId, audio, answerDurationSeconds, candidateCode, codeLanguage);
}

export async function finishInterview(
  interviewId: string,
  aggregates?: DeliveryAggregates,
): Promise<void> {
  await requireSignedInProfile();
  await engineFinishInterview(interviewId, aggregates);
}

export async function getInterviewTurns(interviewId: string): Promise<InterviewTurn[]> {
  await requireSignedInProfile();
  const turns = await engineGetInterviewTurns(interviewId);
  return turns as unknown as InterviewTurn[];
}

export async function retryInterviewReport(interviewId: string): Promise<void> {
  await requireSignedInProfile();
  await engineRetryReport(interviewId);
}
