/**
 * Server-only HTTP client for the real FastAPI engine's chat & knowledge-base routes.
 * Same rules as lib/interview/engine-client.ts: no "use client",
 * only ever imported from Server Actions ("use server").
 */

const ENGINE_BASE_URL = process.env.ENGINE_BASE_URL || "http://localhost:8000";
const ENGINE_API_SECRET = process.env.ENGINE_API_SECRET || "";

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
  const headers = new Headers(init?.headers);
  if (ENGINE_API_SECRET && !headers.has("x-engine-secret") && !headers.has("authorization")) {
    headers.set("x-engine-secret", ENGINE_API_SECRET);
  }
  const response = await fetch(`${ENGINE_BASE_URL}${path}`, {
    ...init,
    headers,
  });
  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new EngineError(
      `Engine ${init?.method ?? "GET"} ${path} returned HTTP ${response.status}: ${detail || "(no body)"}`,
      response.status,
    );
  }
  return response.json() as Promise<T>;
}

export interface EngineCitation {
  document_id: string;
  title: string;
  source_url: string | null;
}

export interface EngineChatResponse {
  content: string;
  citations: EngineCitation[];
  declined: boolean;
  model_id: string;
}

export async function engineSendChatMessage(input: {
  sessionId: string;
  userId: string;
  message: string;
  collegeId?: string | null;
}): Promise<EngineChatResponse> {
  return engineFetch("/chat/respond", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      session_id: input.sessionId,
      user_id: input.userId,
      message: input.message,
      college_id: input.collegeId ?? null,
    }),
  });
}

export interface EngineEmbedResult {
  ok: boolean;
  document_id: string;
  chunks_created: number;
}

export async function engineEmbedDocument(
  documentId: string,
  reviewerId?: string | null,
): Promise<EngineEmbedResult> {
  return engineFetch(`/kb/documents/${documentId}/embed`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      reviewer_id: reviewerId ?? null,
    }),
  });
}
