"use client";

import { useState } from "react";
import { createCheckoutOrder, simulatePaymentCapture } from "./actions";

interface PlanItem {
  id: string;
  name: string;
  audience: string;
  billing_period: string;
  price_paise: number;
  interview_quota_per_period: number | null;
  resume_scan_quota_per_period: number | null;
  chat_message_quota_per_period: number | null;
}

interface QuotaItem {
  feature: string;
  limit_units: number;
  used_units: number;
  period_start: string;
  period_end: string;
}

interface PaymentItem {
  id: string;
  amount_paise: number;
  currency: string;
  status: string;
  created_at: string;
}

export function BillingClient({
  plans,
  quotas,
  payments,
}: {
  plans: PlanItem[];
  quotas: QuotaItem[];
  payments: PaymentItem[];
}) {
  const [loadingPlanId, setLoadingPlanId] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  async function handleBuy(planId: string) {
    setLoadingPlanId(planId);
    setStatusMessage(null);
    try {
      const order = await createCheckoutOrder(planId);
      // In live environment with Razorpay script loaded:
      // open Razorpay modal with orderId.
      // In dev/test sandbox: immediately simulate capture to demonstrate full loop.
      setStatusMessage(`Order created (${order.orderId}). Simulating payment capture...`);
      await simulatePaymentCapture(order.orderId, planId);
      setStatusMessage("Payment successful! Your quotas have been provisioned.");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Payment initiation failed";
      setStatusMessage(`Error: ${msg}`);
    } finally {
      setLoadingPlanId(null);
    }
  }

  return (
    <div className="space-y-8">
      {statusMessage && (
        <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4 font-body text-sm text-primary">
          {statusMessage}
        </div>
      )}

      {/* Current Quotas */}
      <section className="space-y-3">
        <h2 className="font-headline text-lg font-semibold text-foreground">Current Quotas</h2>
        {quotas.length === 0 ? (
          <p className="font-body text-sm text-muted-foreground">No active quotas found for your account.</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-3">
            {quotas.map((q) => {
              const pct = q.limit_units > 0 ? Math.min(100, Math.round((q.used_units / q.limit_units) * 100)) : 0;
              return (
                <div key={`${q.feature}-${q.period_start}`} className="rounded-2xl border border-border bg-card p-5">
                  <div className="flex items-center justify-between">
                    <span className="capitalize font-medium text-foreground">{q.feature.replace("_", " ")}</span>
                    <span className="font-metric text-xs text-muted-foreground">
                      {q.used_units} / {q.limit_units}
                    </span>
                  </div>
                  <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-muted">
                    <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
                  </div>
                  <p className="mt-2 font-body text-xs text-muted-foreground">
                    Valid till {q.period_end}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Available Plans */}
      <section className="space-y-4">
        <h2 className="font-headline text-lg font-semibold text-foreground">Available Plans</h2>
        <div className="grid gap-6 md:grid-cols-2">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className="flex flex-col justify-between rounded-3xl border border-border bg-card p-6 shadow-soft"
            >
              <div>
                <div className="flex items-center justify-between">
                  <h3 className="font-headline text-lg font-semibold text-foreground">{plan.name}</h3>
                  <span className="rounded-full bg-primary/10 px-2.5 py-0.5 font-body text-xs font-medium text-primary capitalize">
                    {plan.audience}
                  </span>
                </div>
                <div className="mt-4 flex items-baseline gap-1">
                  <span className="font-metric text-3xl font-semibold text-foreground">
                    ₹{(plan.price_paise / 100).toLocaleString("en-IN")}
                  </span>
                  <span className="font-body text-sm text-muted-foreground">/ {plan.billing_period}</span>
                </div>
                <ul className="mt-6 space-y-2 font-body text-sm text-muted-foreground">
                  <li>• {plan.interview_quota_per_period ?? "Unlimited"} AI practice interviews</li>
                  <li>• {plan.resume_scan_quota_per_period ?? "Unlimited"} Resume ATS scans</li>
                  <li>• {plan.chat_message_quota_per_period ?? "Unlimited"} Placement prep messages</li>
                </ul>
              </div>

              <button
                type="button"
                className="btn-primary mt-6 w-full text-center"
                disabled={loadingPlanId === plan.id}
                onClick={() => handleBuy(plan.id)}
              >
                {loadingPlanId === plan.id ? "Processing..." : `Get ${plan.name}`}
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* Payment History */}
      {payments.length > 0 && (
        <section className="space-y-3">
          <h2 className="font-headline text-lg font-semibold text-foreground">Payment History</h2>
          <div className="overflow-x-auto rounded-2xl border border-border bg-card">
            <table className="w-full text-left font-body text-sm">
              <thead>
                <tr className="border-b border-border text-xs uppercase tracking-label text-muted-foreground">
                  <th className="px-5 py-3 font-medium">Date</th>
                  <th className="px-5 py-3 font-medium">Amount</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((p) => (
                  <tr key={p.id} className="border-b border-border last:border-0">
                    <td className="px-5 py-3 text-muted-foreground">{new Date(p.created_at).toLocaleDateString("en-IN")}</td>
                    <td className="px-5 py-3 font-metric text-foreground">₹{(p.amount_paise / 100).toFixed(2)}</td>
                    <td className="px-5 py-3">
                      <span className="capitalize rounded-full bg-secondary/10 px-2 py-0.5 text-xs font-medium text-secondary">
                        {p.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
