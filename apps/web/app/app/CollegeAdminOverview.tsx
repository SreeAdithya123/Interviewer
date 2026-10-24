import Link from "next/link";
import { ArrowRight, UserPlus, Users, CreditCard } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/auth/current-profile";
import { READINESS_BANDS, READINESS_LABEL, readinessBand, type ReadinessBand } from "@/lib/readiness";
import { isStubReport } from "@/lib/ai-stubs/interview-engine";

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

  // Latest completed report per student
  const latestScoreByUser = new Map<string, number | null>();
  for (const report of reports) {
    if (!latestScoreByUser.has(report.user_id)) {
      latestScoreByUser.set(
        report.user_id,
        report.overall_score === null ? null : Number(report.overall_score),
      );
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

    const dept = student.department?.trim() || "General Engineering";
    if (!byDepartment.has(dept)) {
      byDepartment.set(dept, { ready: 0, developing: 0, needs_practice: 0, not_yet_assessed: 0 });
    }
    byDepartment.get(dept)![band] += 1;
  }

  const assessedScores = [...latestScoreByUser.values()].filter((score): score is number => score !== null);
  const avgReadiness =
    assessedScores.length > 0
      ? assessedScores.reduce((sum, score) => sum + score, 0) / assessedScores.length
      : null;

  const hasInterviewActivity = reports.length > 0;
  const hasStubReports = reports.some((report) => isStubReport(report.model_id));

  const skillCounts = new Map<string, number>();
  for (const row of weakAreas) {
    skillCounts.set(row.skill, (skillCounts.get(row.skill) ?? 0) + 1);
  }
  const topWeakSkills = [...skillCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8);
  const maxSkillCount = Math.max(1, ...topWeakSkills.map((s) => s[1]));

  const dayBuckets: { date: string; label: string; count: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    dayBuckets.push({
      date: d.toISOString().slice(0, 10),
      label: d.toLocaleDateString("en-IN", { weekday: "short" }),
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
    <div className="mx-auto max-w-6xl space-y-6">
      {/* Title & Screen's Finding */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-headline text-2xl font-semibold tracking-tight text-foreground">
            {collegeName}
          </h1>
          <p className="mt-1 font-body text-sm text-muted-foreground">
            Batch readiness overview · {students.length} enrolled students across {byDepartment.size} departments.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/app/invites"
            className="inline-flex h-9 items-center justify-center rounded-md bg-foreground px-4 font-body text-xs font-medium text-background transition-colors hover:bg-foreground/90"
          >
            + Invite students
          </Link>
        </div>
      </div>

      {hasStubReports && (
        <div className="rounded-md border border-amber-200/70 bg-amber-50 px-4 py-3 font-body text-xs text-amber-900 dark:border-amber-800/40 dark:bg-amber-950/30 dark:text-amber-300">
          Preview mode — readiness scores include evaluations generated by the benchmark engine stub.
        </div>
      )}

      {/* KPI Strip */}
      <div className="grid grid-cols-2 divide-y border border-border/80 bg-card rounded-lg sm:grid-cols-4 sm:divide-y-0 sm:divide-x">
        <div className="p-4 sm:p-5">
          <p className="font-body text-xs font-medium text-muted-foreground">Enrolled students</p>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="font-metric text-2xl font-semibold tracking-tight text-foreground tabular-nums sm:text-3xl">
              {students.length}
            </span>
            <span className="font-body text-xs text-muted-foreground">active</span>
          </div>
          <p className="mt-1 font-body text-[11px] text-muted-foreground">
            {byDepartment.size} academic departments
          </p>
        </div>

        <div className="p-4 sm:p-5">
          <p className="font-body text-xs font-medium text-muted-foreground">Avg batch readiness</p>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="font-metric text-2xl font-semibold tracking-tight text-foreground tabular-nums sm:text-3xl">
              {avgReadiness !== null ? avgReadiness.toFixed(1) : "—"}
            </span>
            {avgReadiness !== null && (
              <span className="font-body text-xs text-muted-foreground">/ 100</span>
            )}
          </div>
          <p className="mt-1 font-body text-[11px] text-muted-foreground">
            {assessedScores.length > 0 ? `from ${assessedScores.length} assessed` : "no completed mocks"}
          </p>
        </div>

        <div className="p-4 sm:p-5">
          <p className="font-body text-xs font-medium text-muted-foreground">Weekly interviews</p>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="font-metric text-2xl font-semibold tracking-tight text-foreground tabular-nums sm:text-3xl">
              {weeklyTotal}
            </span>
            <span className="font-body text-xs text-muted-foreground">sessions</span>
          </div>
          <p className="mt-1 font-body text-[11px] text-muted-foreground">
            conducted in last 7 days
          </p>
        </div>

        <div className="p-4 sm:p-5">
          <p className="font-body text-xs font-medium text-muted-foreground">Ready for placement</p>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="font-metric text-2xl font-semibold tracking-tight text-foreground tabular-nums sm:text-3xl">
              {bandCounts.ready}
            </span>
            <span className="font-body text-xs text-muted-foreground">candidates</span>
          </div>
          <p className="mt-1 font-body text-[11px] text-muted-foreground">
            {students.length > 0 ? `${Math.round((bandCounts.ready / students.length) * 100)}% of cohort` : "cohort pending"}
          </p>
        </div>
      </div>

      {/* Operational Fast Navigation */}
      <div className="flex flex-wrap items-center gap-2 border-b border-border/80 pb-4 text-xs font-body">
        <Link
          href="/app/students"
          className="inline-flex items-center gap-1.5 rounded-md border border-border/80 bg-background px-3 py-1.5 font-medium text-foreground transition-colors hover:bg-muted"
        >
          <Users className="h-3.5 w-3.5 text-muted-foreground" />
          <span>Student roster ({students.length})</span>
          <ArrowRight className="h-3 w-3" />
        </Link>
        <Link
          href="/app/invites"
          className="inline-flex items-center gap-1.5 rounded-md border border-border/80 bg-background px-3 py-1.5 font-medium text-foreground transition-colors hover:bg-muted"
        >
          <UserPlus className="h-3.5 w-3.5 text-muted-foreground" />
          <span>Batch invitations & CSV</span>
          <ArrowRight className="h-3 w-3" />
        </Link>
        <Link
          href="/app/billing"
          className="inline-flex items-center gap-1.5 rounded-md border border-border/80 bg-background px-3 py-1.5 font-medium text-foreground transition-colors hover:bg-muted"
        >
          <CreditCard className="h-3.5 w-3.5 text-muted-foreground" />
          <span>College quotas & plan</span>
          <ArrowRight className="h-3 w-3" />
        </Link>
      </div>

      {/* Batch Readiness Distribution Strip */}
      <div className="rounded-lg border border-border/80 bg-card p-5">
        <h2 className="font-body text-sm font-semibold text-foreground">
          Batch readiness distribution
        </h2>
        <p className="mt-0.5 font-body text-xs text-muted-foreground">
          Candidate readiness segmented by benchmark thresholds
        </p>

        <div className="mt-4 grid grid-cols-2 divide-y border border-border/80 bg-background rounded-md sm:grid-cols-4 sm:divide-y-0 sm:divide-x">
          {READINESS_BANDS.map((band) => (
            <div key={band} className="p-3.5">
              <span className="font-body text-xs font-medium text-muted-foreground">
                {READINESS_LABEL[band]}
              </span>
              <p className="mt-1 font-metric text-xl font-semibold text-foreground tabular-nums">
                {bandCounts[band]}
              </p>
              <p className="font-body text-[11px] text-muted-foreground">
                {students.length > 0 ? `${Math.round((bandCounts[band] / students.length) * 100)}%` : "0%"}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Department Breakdown Table & Weekly Activity Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Readiness by Department Table (2 spans) */}
        <div className="rounded-lg border border-border/80 bg-card lg:col-span-2">
          <div className="border-b border-border/80 px-5 py-3.5">
            <h2 className="font-body text-sm font-semibold text-foreground">
              Readiness by academic department
            </h2>
            <p className="font-body text-xs text-muted-foreground">
              Performance breakdown across engineering branches
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left font-body text-xs">
              <thead>
                <tr className="border-b border-border/60 text-muted-foreground">
                  <th className="px-5 py-2.5 font-medium">Department</th>
                  <th className="px-3 py-2.5 text-right font-medium">Ready</th>
                  <th className="px-3 py-2.5 text-right font-medium">Developing</th>
                  <th className="px-3 py-2.5 text-right font-medium">Needs Practice</th>
                  <th className="px-3 py-2.5 text-right font-medium">Unassessed</th>
                  <th className="px-5 py-2.5 text-right font-medium">Total</th>
                </tr>
              </thead>
              <tbody>
                {byDepartment.size === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-5 py-8 text-center text-muted-foreground">
                      No student records found. Invite students to populate departments.
                    </td>
                  </tr>
                ) : (
                  [...byDepartment.entries()].map(([dept, counts]) => {
                    const total = READINESS_BANDS.reduce((sum, band) => sum + counts[band], 0);
                    return (
                      <tr
                        key={dept}
                        className="border-b border-border/60 transition-colors last:border-0 hover:bg-muted/30"
                      >
                        <td className="px-5 py-3 font-medium text-foreground">{dept}</td>
                        <td className="px-3 py-3 text-right font-metric text-foreground tabular-nums">
                          {counts.ready}
                        </td>
                        <td className="px-3 py-3 text-right font-metric text-foreground tabular-nums">
                          {counts.developing}
                        </td>
                        <td className="px-3 py-3 text-right font-metric text-foreground tabular-nums">
                          {counts.needs_practice}
                        </td>
                        <td className="px-3 py-3 text-right font-metric text-muted-foreground tabular-nums">
                          {counts.not_yet_assessed}
                        </td>
                        <td className="px-5 py-3 text-right font-metric font-semibold text-foreground tabular-nums">
                          {total}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Weekly Activity & Top Weak Skills (1 span) */}
        <div className="space-y-6">
          {/* 7-Day Activity Chart */}
          <div className="rounded-lg border border-border/80 bg-card p-4">
            <h2 className="font-body text-sm font-semibold text-foreground">
              Weekly activity
            </h2>
            <p className="font-body text-[11px] text-muted-foreground">
              Interviews completed per day
            </p>

            <div className="mt-4 flex items-end justify-between gap-1.5 pt-4 pb-1">
              {dayBuckets.map((bucket) => {
                const heightPct = maxDayCount > 0 ? (bucket.count / maxDayCount) * 100 : 0;
                return (
                  <div key={bucket.date} className="flex flex-1 flex-col items-center gap-1.5">
                    <span className="font-metric text-[11px] font-medium text-foreground tabular-nums">
                      {bucket.count > 0 ? bucket.count : 0}
                    </span>
                    <div className="flex h-20 w-full items-end rounded-sm bg-muted/40 p-0.5">
                      <div
                        className="w-full rounded-sm bg-foreground/80 transition-all"
                        style={{
                          height: `${Math.max(4, heightPct)}%`,
                          opacity: bucket.count > 0 ? 1 : 0.2,
                        }}
                      />
                    </div>
                    <span className="font-body text-[10px] text-muted-foreground uppercase">
                      {bucket.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Top Weak Skills */}
          <div className="rounded-lg border border-border/80 bg-card p-4">
            <h2 className="font-body text-sm font-semibold text-foreground">
              Top weak skills across batch
            </h2>
            <p className="font-body text-[11px] text-muted-foreground">
              Most frequent diagnostic areas in student evaluations
            </p>

            <div className="mt-3 divide-y divide-border/60">
              {topWeakSkills.length === 0 ? (
                <p className="py-4 text-center font-body text-xs text-muted-foreground">
                  No weak skills recorded yet.
                </p>
              ) : (
                topWeakSkills.map(([skill, count]) => {
                  const pct = Math.round((count / maxSkillCount) * 100);
                  return (
                    <div key={skill} className="py-2 space-y-1">
                      <div className="flex items-center justify-between font-body text-xs">
                        <span className="font-medium text-foreground truncate">{skill}</span>
                        <span className="font-metric text-muted-foreground tabular-nums shrink-0">
                          {count} student{count === 1 ? "" : "s"}
                        </span>
                      </div>
                      <div className="h-1 w-full rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full rounded-full bg-foreground/60"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
