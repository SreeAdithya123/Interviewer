import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/auth/current-profile";
import { READINESS_BANDS, READINESS_LABEL, readinessBand, type ReadinessBand } from "@/lib/readiness";
import { isStubReport } from "@/lib/ai-stubs/interview-engine";

// Not a route — co-located helper for app/app/page.tsx, the same way
// app/book-a-demo/DemoRequestForm.tsx sits next to its page. Only
// app/app/page.tsx renders this, after confirming profile.role ===
// "college_admin" and that profile.college_id is set (the layout guard
// already forces every student through onboarding before college_id can
// be null here; a college_admin is provisioned with one directly).
//
// docs/BUILD_SPEC.md Part 4.7: "Overview: batch readiness distribution,
// readiness by department, top 10 weak skills across the batch, weekly
// activity, quota usage." Every query below is a plain authenticated
// query with no manual college_id filter — RLS already scopes
// interviews/interview_reports/weak_areas/profiles/quotas to this caller's
// own college (see supabase/migrations/20261015120007_row_level_security.sql),
// so "query normally and trust what comes back" is the actual contract
// here, not a shortcut.
//
// The project has zero real rows anywhere right now (no students have used
// the product yet), so every section below renders its own honest empty
// state instead of inventing sample numbers — per the task's explicit
// instruction, not a placeholder left for later.

