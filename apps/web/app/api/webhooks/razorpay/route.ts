import { NextRequest, NextResponse } from "next/server";
import { handlePaymentSuccess, verifyWebhookSignature } from "@/lib/billing/razorpay";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get("x-razorpay-signature") || "";

    if (!verifyWebhookSignature(rawBody, signature)) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
    }

    const event = JSON.parse(rawBody);

    if (event.event === "payment.captured" || event.event === "order.paid") {
      const payment = event.payload?.payment?.entity;
      const order = event.payload?.order?.entity;

      const orderId = order?.id || payment?.order_id;
      const paymentId = payment?.id;

      if (orderId && paymentId) {
        // Look up payment row in database to get plan/user info
        const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
        const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
        const adminSupabase = createClient(url, serviceKey);

        const payRes = await adminSupabase
          .from("payments")
          .select("user_id, college_id, plan_id")
          .eq("razorpay_order_id", orderId)
          .single();

        await handlePaymentSuccess({
          orderId,
          paymentId,
          userId: payRes.data?.user_id,
          collegeId: payRes.data?.college_id,
          planId: payRes.data?.plan_id,
        });
      }
    }

    return NextResponse.json({ status: "ok" });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
