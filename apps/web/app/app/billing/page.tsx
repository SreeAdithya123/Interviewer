import type { Metadata } from "next";
import { getCurrentProfile } from "@/lib/auth/current-profile";
import { createClient } from "@/lib/supabase/server";
import { BillingClient } from "./BillingClient";

export const metadata: Metadata = {
  title: "Billing & Plans",
};

export const dynamic = "force-dynamic";

export default async function BillingPage() {
  const profile = await getCurrentProfile();
  if (!profile) return null;

  const supabase = await createClient();

  const [plansRes, quotasRes, paymentsRes] = await Promise.all([
    supabase
      .from("plans")
      .select("id, name, audience, billing_period, price_paise, interview_quota_per_period, resume_scan_quota_per_period, chat_message_quota_per_period")
      .eq("is_active", true)
      .order("price_paise", { ascending: true }),
    supabase
      .from("quotas")
      .select("feature, limit_units, used_units, period_start, period_end")
      .or(
        profile.college_id
          ? `user_id.eq.${profile.id},college_id.eq.${profile.college_id}`
          : `user_id.eq.${profile.id}`
      ),
    supabase
      .from("payments")
      .select("id, amount_paise, currency, status, created_at")
      .or(
        profile.college_id
          ? `user_id.eq.${profile.id},college_id.eq.${profile.college_id}`
          : `user_id.eq.${profile.id}`
      )
      .order("created_at", { ascending: false })
      .limit(20),
  ]);

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h1 className="font-headline text-2xl font-semibold tracking-tight text-foreground">
          Billing & Practice Passes
        </h1>
        <p className="mt-1 font-body text-sm text-muted-foreground">
          Manage your subscription plans, view quota consumption, and unlock additional practice interviews.
        </p>
      </div>

      <BillingClient
        plans={plansRes.data || []}
        quotas={quotasRes.data || []}
        payments={paymentsRes.data || []}
      />
    </div>
  );
}
