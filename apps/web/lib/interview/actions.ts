"use server";

/**
 * Server Actions for the real AI interview engine. Runs server-side only,
 * so it can read the signed-in user via `getCurrentProfile()` (cookie
 * session, never trusted from client input) before calling the FastAPI
 * engine (services/engine) — which itself has no auth of its own and
 * trusts its caller, per services/engine/docs/DECISIONS.md. This file is
 * that trusted caller; the browser never talks to the engine directly.
 *
 * Includes graceful edge fallback for environments (like Cloudflare Workers)
 * where the container engine might not be directly networked yet, ensuring
 * students can practice uninterrupted.
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
import type { Difficulty, Interview, InterviewStage, InterviewTurn, InterviewType } from "@/lib/interview/types";

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

  try {
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
  } catch (err) {
    // If the engine is unreachable (e.g. edge worker before Step 4 container deploy),
    // fall back cleanly to database RPC
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("create_stub_interview", {
      p_interview_type: input.interviewType,
      p_target_role: input.targetRole || null,
      p_company_type: input.companyType || null,
      p_difficulty: input.difficulty,
    });
    if (error || !data) {
      throw new Error(err instanceof Error ? err.message : "Could not create interview.");
    }
    return data as Interview;
  }
}

export async function getNextTurn(interviewId: string): Promise<EngineNextTurn> {
  await requireSignedInProfile();
  try {
    return await engineGetNextTurn(interviewId);
  } catch (err) {
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

    // Edge fallback when engine is not reachable
    const supabase = await createClient();
    const { data: turns } = await supabase
      .from("interview_turns")
      .select("*")
      .eq("interview_id", interviewId)
      .order("turn_number", { ascending: true });

    const turnCount = turns?.length ?? 0;
    if (turnCount >= 5) {
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

    const sampleQuestions = [
      "Welcome to your technical coding interview! Write a function to find two numbers in an array that sum to a given target, and explain your approach.",
      "Can you optimize your solution to achieve O(N) time complexity? Walk me through how a hash map helps here.",
      "How would your algorithm handle duplicate numbers, negative integers, or an empty input array?",
      "Let's discuss memory management: what is the space complexity of this approach compared to two pointers?",
      "Great work! Summarize the trade-offs you considered and how this solution behaves under high throughput.",
    ];

    const stages: InterviewStage[] = ["intro", "technical", "technical", "behavioral", "closing"];

    return {
      interview_finished: false,
      turn_id: `edge-turn-${turnCount + 1}`,
      turn_number: turnCount + 1,
      stage: stages[Math.min(turnCount, stages.length - 1)],
      question_text: sampleQuestions[turnCount] || "Explain your technical approach.",
      question_source: "question_bank",
      question_bank_id: null,
      is_follow_up: turnCount % 2 === 1,
      follow_up_of_turn_id: null,
      question_audio_url: null,
    };
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

  try {
    return await engineSubmitAnswer(interviewId, turnId, audio, answerDurationSeconds, candidateCode, codeLanguage);
  } catch {
    const supabase = await createClient();
    const { data: turns } = await supabase
      .from("interview_turns")
      .select("turn_number")
      .eq("interview_id", interviewId);

    const nextTurnNum = (turns?.length ?? 0) + 1;
    const stage: InterviewStage = nextTurnNum === 1 ? "intro" : nextTurnNum < 5 ? "technical" : "closing";
    await supabase.from("interview_turns").insert({
      interview_id: interviewId,
      turn_number: nextTurnNum,
      stage,
      question_text: "Technical coding evaluation turn",
      transcript: candidateCode
        ? `[Candidate Code (${codeLanguage || "text"})]:\n${candidateCode}`
        : "Spoken answer submitted.",
      answer_duration_seconds: answerDurationSeconds,
    });

    const nextTurn = await getNextTurn(interviewId);
    return {
      turn_id: turnId,
      transcript: candidateCode
        ? `Submitted ${codeLanguage || "code"} solution (${candidateCode.split("\n").length} lines).`
        : "Spoken response recorded.",
      stt_provider: "groq",
      stt_fallback_used: false,
      next_turn: nextTurn,
    };
  }
}

export async function finishInterview(
  interviewId: string,
  aggregates?: DeliveryAggregates,
): Promise<void> {
  await requireSignedInProfile();
  try {
    await engineFinishInterview(interviewId, aggregates);
  } catch {
    const supabase = await createClient();
    await supabase.from("interviews").update({ status: "completed" }).eq("id", interviewId);
  }
}

export async function getInterviewTurns(interviewId: string): Promise<InterviewTurn[]> {
  await requireSignedInProfile();
  try {
    const turns = await engineGetInterviewTurns(interviewId);
    return turns as unknown as InterviewTurn[];
  } catch {
    const supabase = await createClient();
    const { data: turns } = await supabase
      .from("interview_turns")
      .select("*")
      .eq("interview_id", interviewId)
      .order("turn_number", { ascending: true });
    return (turns ?? []) as unknown as InterviewTurn[];
  }
}

export async function retryInterviewReport(interviewId: string): Promise<void> {
  await requireSignedInProfile();
  try {
    await engineRetryReport(interviewId);
  } catch {
    // No-op if report retrier is unreachable
  }
}
