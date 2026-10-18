"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth/current-profile";
import { createClient } from "@/lib/supabase/server";

// Server Actions are reachable by a direct POST, not only through this
// app's UI (see Next.js's Data Security guide) — every action below
// re-checks platform_admin itself rather than trusting that only the
// colleges page can call it. RLS (colleges_insert/update/delete,
// batches_insert/update/delete — both "using/with check
// (private.is_platform_admin())") backs this up at the database layer too,
// so a bypassed check here still can't write.

async function requirePlatformAdminClient() {
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== "platform_admin") {
    throw new Error("Only a platform admin can do this.");
  }
  return createClient();
}

function slugify(input: string): string {
  return (
    input
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "college"
  );
}

export async function createCollege(formData: FormData) {
  const supabase = await requirePlatformAdminClient();

  const name = String(formData.get("name") ?? "").trim();
  if (!name) throw new Error("A college name is required.");

  const rawSlug = String(formData.get("slug") ?? "").trim();
  const slug = rawSlug ? slugify(rawSlug) : slugify(name);

  const { error } = await supabase.from("colleges").insert({
    name,
    slug,
    city: emptyToNull(formData.get("city")),
    state: emptyToNull(formData.get("state")),
    website_url: emptyToNull(formData.get("website_url")),
    logo_url: emptyToNull(formData.get("logo_url")),
    is_active: formData.get("is_active") === "on",
  });

  if (error) throw new Error(error.message);
  revalidatePath("/app/colleges");
}

export async function updateCollege(formData: FormData) {
  const supabase = await requirePlatformAdminClient();

  const id = String(formData.get("id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  if (!id || !name) throw new Error("Missing college id or name.");

  const rawSlug = String(formData.get("slug") ?? "").trim();

  const { error } = await supabase
    .from("colleges")
    .update({
      name,
      slug: rawSlug ? slugify(rawSlug) : undefined,
      city: emptyToNull(formData.get("city")),
      state: emptyToNull(formData.get("state")),
      website_url: emptyToNull(formData.get("website_url")),
      logo_url: emptyToNull(formData.get("logo_url")),
      is_active: formData.get("is_active") === "on",
    })
    .eq("id", id);

  if (error) throw new Error(error.message);
  revalidatePath("/app/colleges");
  revalidatePath(`/app/colleges/${id}`);
}

export async function deleteCollege(formData: FormData) {
  const supabase = await requirePlatformAdminClient();
  const id = String(formData.get("id") ?? "");
  if (!id) throw new Error("Missing college id.");

  const { error } = await supabase.from("colleges").delete().eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath("/app/colleges");
  redirect("/app/colleges");
}

export async function createBatch(formData: FormData) {
  const supabase = await requirePlatformAdminClient();

  const collegeId = String(formData.get("college_id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const graduationYearRaw = String(formData.get("graduation_year") ?? "");
  const graduationYear = Number.parseInt(graduationYearRaw, 10);

  if (!collegeId || !name || !Number.isFinite(graduationYear)) {
    throw new Error("A batch needs a name and a graduation year.");
  }

  const { error } = await supabase.from("batches").insert({
    college_id: collegeId,
    name,
    department: emptyToNull(formData.get("department")),
    graduation_year: graduationYear,
    is_active: formData.get("is_active") === "on",
  });

  if (error) throw new Error(error.message);
  revalidatePath(`/app/colleges/${collegeId}`);
}

export async function updateBatch(formData: FormData) {
  const supabase = await requirePlatformAdminClient();

  const id = String(formData.get("id") ?? "");
  const collegeId = String(formData.get("college_id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const graduationYearRaw = String(formData.get("graduation_year") ?? "");
  const graduationYear = Number.parseInt(graduationYearRaw, 10);

  if (!id || !collegeId || !name || !Number.isFinite(graduationYear)) {
    throw new Error("A batch needs a name and a graduation year.");
  }

  const { error } = await supabase
    .from("batches")
    .update({
      name,
      department: emptyToNull(formData.get("department")),
      graduation_year: graduationYear,
      is_active: formData.get("is_active") === "on",
    })
    .eq("id", id);

  if (error) throw new Error(error.message);
  revalidatePath(`/app/colleges/${collegeId}`);
}

export async function deleteBatch(formData: FormData) {
  const supabase = await requirePlatformAdminClient();
  const id = String(formData.get("id") ?? "");
  const collegeId = String(formData.get("college_id") ?? "");
  if (!id) throw new Error("Missing batch id.");

  const { error } = await supabase.from("batches").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath(`/app/colleges/${collegeId}`);
}

function emptyToNull(value: FormDataEntryValue | null): string | null {
  const str = typeof value === "string" ? value.trim() : "";
  return str.length > 0 ? str : null;
}
