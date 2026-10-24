/**
 * Server-only HTTP client for the real FastAPI engine's resume routes.
 * Same shape/rules as lib/interview/engine-client.ts: no "use client",
 * only ever imported from lib/resume/actions.ts ("use server") — the
 * engine has no auth of its own and trusts its caller.
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

export interface EngineScanResume {
  scan_id: string;
  parsed_resume: Record<string, unknown>;
  parse_health: {
    status: "clean" | "partial" | "poor";
    sections_detected: string[];
    sections_missing: string[];
    notes: string[];
  };
  jd_match: {
    skills_present: string[];
    skills_missing: { skill: string; suggested_section: string }[];
    notes: string[];
  } | null;
  bullet_quality: {
    bullets: { section: string; text: string; issues: string[]; suggestion: string | null }[];
    overall_notes: string[];
  };
  formatting_risks: {
    risks: { severity: "low" | "medium" | "high"; message: string }[];
  };
}

export async function engineScanResume(params: {
  userId: string;
  collegeId: string | null;
  resumeId: string | null;
  jobDescriptionId: string | null;
  resumeData: Record<string, unknown> | null;
  pdfBase64: string | null;
  jobDescriptionText: string | null;
}): Promise<EngineScanResume> {
  return engineFetch("/resume/scan", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      user_id: params.userId,
      college_id: params.collegeId,
      resume_id: params.resumeId,
      job_description_id: params.jobDescriptionId,
      resume_data: params.resumeData,
      pdf_base64: params.pdfBase64,
      job_description_text: params.jobDescriptionText,
    }),
  });
}
