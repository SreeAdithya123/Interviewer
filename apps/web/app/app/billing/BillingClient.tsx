"use client";

import { useState } from "react";
import { createCheckoutOrder, simulatePaymentCapture } from "./actions";
import StatusBadge from "@/components/app-shell/StatusBadge";

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
      setStatusMessage(`Order initiated (${order.orderId}). Simulating payment capture...`);
      await simulatePaymentCapture(order.orderId, planId);
      setStatusMessage("Payment captured. Account quotas have been provisioned.");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Payment initiation failed";
      setStatusMessage(`Error: ${msg}`);
    } finally {
      setLoadingPlanId(null);
    }
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="font-headline text-2xl font-semibold tracking-tight text-foreground">
          Quotas & Billing
        </h1>
        <p className="mt-1 font-body text-sm text-muted-foreground">
          Usage allocations, account limits, and subscription tiers.
        </p>
      </div>

      {statusMessage && (
        <div className="rounded-md border border-border/80 bg-muted/40 px-4 py-3 font-body text-xs text-foreground">
          {statusMessage}
        </div>
      )}

      {/* Current Quotas */}
      <section className="space-y-3">
        <h2 className="font-body text-sm font-semibold text-foreground">Current allocations</h2>
        {quotas.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border/80 bg-card p-6 text-center font-body text-xs text-muted-foreground">
            No active quotas provisioned. Select a tier below to get started.
          </p>
        ) : (
          <div className="grid grid-cols-1 divide-y border border-border/80 bg-card rounded-lg sm:grid-cols-3 sm:divide-y-0 sm:divide-x">
            {quotas.map((q) => {
              const pct = q.limit_units > 0 ? Math.min(100, Math.round((q.used_units / q.limit_units) * 100)) : 0;
              return (
                <div key={`${q.feature}-${q.period_start}`} className="p-4 sm:p-5 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-body text-xs font-medium text-foreground capitalize">
                      {q.feature.replace(/_/g, " ")}
                    </span>
                    <span className="font-metric text-xs text-muted-foreground tabular-nums">
                      {q.used_units} / {q.limit_units}
                    </span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-foreground/70"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <p className="font-body text-[11px] text-muted-foreground">
                    Valid till {q.period_end}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Available Plans */}
      <section className="space-y-3">
        <h2 className="font-body text-sm font-semibold text-foreground">Subscription tiers</h2>
        <div className="grid gap-4 md:grid-cols-2">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className="flex flex-col justify-between rounded-lg border border-border/80 bg-card p-5"
            >
              <div>
                <div className="flex items-center justify-between">
                  <h3 className="font-body text-sm font-semibold text-foreground">{plan.name}</h3>
                  <span className="rounded border border-border/80 bg-muted px-2 py-0.5 font-body text-[10px] font-medium text-muted-foreground capitalize">
                    {plan.audience}
                  </span>
                </div>

                <div className="mt-3 flex items-baseline gap-1">
                  <span className="font-metric text-2xl font-semibold text-foreground tabular-nums">
                    ₹{(plan.price_paise / 100).toLocaleString("en-IN")}
                  </span>
                  <span className="font-body text-xs text-muted-foreground">/ {plan.billing_period}</span>
                </div>

                <ul className="mt-4 space-y-1.5 font-body text-xs text-muted-foreground border-t border-border/60 pt-3">
                  <li>• {plan.interview_quota_per_period ?? "Unlimited"} AI practice interviews</li>
                  <li>• {plan.resume_scan_quota_per_period ?? "Unlimited"} Resume ATS scans</li>
                  <li>• {plan.chat_message_quota_per_period ?? "Unlimited"} Placement prep queries</li>
                </ul>
              </div>

              <div className="mt-5 border-t border-border/60 pt-3">
                <button
                  type="button"
                  className="inline-flex h-8 w-full items-center justify-center rounded bg-foreground font-body text-xs font-medium text-background transition-colors hover:bg-foreground/90 disabled:opacity-60"
                  disabled={loadingPlanId === plan.id}
                  onClick={() => handleBuy(plan.id)}
                >
                  {loadingPlanId === plan.id ? "Processing..." : `Select ${plan.name}`}
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Payment History */}
      {payments.length > 0 && (
        <section className="space-y-3">
          <h2 className="font-body text-sm font-semibold text-foreground">Transaction ledger</h2>
          <div className="overflow-x-auto rounded-lg border border-border/80 bg-card">
            <table className="w-full text-left font-body text-xs">
              <thead>
                <tr className="border-b border-border/60 text-muted-foreground">
                  <th className="px-5 py-2.5 font-medium">Date</th>
                  <th className="px-4 py-2.5 text-right font-medium">Amount</th>
                  <th className="px-5 py-2.5 text-right font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((p) => (
                  <tr
                    key={p.id}
                    className="border-b border-border/60 transition-colors last:border-0 hover:bg-muted/30"
                  >
                    <td className="px-5 py-3 text-muted-foreground">
                      {new Date(p.created_at).toLocaleDateString("en-IN", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                    </td>
                    <td className="px-4 py-3 text-right font-metric font-medium text-foreground tabular-nums">
                      ₹{(p.amount_paise / 100).toFixed(2)}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <StatusBadge status={p.status} />
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

export default BillingClient;
