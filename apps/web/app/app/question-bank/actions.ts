"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth/current-profile";
import { createClient } from "@/lib/supabase/server";
import type { Difficulty, InterviewType, QuestionStage, ReviewStatus } from "@/lib/types/db";

// Re-checked here too (see app/app/colleges/actions.ts's header comment) —
// backed at the database layer by question_bank_insert/update/delete's
// "with check (private.is_platform_admin())" (added in
// supabase/migrations/20261017170000_platform_admin_content_write_access.sql,
// since question_bank was originally SELECT-only for authenticated).
async function requirePlatformAdmin() {
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== "platform_admin") {
    throw new Error("Only a platform admin can do this.");
  }
  return profile;
}

function parseTags(raw: FormDataEntryValue | null): string[] {
  return String(raw ?? "")
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
}

function emptyToNull(value: FormDataEntryValue | null): string | null {
  const str = typeof value === "string" ? value.trim() : "";
  return str.length > 0 ? str : null;
}

export async function createQuestion(formData: FormData) {
  const profile = await requirePlatformAdmin();
  const supabase = await createClient();

  const questionText = String(formData.get("question_text") ?? "").trim();
  if (!questionText) throw new Error("Question text is required.");

  const { error } = await supabase.from("question_bank").insert({
    stage: String(formData.get("stage")) as QuestionStage,
    interview_type: String(formData.get("interview_type")) as InterviewType,
    company_type: emptyToNull(formData.get("company_type")),
    role: emptyToNull(formData.get("role")),
    difficulty: String(formData.get("difficulty")) as Difficulty,
    question_text: questionText,
    ideal_answer_notes: emptyToNull(formData.get("ideal_answer_notes")),
    tags: parseTags(formData.get("tags")),
    source: emptyToNull(formData.get("source")),
    status: "draft",
    created_by: profile.id,
  });

  if (error) throw new Error(error.message);
  revalidatePath("/app/question-bank");
}

export async function updateQuestion(formData: FormData) {
  await requirePlatformAdmin();
  const supabase = await createClient();

  const id = String(formData.get("id") ?? "");
  const questionText = String(formData.get("question_text") ?? "").trim();
  if (!id || !questionText) throw new Error("Missing question id or text.");

  const { error } = await supabase
    .from("question_bank")
    .update({
      stage: String(formData.get("stage")) as QuestionStage,
      interview_type: String(formData.get("interview_type")) as InterviewType,
      company_type: emptyToNull(formData.get("company_type")),
      role: emptyToNull(formData.get("role")),
      difficulty: String(formData.get("difficulty")) as Difficulty,
      question_text: questionText,
      ideal_answer_notes: emptyToNull(formData.get("ideal_answer_notes")),
      tags: parseTags(formData.get("tags")),
      source: emptyToNull(formData.get("source")),
    })
    .eq("id", id);

  if (error) throw new Error(error.message);
  revalidatePath("/app/question-bank");
  revalidatePath(`/app/question-bank/${id}`);
}

export async function setQuestionStatus(formData: FormData) {
  const profile = await requirePlatformAdmin();
  const supabase = await createClient();

  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "") as ReviewStatus;
  if (!id || !["draft", "reviewed", "retired"].includes(status)) {
    throw new Error("Missing question id or invalid status.");
  }

  const { error } = await supabase
    .from("question_bank")
    .update({
      status,
      reviewed_by: status === "reviewed" ? profile.id : null,
      reviewed_at: status === "reviewed" ? new Date().toISOString() : null,
    })
    .eq("id", id);

  if (error) throw new Error(error.message);
  revalidatePath("/app/question-bank");
  revalidatePath(`/app/question-bank/${id}`);
}

export async function deleteQuestion(formData: FormData) {
  await requirePlatformAdmin();
  const supabase = await createClient();

  const id = String(formData.get("id") ?? "");
  if (!id) throw new Error("Missing question id.");

  const { error } = await supabase.from("question_bank").delete().eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath("/app/question-bank");
  redirect("/app/question-bank");
}
