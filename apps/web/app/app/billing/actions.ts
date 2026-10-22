"use server";

import { getCurrentProfile } from "@/lib/auth/current-profile";
import { createClient } from "@/lib/supabase/server";
import { createRazorpayOrder, handlePaymentSuccess } from "@/lib/billing/razorpay";
import { revalidatePath } from "next/cache";

export async function createCheckoutOrder(planId: string) {
  const profile = await getCurrentProfile();
  if (!profile) {
    throw new Error("You must be signed in to purchase a plan.");
  }

  const supabase = await createClient();
  const { data: plan, error: planError } = await supabase
    .from("plans")
    .select("*")
    .eq("id", planId)
    .single();

  if (planError || !plan) {
    throw new Error("Plan not found or inactive.");
  }

  const order = await createRazorpayOrder({
    amountPaise: plan.price_paise,
    currency: plan.currency,
    receipt: `receipt_${Date.now()}`,
    notes: {
      userId: profile.id,
      planId: plan.id,
    },
  });

  // Record payment row
  await supabase.from("payments").insert({
    user_id: profile.id,
    college_id: profile.college_id,
    plan_id: plan.id,
    razorpay_order_id: order.id,
    amount_paise: plan.price_paise,
    currency: plan.currency,
    status: "created",
    notes: { planName: plan.name },
  });

  return {
    orderId: order.id,
    amount: order.amount,
    currency: order.currency,
    keyId: process.env.RAZORPAY_KEY_ID || "rzp_test_placeholder",
    planName: plan.name,
  };
}

export async function simulatePaymentCapture(orderId: string, planId: string) {
  const profile = await getCurrentProfile();
  if (!profile) throw new Error("Unauthorized");

  const mockPaymentId = `pay_${Date.now()}`;
  await handlePaymentSuccess({
    orderId,
    paymentId: mockPaymentId,
    userId: profile.id,
    collegeId: profile.college_id,
    planId,
  });

  revalidatePath("/app/billing");
  return { success: true };
}
