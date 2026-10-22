/**
 * Server-only HTTP client for the real FastAPI interview engine
 * (services/engine). No "use client" here — this module must only ever
 * be imported from lib/interview/actions.ts ("use server"), never from a
 * Client Component, since the engine has no auth of its own (it trusts
 * its caller, per services/engine/docs/DECISIONS.md) and
 * `ENGINE_BASE_URL` is a server-only env var with no NEXT_PUBLIC_ prefix.
 *
 * Mirrors the routes in services/engine/app/main.py exactly:
 *   POST /interviews
 *   POST /interviews/{id}/turns/next
 *   POST /interviews/{id}/turns/{turnId}/answer  (multipart)
 *   POST /interviews/{id}/finish
 *   GET  /interviews/{id}/report
 */

import type {
  Difficulty,
  InterviewStage,
  InterviewType,
  QuestionSource,
} from "@/lib/interview/types";

const ENGINE_BASE_URL = process.env.ENGINE_BASE_URL || "http://localhost:8000";

export class EngineError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = "EngineError";
  }
}

async function engineFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${ENGINE_BASE_URL}${path}`, init);
  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new EngineError(
      `Engine ${init?.method ?? "GET"} ${path} returned HTTP ${response.status}: ${detail || "(no body)"}`,
      response.status,
    );
  }
  return response.json() as Promise<T>;
}

export interface EngineNextTurn {
  interview_finished: boolean;
  turn_id: string | null;
  turn_number: number | null;
  stage: InterviewStage | null;
  question_text: string | null;
  question_source: QuestionSource | null;
  question_bank_id: string | null;
  is_follow_up: boolean;
  follow_up_of_turn_id: string | null;
  question_audio_url: string | null;
}

export interface EngineSubmitAnswerResult {
  turn_id: string;
  transcript: string;
  stt_provider: "groq" | "sarvam";
  stt_fallback_used: boolean;
  next_turn: EngineNextTurn;
}

export async function engineCreateInterview(input: {
  userId: string;
  interviewType: InterviewType;
  difficulty: Difficulty;
  targetRole: string | null;
  companyType: string | null;
  collegeId: string | null;
}): Promise<{ id: string; status: string }> {
  return engineFetch("/interviews", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      user_id: input.userId,
      interview_type: input.interviewType,
      difficulty: input.difficulty,
      target_role: input.targetRole,
      company_type: input.companyType,
      college_id: input.collegeId,
    }),
  });
}

export async function engineGetNextTurn(interviewId: string): Promise<EngineNextTurn> {
  return engineFetch(`/interviews/${interviewId}/turns/next`, { method: "POST" });
}

export async function engineSubmitAnswer(
  interviewId: string,
  turnId: string,
  audio: Blob,
  answerDurationSeconds: number,
  candidateCode?: string,
  codeLanguage?: string,
): Promise<EngineSubmitAnswerResult> {
  const form = new FormData();
  form.append("audio", audio, "answer.webm");
  form.append("answer_duration_seconds", String(answerDurationSeconds));
  if (candidateCode) {
    form.append("candidate_code", candidateCode);
  }
  if (codeLanguage) {
    form.append("code_language", codeLanguage);
  }
  return engineFetch(`/interviews/${interviewId}/turns/${turnId}/answer`, {
    method: "POST",
    body: form,
  });
}

export interface DeliveryAggregates {
  eyeContactPct?: number | null;
  postureStabilityPct?: number | null;
}

export async function engineGetTurnUploadUrl(
  interviewId: string,
  turnId: string,
): Promise<{ upload_url: string; audio_key: string }> {
  return engineFetch(`/interviews/${interviewId}/turns/${turnId}/upload-url`, { method: "POST" });
}

export async function engineGetInterviewTurns(interviewId: string): Promise<Record<string, unknown>[]> {
  return engineFetch(`/interviews/${interviewId}/turns`, { method: "GET" });
}

export async function engineFinishInterview(
  interviewId: string,
  aggregates?: DeliveryAggregates,
): Promise<void> {
  await engineFetch(`/interviews/${interviewId}/finish`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      eye_contact_pct: aggregates?.eyeContactPct ?? null,
      posture_stability_pct: aggregates?.postureStabilityPct ?? null,
    }),
  });
}

export async function engineRetryReport(interviewId: string): Promise<void> {
  await engineFetch(`/interviews/${interviewId}/report/retry`, {
    method: "POST",
  });
}
