"use server";

/**
 * Server Actions for resume AI features. Runs server-side only so it can
 * read the signed-in user via getCurrentProfile() before calling the
 * engine (which trusts its caller, same reasoning as lib/interview/actions.ts).
 *
 * Replaces apps/web/lib/ai-stubs/rewrite-bullet.ts now that the real
 * engine route exists (POST /resume/bullet/rewrite). Returns the exact
 * same RewriteResult-shaped discriminated union the stub did, so
 * components/resume/BulletField.tsx needed only its import line changed.
 */

import { getCurrentProfile } from "@/lib/auth/current-profile";
import { createClient } from "@/lib/supabase/server";
import { engineRewriteBullet, engineScanResume } from "@/lib/resume/engine-client";
import type { ResumeData } from "@/lib/resume/types";

export type RewriteResult =
  | { kind: "rewritten"; text: string }
  | { kind: "needs_metric"; question: string };

export interface ParseHealthResult {
  status: "clean" | "partial" | "poor";
  sections_detected: string[];
  sections_missing: string[];
  notes: string[];
}

export interface JdMatchResult {
  skills_present: string[];
  skills_missing: { skill: string; suggested_section: string }[];
  notes: string[];
}

export interface BulletQualityResult {
  bullets: { section: string; text: string; issues: string[]; suggestion: string | null }[];
  overall_notes: string[];
}

export interface FormattingRisksResult {
  risks: { severity: "low" | "medium" | "high"; message: string }[];
}

export interface ScanResumeResult {
  scan_id: string;
  parsed_resume: ResumeData | Record<string, unknown>;
  parse_health: ParseHealthResult;
  jd_match: JdMatchResult | null;
  bullet_quality: BulletQualityResult;
  formatting_risks: FormattingRisksResult;
}

async function requireSignedInProfile() {
  const profile = await getCurrentProfile();
  if (!profile) {
    throw new Error("You must be signed in to do this.");
  }
  return profile;
}

export async function rewriteBullet(bullet: string): Promise<RewriteResult> {
  const profile = await requireSignedInProfile();
  const result = await engineRewriteBullet(bullet, profile.id, profile.college_id);
  if (result.kind === "rewritten" && result.text) {
    return { kind: "rewritten", text: result.text };
  }
  if (result.kind === "needs_metric" && result.question) {
    return { kind: "needs_metric", question: result.question };
  }
  throw new Error("The engine returned an unexpected bullet-rewrite response.");
}

/** Folds a student's answer to a `needs_metric` follow-up question back
 * into the original bullet, then asks for a rewrite again — same call,
 * no separate engine endpoint, matching the stub's own behavior. */
export async function applyMetricAnswer(bullet: string, metricAnswer: string): Promise<RewriteResult> {
  return rewriteBullet(`${bullet.trim()} (${metricAnswer.trim()})`);
}

/**
 * Real resume scanner (BUILD_SPEC Part 4.4), replacing
 * apps/web/lib/ai-stubs/scan-resume.ts and the create_stub_resume_scan RPC
 * components/resume/ScannerClient.tsx used to call directly. Exactly one
 * of `resumeId`/`pdfBase64` must be given.
 *
 * For a saved resume, this re-reads its `data` here (through the
 * signed-in user's own RLS-scoped session) rather than trusting whatever
 * the client claims that resume's content is — a client could otherwise
 * send mismatched `resumeId`/content and end up with a stored scan row
 * that's linked to one resume but shows another's data.
 */
export async function scanResume(params: {
  resumeId: string | null;
  pdfBase64: string | null;
  jobDescriptionText: string | null;
}): Promise<ScanResumeResult> {
  const { resumeId, pdfBase64, jobDescriptionText } = params;
  if ((resumeId === null) === (pdfBase64 === null)) {
    throw new Error("Pick a saved resume or upload a PDF — not both, not neither.");
  }

  const profile = await requireSignedInProfile();
  const supabase = await createClient();

  let resumeData: ResumeData | null = null;
  if (resumeId) {
    const { data, error } = await supabase.from("resumes").select("data").eq("id", resumeId).single();
    if (error || !data) {
      throw new Error("That resume could not be found.");
    }
    resumeData = data.data as ResumeData;
  }

  let jobDescriptionId: string | null = null;
  const trimmedJd = jobDescriptionText?.trim() || null;
  if (trimmedJd) {
    const { data: jd, error: jdError } = await supabase
      .from("job_descriptions")
      .insert({ user_id: profile.id, raw_text: trimmedJd })
      .select("id")
      .single();
    if (jdError) throw jdError;
    jobDescriptionId = jd.id as string;
  }

  const result = await engineScanResume({
    userId: profile.id,
    collegeId: profile.college_id,
    resumeId,
    jobDescriptionId,
    resumeData: resumeData as unknown as Record<string, unknown> | null,
    pdfBase64,
    jobDescriptionText: trimmedJd,
  });

  return {
    scan_id: result.scan_id,
    parsed_resume: result.parsed_resume,
    parse_health: result.parse_health,
    jd_match: result.jd_match,
    bullet_quality: result.bullet_quality,
    formatting_risks: result.formatting_risks,
  };
}
