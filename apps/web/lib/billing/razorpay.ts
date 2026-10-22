/**
 * Razorpay Payment and Webhook Integration.
 *
 * Implements docs/BUILD_SPEC.md Part 2 ("Payments: Razorpay") & Part 7 Phase 7:
 * - Order creation via Razorpay API (or sandbox fallback)
 * - HMAC-SHA256 signature verification for webhooks and payment success
 * - Provisioning / updating quotas upon successful payment capture
 */

import crypto from "node:crypto";
import { createClient } from "@supabase/supabase-js";

const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID || "";
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET || "";
const RAZORPAY_WEBHOOK_SECRET = process.env.RAZORPAY_WEBHOOK_SECRET || "";

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
  return createClient(url, serviceKey);
}

export function verifyWebhookSignature(payload: string, signature: string): boolean {
  if (!RAZORPAY_WEBHOOK_SECRET) {
    // If webhook secret not configured in dev, pass for simulation
    return true;
  }
  const expected = crypto
    .createHmac("sha256", RAZORPAY_WEBHOOK_SECRET)
    .update(payload)
    .digest("hex");
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
}

export function verifyPaymentSignature(
  orderId: string,
  paymentId: string,
  signature: string
): boolean {
  if (!RAZORPAY_KEY_SECRET) return true;
  const expected = crypto
    .createHmac("sha256", RAZORPAY_KEY_SECRET)
    .update(`${orderId}|${paymentId}`)
    .digest("hex");
  return expected === signature;
}

export async function createRazorpayOrder({
  amountPaise,
  currency = "INR",
  receipt,
  notes = {},
}: {
  amountPaise: number;
  currency?: string;
  receipt?: string;
  notes?: Record<string, string>;
}): Promise<{ id: string; amount: number; currency: string }> {
  // If Razorpay API keys are configured, call Razorpay REST API
  if (RAZORPAY_KEY_ID && RAZORPAY_KEY_SECRET) {
    const auth = Buffer.from(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`).toString("base64");
    const res = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        amount: amountPaise,
        currency,
        receipt,
        notes,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Razorpay order creation failed: ${err}`);
    }

    const data = await res.json();
    return { id: data.id, amount: data.amount, currency: data.currency };
  }

  // Fallback for local testing / demo without live Razorpay merchant account
  const mockOrderId = `order_${crypto.randomBytes(8).toString("hex")}`;
  return { id: mockOrderId, amount: amountPaise, currency };
}

export async function handlePaymentSuccess({
  orderId,
  paymentId,
  userId,
  collegeId,
  planId,
}: {
  orderId: string;
  paymentId: string;
  userId?: string | null;
  collegeId?: string | null;
  planId?: string | null;
}): Promise<void> {
  const supabase = getAdminClient();

  // 1. Update payment record
  await supabase
    .from("payments")
    .update({
      razorpay_payment_id: paymentId,
      status: "captured",
      updated_at: new Date().toISOString(),
    })
    .eq("razorpay_order_id", orderId);

  // 2. Provision or extend quotas if planId is present
  if (planId) {
    const planRes = await supabase.from("plans").select("*").eq("id", planId).single();
    if (planRes.data) {
      const plan = planRes.data;
      const now = new Date();
      const periodStart = now.toISOString().slice(0, 10);

      const daysToAdd = plan.billing_period === "yearly" ? 365 : 30;
      const endDate = new Date(now.getTime() + daysToAdd * 24 * 60 * 60 * 1000);
      const periodEnd = endDate.toISOString().slice(0, 10);

      const scope = plan.audience === "college" ? "college" : "user";
      const quotaSpecs = [
        { feature: "interview", limit: plan.interview_quota_per_period },
        { feature: "resume_scan", limit: plan.resume_scan_quota_per_period },
        { feature: "chat_message", limit: plan.chat_message_quota_per_period },
      ];

      for (const spec of quotaSpecs) {
        if (spec.limit != null && spec.limit > 0) {
          const quotaRow: Record<string, unknown> = {
            scope,
            feature: spec.feature,
            period_start: periodStart,
            period_end: periodEnd,
            limit_units: spec.limit,
            used_units: 0,
            updated_at: new Date().toISOString(),
          };
          if (scope === "user" && userId) {
            quotaRow.user_id = userId;
          } else if (scope === "college" && collegeId) {
            quotaRow.college_id = collegeId;
          }

          await supabase.from("quotas").insert(quotaRow);
        }
      }
    }
  }
}