export default async function CollegeAdminOverview({ profile }: { profile: Profile }) {
  const supabase = await createClient();
  const collegeId = profile.college_id;

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6); // 7-day window, inclusive of today
  sevenDaysAgo.setHours(0, 0, 0, 0);

  const [collegeRes, studentsRes, reportsRes, weakAreasRes, interviewsRes, quotasRes] = await Promise.all([
    collegeId
      ? supabase.from("colleges").select("name").eq("id", collegeId).single()
      : Promise.resolve({ data: null as { name: string } | null }),
    supabase.from("profiles").select("id, department").eq("role", "student"),
    supabase
      .from("interview_reports")
      .select("user_id, overall_score, model_id, created_at")
      .eq("status", "completed")
      .order("created_at", { ascending: false }),
    supabase.from("weak_areas").select("skill").eq("is_resolved", false),
    supabase.from("interviews").select("id, created_at").gte("created_at", sevenDaysAgo.toISOString()),
    supabase
      .from("quotas")
      .select("feature, limit_units, used_units, period_start, period_end")
      .eq("scope", "college"),
  ]);

  const collegeName = collegeRes.data?.name ?? "your college";
  const students = studentsRes.data ?? [];
  const reports = reportsRes.data ?? [];
  const weakAreas = weakAreasRes.data ?? [];
  const interviews = interviewsRes.data ?? [];
  const quotas = quotasRes.data ?? [];

  // Latest completed report per student: `reports` is already ordered
  // newest-first, so the first row seen for a given user_id wins.
  const latestScoreByUser = new Map<string, number | null>();
  for (const report of reports) {
    if (!latestScoreByUser.has(report.user_id)) {
      latestScoreByUser.set(report.user_id, report.overall_score === null ? null : Number(report.overall_score));
    }
  }

  const bandCounts: Record<ReadinessBand, number> = {
    ready: 0,
    developing: 0,
    needs_practice: 0,
    not_yet_assessed: 0,
  };
  const byDepartment = new Map<string, Record<ReadinessBand, number>>();

  for (const student of students) {
    const band = readinessBand(latestScoreByUser.get(student.id) ?? null);
    bandCounts[band] += 1;

    const dept = student.department?.trim() || "Unspecified";
    if (!byDepartment.has(dept)) {
      byDepartment.set(dept, { ready: 0, developing: 0, needs_practice: 0, not_yet_assessed: 0 });
    }
    byDepartment.get(dept)![band] += 1;
  }

  const assessedScores = [...latestScoreByUser.values()].filter((score): score is number => score !== null);
  const avgReadiness =
    assessedScores.length > 0 ? assessedScores.reduce((sum, score) => sum + score, 0) / assessedScores.length : null;

  const hasInterviewActivity = reports.length > 0;
  // See lib/ai-stubs/interview-engine.ts's STUB_REPORT_MODEL_ID header: until
  // Phase 1 wires up a real engine, every completed report was written by
  // finish_stub_interview() with this model_id, so every readiness number
  // below is fixture-derived, not a real evaluation.
  const hasStubReports = reports.some((report) => isStubReport(report.model_id));

  const skillCounts = new Map<string, number>();
  for (const row of weakAreas) {
    skillCounts.set(row.skill, (skillCounts.get(row.skill) ?? 0) + 1);
  }
  const topWeakSkills = [...skillCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10);

  const dayBuckets: { date: string; label: string; count: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    dayBuckets.push({
      date: d.toISOString().slice(0, 10),
      label: d.toLocaleDateString("en-IN", { weekday: "short", day: "numeric" }),
      count: 0,
    });
  }
  const bucketByDate = new Map(dayBuckets.map((bucket) => [bucket.date, bucket]));
  for (const interview of interviews) {
    const bucket = bucketByDate.get(interview.created_at.slice(0, 10));
    if (bucket) bucket.count += 1;
  }
  const maxDayCount = Math.max(1, ...dayBuckets.map((bucket) => bucket.count));
  const weeklyTotal = dayBuckets.reduce((sum, bucket) => sum + bucket.count, 0);

  return (
    <div className="max-w-5xl space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Overview</h1>
        <p className="mt-1 font-body text-sm text-muted-foreground">Placement readiness for {collegeName}.</p>
      </div>

      {hasStubReports && (
        <p className="rounded-2xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 font-body text-xs font-medium text-amber-700">
          Preview — readiness scores below include interviews scored by the stub interview engine
          (no real evaluation model connected yet), not a real assessment of these students.
        </p>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatTile label="Students" value={String(students.length)} />
        <StatTile
          label="Avg. readiness score"
          value={avgReadiness !== null ? avgReadiness.toFixed(0) : "—"}
          hint={assessedScores.length > 0 ? `from ${assessedScores.length} assessed` : "no completed interviews yet"}
        />
        <StatTile label="Interviews, last 7 days" value={String(weeklyTotal)} />
      </div>

      <Section title="Batch readiness distribution">
        {hasInterviewActivity ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {READINESS_BANDS.map((band) => (
              <div key={band} className="rounded-2xl border border-border bg-background p-4">
                <p className="font-metric text-2xl text-foreground">{bandCounts[band]}</p>
                <p className="mt-1 font-body text-xs text-muted-foreground">{READINESS_LABEL[band]}</p>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState text="No interview activity yet for your college." />
        )}
      </Section>

      <Section title="Readiness by department">
        {hasInterviewActivity && byDepartment.size > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left font-body text-sm">
              <thead>
                <tr className="text-muted-foreground">
                  <th className="py-2 pr-4 font-medium">Department</th>
                  {READINESS_BANDS.map((band) => (
                    <th key={band} className="py-2 pr-4 font-medium">
                      {READINESS_LABEL[band]}
                    </th>
                  ))}
                  <th className="py-2 font-medium">Total</th>
                </tr>
              </thead>
              <tbody>
                {[...byDepartment.entries()].map(([dept, counts]) => {
                  const total = READINESS_BANDS.reduce((sum, band) => sum + counts[band], 0);
                  return (
                    <tr key={dept} className="border-t border-border">
                      <td className="py-2 pr-4 text-foreground">{dept}</td>
                      {READINESS_BANDS.map((band) => (
                        <td key={band} className="py-2 pr-4 text-foreground">
                          {counts[band]}
                        </td>
                      ))}
                      <td className="py-2 text-foreground">{total}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState text="No interview activity yet for your college." />
        )}
      </Section>

      <Section title="Top weak skills across the batch">
        {topWeakSkills.length > 0 ? (
          <ul className="space-y-2">
            {topWeakSkills.map(([skill, count]) => (
              <li
                key={skill}
                className="flex items-center justify-between rounded-xl border border-border bg-background px-4 py-2"
              >
                <span className="font-body text-sm text-foreground">{skill}</span>
                <span className="font-metric text-sm text-muted-foreground">
                  {count} student{count === 1 ? "" : "s"}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState text="No weak areas recorded yet for your college." />
        )}
      </Section>

      <Section title="Weekly activity">
        {weeklyTotal > 0 ? (
          <div className="flex items-end gap-2">
            {dayBuckets.map((bucket) => (
              <div key={bucket.date} className="flex flex-1 flex-col items-center gap-1">
                <div className="flex h-24 w-full items-end">
                  <div
                    className="w-full rounded-t-lg bg-primary/80"
                    style={{
                      height: `${(bucket.count / maxDayCount) * 100}%`,
                      minHeight: bucket.count > 0 ? "6px" : "0",
                    }}
                  />
                </div>
                <span className="font-metric text-xs text-foreground">{bucket.count}</span>
                <span className="font-body text-[11px] text-muted-foreground">{bucket.label}</span>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState text="No interview activity in the last 7 days." />
        )}
      </Section>

      <Section title="Quota usage">
        {quotas.length > 0 ? (
          <div className="space-y-3">
            {quotas.map((quota) => {
              const pct =
                quota.limit_units > 0 ? Math.min(100, Math.round((quota.used_units / quota.limit_units) * 100)) : 0;
              return (
                <div key={`${quota.feature}-${quota.period_start}`}>
                  <div className="flex items-center justify-between font-body text-sm">
                    <span className="capitalize text-foreground">{quota.feature.replace("_", " ")}</span>
                    <span className="text-muted-foreground">
                      {quota.used_units} / {quota.limit_units}
                    </span>
                  </div>
                  <div className="mt-1 h-2 overflow-hidden rounded-full bg-muted">
                    <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <EmptyState text="No quota configured yet for your college." />
        )}
      </Section>
    </div>
  );
}

function StatTile({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-3xl border border-border bg-card p-5 shadow-soft">
      <p className="font-metric text-3xl text-foreground">{value}</p>
      <p className="mt-1 font-body text-sm text-muted-foreground">{label}</p>
      {hint && <p className="mt-0.5 font-body text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-3xl border border-border bg-card p-6 shadow-soft">
      <h2 className="font-headline text-lg text-foreground">{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <p className="rounded-2xl border border-dashed border-border bg-background px-4 py-6 text-center font-body text-sm text-muted-foreground">
      {text}
    </p>
  );
}
