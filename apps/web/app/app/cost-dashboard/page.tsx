import type { Metadata } from "next";
import { getCurrentProfile } from "@/lib/auth/current-profile";
import { requireRole } from "@/lib/auth/require-role";
import { createClient } from "@/lib/supabase/server";
import type { UsageEvent } from "@/lib/types/db";

export const metadata: Metadata = {
  title: "Cost dashboard",
};

export const dynamic = "force-dynamic";

function percentile(sortedAscending: number[], p: number): number {
  if (sortedAscending.length === 0) return 0;
  const index = Math.min(sortedAscending.length - 1, Math.ceil((p / 100) * sortedAscending.length) - 1);
  return sortedAscending[Math.max(0, index)];
}

function formatRupees(paise: number): string {
  return `₹${(paise / 100).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export default async function CostDashboardPage() {
  requireRole(await getCurrentProfile(), ["platform_admin"]);

  const supabase = await createClient();

  const [{ data: events, error: eventsError }, { data: colleges }, { data: turns }] = await Promise.all([
    supabase
      .from("usage_events")
      .select("id, user_id, college_id, feature, provider, model, cost_paise, interview_id, created_at")
      .order("created_at", { ascending: false })
      .limit(10000),
    supabase.from("colleges").select("id, name"),
    supabase
      .from("interview_turns")
      .select("stt_provider, stt_fallback_used")
      .order("created_at", { ascending: false })
      .limit(10000),
  ]);

  if (eventsError) {
    throw new Error(eventsError.message);
  }

  const rows = (events ?? []) as Pick<
    UsageEvent,
    "id" | "user_id" | "college_id" | "feature" | "provider" | "model" | "cost_paise" | "interview_id" | "created_at"
  >[];
  const collegeNames = new Map((colleges ?? []).map((c: { id: string; name: string }) => [c.id, c.name]));

  const totalCostPaise = rows.reduce((sum, r) => sum + r.cost_paise, 0);

  // Cost per interview (p50/p95)
  const costByInterview = new Map<string, number>();
  for (const r of rows) {
    if (!r.interview_id) continue;
    costByInterview.set(r.interview_id, (costByInterview.get(r.interview_id) ?? 0) + r.cost_paise);
  }
  const interviewCosts = [...costByInterview.values()].sort((a, b) => a - b);

  // Cost per college
  const costByCollege = new Map<string, number>();
  for (const r of rows) {
    const key = r.college_id ?? "unattributed";
    costByCollege.set(key, (costByCollege.get(key) ?? 0) + r.cost_paise);
  }

  // Cost per feature
  const costByFeature = new Map<string, number>();
  for (const r of rows) {
    costByFeature.set(r.feature, (costByFeature.get(r.feature) ?? 0) + r.cost_paise);
  }

  // Daily spend
  const costByDay = new Map<string, number>();
  for (const r of rows) {
    const day = r.created_at.slice(0, 10);
    costByDay.set(day, (costByDay.get(day) ?? 0) + r.cost_paise);
  }
  const dailySorted = [...costByDay.entries()].sort((a, b) => (a[0] < b[0] ? 1 : -1)).slice(0, 14);

  const turnRows = (turns ?? []) as { stt_provider: string | null; stt_fallback_used: boolean }[];
  const sttAttempts = turnRows.filter((t) => t.stt_provider !== null);
  const sttFallbacks = sttAttempts.filter((t) => t.stt_fallback_used);

  const isEmpty = rows.length === 0;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="font-headline text-2xl font-semibold tracking-tight text-foreground">
          Cost Dashboard
        </h1>
        <p className="mt-1 font-body text-sm text-muted-foreground">
          Infrastructure ledger · Direct API spend recorded per provider call across Groq, Sarvam, Gemini, and Redis.
        </p>
      </div>

      {isEmpty && (
        <div className="rounded-md border border-border/80 bg-muted/30 px-4 py-3 font-body text-xs text-muted-foreground">
          No usage events recorded in this sample window. Provider calls will populate live as mock sessions run.
        </div>
      )}

      {/* KPI Strip */}
      <div className="grid grid-cols-1 divide-y border border-border/80 bg-card rounded-lg sm:grid-cols-3 sm:divide-y-0 sm:divide-x">
        <div className="p-4 sm:p-5">
          <p className="font-body text-xs font-medium text-muted-foreground">Total sampled spend</p>
          <p className="mt-2 font-metric text-2xl font-semibold tracking-tight text-foreground tabular-nums sm:text-3xl">
            {formatRupees(totalCostPaise)}
          </p>
          <p className="mt-1 font-body text-[11px] text-muted-foreground">{rows.length} total provider events</p>
        </div>

        <div className="p-4 sm:p-5">
          <p className="font-body text-xs font-medium text-muted-foreground">Cost / interview — p50</p>
          <p className="mt-2 font-metric text-2xl font-semibold tracking-tight text-foreground tabular-nums sm:text-3xl">
            {formatRupees(percentile(interviewCosts, 50))}
          </p>
          <p className="mt-1 font-body text-[11px] text-muted-foreground">median session cost</p>
        </div>

        <div className="p-4 sm:p-5">
          <p className="font-body text-xs font-medium text-muted-foreground">Cost / interview — p95</p>
          <p className="mt-2 font-metric text-2xl font-semibold tracking-tight text-foreground tabular-nums sm:text-3xl">
            {formatRupees(percentile(interviewCosts, 95))}
          </p>
          <p className="mt-1 font-body text-[11px] text-muted-foreground">95th percentile session cost</p>
        </div>
      </div>

      {/* College and Feature Breakdown */}
      <div className="grid gap-6 sm:grid-cols-2">
        <div className="rounded-lg border border-border/80 bg-card p-5">
          <h2 className="font-body text-sm font-semibold text-foreground">Spend by college</h2>
          <p className="font-body text-[11px] text-muted-foreground">COGS allocated per campus domain</p>
          <div className="mt-3">
            {costByCollege.size === 0 ? (
              <p className="py-4 text-center font-body text-xs text-muted-foreground">No events recorded.</p>
            ) : (
              <Table
                rows={[...costByCollege.entries()].sort((a, b) => b[1] - a[1])}
                renderKey={(key) => (key === "unattributed" ? "Unattributed / Direct" : collegeNames.get(key) ?? key)}
                renderValue={formatRupees}
              />
            )}
          </div>
        </div>

        <div className="rounded-lg border border-border/80 bg-card p-5">
          <h2 className="font-body text-sm font-semibold text-foreground">Spend by platform feature</h2>
          <p className="font-body text-[11px] text-muted-foreground">Audio STT, TTS, evaluation, and resume scanning</p>
          <div className="mt-3">
            {costByFeature.size === 0 ? (
              <p className="py-4 text-center font-body text-xs text-muted-foreground">No events recorded.</p>
            ) : (
              <Table
                rows={[...costByFeature.entries()].sort((a, b) => b[1] - a[1])}
                renderKey={(key) => key.replace(/_/g, " ")}
                renderValue={formatRupees}
              />
            )}
          </div>
        </div>
      </div>

      {/* Daily Spend Timeline */}
      <div className="rounded-lg border border-border/80 bg-card p-5">
        <h2 className="font-body text-sm font-semibold text-foreground">Daily spend ledger</h2>
        <p className="font-body text-[11px] text-muted-foreground">Aggregated COGS over recent calendar days</p>
        <div className="mt-3">
          {dailySorted.length === 0 ? (
            <p className="py-4 text-center font-body text-xs text-muted-foreground">No daily ledger entries.</p>
          ) : (
            <Table rows={dailySorted} renderKey={(key) => key} renderValue={formatRupees} />
          )}
        </div>
      </div>

      {/* Provider Reliability */}
      <div className="rounded-lg border border-border/80 bg-card p-5">
        <h2 className="font-body text-sm font-semibold text-foreground">Provider reliability — STT fallback</h2>
        <p className="mt-1 font-body text-xs text-muted-foreground">
          Voice pipeline resilience telemetry computed from interview turns fallback flags (Groq Whisper primary vs Sarvam Saaras fallback).
        </p>
        {sttAttempts.length === 0 ? (
          <p className="mt-3 font-body text-xs text-muted-foreground">No voice turns recorded yet.</p>
        ) : (
          <div className="mt-3 flex items-baseline gap-2">
            <span className="font-metric text-2xl font-semibold text-foreground tabular-nums">
              {((sttFallbacks.length / sttAttempts.length) * 100).toFixed(1)}%
            </span>
            <span className="font-body text-xs text-muted-foreground">
              fallback rate ({sttFallbacks.length} of {sttAttempts.length} turns transferred to secondary STT)
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

function Table({
  rows,
  renderKey,
  renderValue,
}: {
  rows: [string, number][];
  renderKey: (key: string) => string;
  renderValue: (value: number) => string;
}) {
  return (
    <table className="w-full text-left font-body text-xs">
      <tbody>
        {rows.map(([key, value]) => (
          <tr key={key} className="border-b border-border/60 last:border-0">
            <td className="py-2 capitalize text-foreground">{renderKey(key)}</td>
            <td className="py-2 text-right font-metric font-medium text-foreground tabular-nums">
              {renderValue(value)}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
