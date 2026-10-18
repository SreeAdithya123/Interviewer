"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth/current-profile";
import { createClient } from "@/lib/supabase/server";

// Re-checked here too (see app/app/colleges/actions.ts's header comment) —
// backed at the database layer by golden_set_ratings_all's "using/with
// check (private.is_platform_admin())" (unchanged from
// supabase/migrations/20261015120007_row_level_security.sql — this table
// already allowed full platform_admin CRUD).
async function requirePlatformAdmin() {
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== "platform_admin") {
    throw new Error("Only a platform admin can do this.");
  }
  return profile;
}

function scoreOf(formData: FormData, field: string): number {
  const n = Number.parseInt(String(formData.get(field) ?? ""), 10);
  if (!Number.isFinite(n) || n < 1 || n > 5) {
    throw new Error(`${field.replace(/_/g, " ")} must be a score from 1 to 5.`);
  }
  return n;
}

export async function submitGoldenSetRating(formData: FormData) {
  const profile = await requirePlatformAdmin();
  const supabase = await createClient();

  const interviewId = String(formData.get("interview_id") ?? "");
  const interviewReportId = String(formData.get("interview_report_id") ?? "") || null;
  if (!interviewId) throw new Error("Missing interview id.");

  const rubricScores = {
    communication_clarity: scoreOf(formData, "communication_clarity"),
    answer_structure: scoreOf(formData, "answer_structure"),
    technical_depth: scoreOf(formData, "technical_depth"),
    relevance: scoreOf(formData, "relevance"),
    confidence_delivery: scoreOf(formData, "confidence_delivery"),
  };

  const raterNotes = String(formData.get("rater_notes") ?? "").trim() || null;
  const promptVersionCompared = String(formData.get("prompt_version_compared") ?? "").trim() || null;

  const { error } = await supabase.from("golden_set_ratings").insert({
    interview_id: interviewId,
    interview_report_id: interviewReportId,
    rater_id: profile.id,
    rubric_scores: rubricScores,
    rater_notes: raterNotes,
    prompt_version_compared: promptVersionCompared,
  });

  if (error) throw new Error(error.message);

  revalidatePath("/app/golden-set");
  redirect(`/app/golden-set/${interviewId}?rated=1`);
}
