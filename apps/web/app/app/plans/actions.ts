"use server";

import { revalidatePath } from "next/cache";
import { getCurrentProfile } from "@/lib/auth/current-profile";
import { createClient } from "@/lib/supabase/server";
import type { BillingPeriod, PlanAudience } from "@/lib/types/db";

// Re-checked here too (see app/app/colleges/actions.ts's header comment on
// why) — backed by plans_insert/update/delete's "with check
// (private.is_platform_admin())" at the database layer.
async function requirePlatformAdminClient() {
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== "platform_admin") {
    throw new Error("Only a platform admin can do this.");
  }
  return createClient();
}

function toPaise(rupees: FormDataEntryValue | null): number {
  const n = Number.parseFloat(String(rupees ?? ""));
  if (!Number.isFinite(n) || n < 0) throw new Error("Price must be a non-negative number.");
  return Math.round(n * 100);
}

function toQuota(value: FormDataEntryValue | null): number | null {
  const str = String(value ?? "").trim();
  if (!str) return null;
  const n = Number.parseInt(str, 10);
  if (!Number.isFinite(n) || n < 0) throw new Error("Quotas must be non-negative whole numbers.");
  return n;
}

export async function createPlan(formData: FormData) {
  const supabase = await requirePlatformAdminClient();

  const name = String(formData.get("name") ?? "").trim();
  const audience = String(formData.get("audience") ?? "") as PlanAudience;
  const billingPeriod = String(formData.get("billing_period") ?? "yearly") as BillingPeriod;

  if (!name || !["student", "college"].includes(audience)) {
    throw new Error("A plan needs a name and an audience.");
  }

  const { error } = await supabase.from("plans").insert({
    name,
    audience,
    billing_period: billingPeriod,
    price_paise: toPaise(formData.get("price_rupees")),
    currency: "INR",
    interview_quota_per_period: toQuota(formData.get("interview_quota_per_period")),
    resume_scan_quota_per_period: toQuota(formData.get("resume_scan_quota_per_period")),
    chat_message_quota_per_period: toQuota(formData.get("chat_message_quota_per_period")),
    is_active: formData.get("is_active") === "on",
  });

  if (error) throw new Error(error.message);
  revalidatePath("/app/plans");
}

export async function updatePlan(formData: FormData) {
  const supabase = await requirePlatformAdminClient();

  const id = String(formData.get("id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const audience = String(formData.get("audience") ?? "") as PlanAudience;
  const billingPeriod = String(formData.get("billing_period") ?? "yearly") as BillingPeriod;

  if (!id || !name) throw new Error("Missing plan id or name.");

  const { error } = await supabase
    .from("plans")
    .update({
      name,
      audience,
      billing_period: billingPeriod,
      price_paise: toPaise(formData.get("price_rupees")),
      interview_quota_per_period: toQuota(formData.get("interview_quota_per_period")),
      resume_scan_quota_per_period: toQuota(formData.get("resume_scan_quota_per_period")),
      chat_message_quota_per_period: toQuota(formData.get("chat_message_quota_per_period")),
      is_active: formData.get("is_active") === "on",
    })
    .eq("id", id);

  if (error) throw new Error(error.message);
  revalidatePath("/app/plans");
}

export async function deletePlan(formData: FormData) {
  const supabase = await requirePlatformAdminClient();
  const id = String(formData.get("id") ?? "");
  if (!id) throw new Error("Missing plan id.");

  const { error } = await supabase.from("plans").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/app/plans");
}
