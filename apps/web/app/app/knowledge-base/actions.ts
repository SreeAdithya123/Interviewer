"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth/current-profile";
import { createClient } from "@/lib/supabase/server";
import { engineEmbedDocument } from "@/lib/chat/engine-client";
import type { KbCategory, ReviewStatus } from "@/lib/types/db";

// Re-checked here too (see app/app/colleges/actions.ts's header comment) —
// backed at the database layer by kb_documents_select/insert/update/delete's
// "using/with check (private.is_platform_admin())" (added in
// supabase/migrations/20261017170000_platform_admin_content_write_access.sql,
// since kb_documents originally had zero anon/authenticated access at all).
async function requirePlatformAdmin() {
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== "platform_admin") {
    throw new Error("Only a platform admin can do this.");
  }
  return profile;
}

function emptyToNull(value: FormDataEntryValue | null): string | null {
  const str = typeof value === "string" ? value.trim() : "";
  return str.length > 0 ? str : null;
}

export async function createDocument(formData: FormData) {
  const profile = await requirePlatformAdmin();
  const supabase = await createClient();

  const title = String(formData.get("title") ?? "").trim();
  const rawText = String(formData.get("raw_text") ?? "").trim();
  if (!title || !rawText) throw new Error("A document needs a title and body text.");

  const category = emptyToNull(formData.get("category")) as KbCategory | null;

  const { error } = await supabase.from("kb_documents").insert({
    title,
    category,
    company_name: emptyToNull(formData.get("company_name")),
    source_url: emptyToNull(formData.get("source_url")),
    raw_text: rawText,
    status: "draft",
    created_by: profile.id,
  });

  if (error) throw new Error(error.message);
  revalidatePath("/app/knowledge-base");
}

export async function updateDocument(formData: FormData) {
  await requirePlatformAdmin();
  const supabase = await createClient();

  const id = String(formData.get("id") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  const rawText = String(formData.get("raw_text") ?? "").trim();
  if (!id || !title || !rawText) throw new Error("A document needs a title and body text.");

  const category = emptyToNull(formData.get("category")) as KbCategory | null;

  const { error } = await supabase
    .from("kb_documents")
    .update({
      title,
      category,
      company_name: emptyToNull(formData.get("company_name")),
      source_url: emptyToNull(formData.get("source_url")),
      raw_text: rawText,
    })
    .eq("id", id);

  if (error) throw new Error(error.message);
  revalidatePath("/app/knowledge-base");
  revalidatePath(`/app/knowledge-base/${id}`);
}

export async function setDocumentStatus(formData: FormData) {
  const profile = await requirePlatformAdmin();
  const supabase = await createClient();

  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "") as ReviewStatus;
  if (!id || !["draft", "reviewed", "retired"].includes(status)) {
    throw new Error("Missing document id or invalid status.");
  }

  const { error } = await supabase
    .from("kb_documents")
    .update({
      status,
      reviewed_by: status === "reviewed" ? profile.id : null,
      reviewed_at: status === "reviewed" ? new Date().toISOString() : null,
    })
    .eq("id", id);

  if (error) throw new Error(error.message);
  revalidatePath("/app/knowledge-base");
  revalidatePath(`/app/knowledge-base/${id}`);
}

/** "Approve → chunk & embed" via real FastAPI engine (BUILD_SPEC Part 4.8). */
export async function approveAndEmbedDocument(formData: FormData) {
  const profile = await requirePlatformAdmin();

  const id = String(formData.get("id") ?? "");
  if (!id) throw new Error("Missing document id.");

  await engineEmbedDocument(id, profile.id);

  revalidatePath("/app/knowledge-base");
  revalidatePath(`/app/knowledge-base/${id}`);
}

export async function deleteDocument(formData: FormData) {
  await requirePlatformAdmin();
  const supabase = await createClient();

  const id = String(formData.get("id") ?? "");
  if (!id) throw new Error("Missing document id.");

  const { error } = await supabase.from("kb_documents").delete().eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath("/app/knowledge-base");
  redirect("/app/knowledge-base");
}
