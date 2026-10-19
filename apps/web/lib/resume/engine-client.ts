/**
 * Server-only HTTP client for the real FastAPI engine's resume routes.
 * Same shape/rules as lib/interview/engine-client.ts: no "use client",
 * only ever imported from lib/resume/actions.ts ("use server") — the
 * engine has no auth of its own and trusts its caller.
 */

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

export interface EngineBulletRewrite {
  kind: "rewritten" | "needs_metric";
  text: string | null;
  question: string | null;
}

export async function engineRewriteBullet(
  bullet: string,
  userId: string,
  collegeId: string | null,
): Promise<EngineBulletRewrite> {
  return engineFetch("/resume/bullet/rewrite", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ bullet, user_id: userId, college_id: collegeId }),
  });
}
