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
  return `₹${(paise / 100).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
}

export default async function CostDashboardPage() {
  requireRole(await getCurrentProfile(), ["platform_admin"]);

  const supabase = await createClient();

  // RLS lets platform_admin select every usage_events row; this is a pure
  // system ledger with no client-side writes (see
  // supabase/migrations/20261015120007_row_level_security.sql), so this
  // dashboard only ever reads it.
  const [{ data: events, error: eventsError }, { data: colleges }, { data: turns }] = await Promise.all([
    supabase
      .from("usage_events")
      .select("id, user_id, college_id, feature, provider, model, cost_paise, interview_id, created_at")
      .order("created_at", { ascending: false })
      .limit(10000),
    supabase.from("colleges").select("id, name"),
    // stt_fallback_used/stt_provider live on interview_turns, not
    // usage_events (which has no dedicated success/error column yet) — see
    // the "Provider reliability" note below.
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

  // Cost per interview (p50/p95): sum every event's cost grouped by
  // interview_id, then take percentiles over those per-interview totals.
  const costByInterview = new Map<string, number>();
  for (const r of rows) {
    if (!r.interview_id) continue;
    costByInterview.set(r.interview_id, (costByInterview.get(r.interview_id) ?? 0) + r.cost_paise);
  }
  const interviewCosts = [...costByInterview.values()].sort((a, b) => a - b);

  // Cost per college.
  const costByCollege = new Map<string, number>();
  for (const r of rows) {
    const key = r.college_id ?? "unattributed";
    costByCollege.set(key, (costByCollege.get(key) ?? 0) + r.cost_paise);
  }

  // Cost per feature.
  const costByFeature = new Map<string, number>();
  for (const r of rows) {
    costByFeature.set(r.feature, (costByFeature.get(r.feature) ?? 0) + r.cost_paise);
  }

  // Daily spend (last 14 days present in the sample).
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
    <div className="max-w-6xl">
      <h1 className="text-2xl font-semibold text-foreground">Cost dashboard</h1>
      <p className="mt-1 font-body text-sm text-muted-foreground">
        Every provider call (STT, TTS, LLM, embeddings, OCR) writes one usage_events row
        (docs/BUILD_SPEC.md Part 5) — this reads that ledger directly, no mock numbers.
      </p>

      {isEmpty && (
        <p className="mt-4 rounded-2xl bg-accent/10 px-4 py-3 font-body text-sm text-foreground">
          No usage_events yet — this fills in once Phase 1 (real interviews, resume scans and chat
          calling real providers) starts running.
        </p>
      )}

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <StatCard label="Total spend (sampled)" value={formatRupees(totalCostPaise)} />
        <StatCard label="Cost / interview — p50" value={formatRupees(percentile(interviewCosts, 50))} />
        <StatCard label="Cost / interview — p95" value={formatRupees(percentile(interviewCosts, 95))} />
      </div>

      <section className="mt-6 grid gap-6 sm:grid-cols-2">
        <Panel title="Cost by college">
          {costByCollege.size === 0 ? (
            <EmptyRow />
          ) : (
            <Table
              rows={[...costByCollege.entries()].sort((a, b) => b[1] - a[1])}
              renderKey={(key) => (key === "unattributed" ? "Unattributed" : collegeNames.get(key) ?? key)}
              renderValue={formatRupees}
            />
          )}
        </Panel>

        <Panel title="Cost by feature">
          {costByFeature.size === 0 ? (
            <EmptyRow />
          ) : (
            <Table
              rows={[...costByFeature.entries()].sort((a, b) => b[1] - a[1])}
              renderKey={(key) => key.replace(/_/g, " ")}
              renderValue={formatRupees}
            />
          )}
        </Panel>
      </section>

      <Panel title="Daily spend (most recent days in the sample)" className="mt-6">
        {dailySorted.length === 0 ? (
          <EmptyRow />
        ) : (
          <Table rows={dailySorted} renderKey={(key) => key} renderValue={formatRupees} />
        )}
      </Panel>

      <Panel title="Provider reliability — STT fallback rate" className="mt-6">
        <p className="font-body text-xs text-muted-foreground">
          usage_events has no dedicated success/error column yet, so provider error rate isn&apos;t
          computable from it today; that needs a units.ok / error flag the engine should start
          writing once Phase 1 lands. STT fallback rate is computable now, from
          interview_turns.stt_fallback_used.
        </p>
        {sttAttempts.length === 0 ? (
          <div className="mt-3">
            <EmptyRow />
          </div>
        ) : (
          <p className="mt-3 font-metric text-2xl text-foreground">
            {((sttFallbacks.length / sttAttempts.length) * 100).toFixed(1)}%
            <span className="ml-2 font-body text-sm text-muted-foreground">
              ({sttFallbacks.length} of {sttAttempts.length} turns fell back to Sarvam)
            </span>
          </p>
        )}
      </Panel>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-3xl border border-border bg-card p-5">
      <p className="font-body text-xs uppercase tracking-label text-muted-foreground">{label}</p>
      <p className="mt-2 font-metric text-2xl text-foreground">{value}</p>
    </div>
  );
}

function Panel({
  title,
  className,
  children,
}: {
  title: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={`rounded-3xl border border-border bg-card p-5 ${className ?? ""}`}>
      <h2 className="font-headline text-base text-foreground">{title}</h2>
      <div className="mt-3">{children}</div>
    </div>
  );
}

function EmptyRow() {
  return <p className="font-body text-sm text-muted-foreground">No data yet.</p>;
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
    <table className="w-full text-left font-body text-sm">
      <tbody>
        {rows.map(([key, value]) => (
          <tr key={key} className="border-b border-border last:border-0">
            <td className="py-2 capitalize text-muted-foreground">{renderKey(key)}</td>
            <td className="py-2 text-right font-metric text-foreground">{renderValue(value)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
