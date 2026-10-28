import Link from "next/link";
import { ArrowRight, ArrowUpRight, Video, FileSearch, Sparkles, AlertCircle, CheckCircle2, TrendingUp, Layers } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/auth/current-profile";
import { readinessBand, READINESS_LABEL } from "@/lib/readiness";
import StatusBadge from "@/components/app-shell/StatusBadge";
import { TourBanner } from "@/components/app-shell/TourBanner";

interface StudentDashboardProps {
  profile: Profile;
}

export default async function StudentDashboard({ profile }: StudentDashboardProps) {
  const supabase = await createClient();

  // Parallel fetch: interviews, reports, weak areas, resumes
  const [interviewsRes, reportsRes, weakAreasRes, resumesRes] = await Promise.all([
    supabase
      .from("interviews")
      .select("id, interview_type, target_role, difficulty, status, created_at")
      .eq("user_id", profile.id)
      .order("created_at", { ascending: false })
      .limit(6),
    supabase
      .from("interview_reports")
      .select("id, interview_id, overall_score, scores, created_at")
      .eq("user_id", profile.id)
      .eq("status", "completed")
      .order("created_at", { ascending: false }),
    supabase
      .from("weak_areas")
      .select("id, skill, severity, notes, is_resolved, created_at")
      .eq("user_id", profile.id)
      .eq("is_resolved", false)
      .order("created_at", { ascending: false })
      .limit(6),
    supabase
      .from("resumes")
      .select("id, title, updated_at")
      .eq("user_id", profile.id)
      .order("updated_at", { ascending: false }),
  ]);

  const interviews = interviewsRes.data ?? [];
  const reports = reportsRes.data ?? [];
  const weakAreas = weakAreasRes.data ?? [];
  const resumes = resumesRes.data ?? [];

  // Map scores by interview_id
  const reportByInterviewId = new Map<string, number>();
  for (const r of reports) {
    if (r.interview_id && r.overall_score !== null && !reportByInterviewId.has(r.interview_id)) {
      reportByInterviewId.set(r.interview_id, Number(r.overall_score));
    }
  }

  // Map latest score
  const latestReport = reports[0];
  const latestScore =
    latestReport?.overall_score !== null && latestReport?.overall_score !== undefined
      ? Number(latestReport.overall_score)
      : null;
  const currentBand = readinessBand(latestScore);
  const completedCount = interviews.filter((i) => i.status === "completed").length;

  return (
    <div className="mx-auto max-w-6xl space-y-7">
      {/* First-time platform tour banner */}
      <TourBanner />

      {/* Header & Quick Action */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-border/60 pb-6">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-headline text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              Placement Dashboard
            </h1>
            <span className="rounded-full bg-primary/10 px-2.5 py-0.5 font-mono text-[11px] font-semibold text-primary">
              Live
            </span>
          </div>
          <p className="mt-1 font-body text-xs sm:text-sm text-muted-foreground">
            {latestScore !== null ? (
              <>
                Placement readiness:{" "}
                <span className="font-semibold text-foreground">{latestScore} / 100</span> ·{" "}
                <span className="font-medium text-primary">{READINESS_LABEL[currentBand]}</span>
                {weakAreas.length > 0 && ` · ${weakAreas.length} diagnostic areas to practice`}
              </>
            ) : (
              "Take your first 10-minute AI mock interview to benchmark your placement readiness."
            )}
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Link
            href="/app/interview"
            className="inline-flex h-10 items-center justify-center gap-2 rounded-2xl bg-primary px-5 font-body text-xs font-semibold text-primary-foreground shadow-sm transition hover:bg-primary/90 hover:scale-[1.02] active:scale-[0.98]"
          >
            <Video className="h-4 w-4" />
            <span>Start Mock Interview</span>
          </Link>
        </div>
      </div>

      {/* Modern KPI Cards Grid */}
      <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-4">
        {/* KPI 1 */}
        <div className="relative overflow-hidden rounded-3xl border border-border/80 bg-card p-5 shadow-soft transition hover:border-primary/40">
          <div className="flex items-center justify-between">
            <p className="font-body text-xs font-medium text-muted-foreground">Overall Readiness</p>
            <TrendingUp className="h-4 w-4 text-primary" />
          </div>
          <div className="mt-3 flex items-baseline gap-1">
            <span className="font-metric text-3xl font-bold tracking-tight text-foreground tabular-nums sm:text-4xl">
              {latestScore !== null ? latestScore : "—"}
            </span>
            {latestScore !== null && (
              <span className="font-body text-xs text-muted-foreground">/ 100</span>
            )}
          </div>
          <p className="mt-1.5 font-body text-[11px] text-muted-foreground">
            {latestScore !== null ? "Target 75+ for top companies" : "Complete first mock round"}
          </p>
        </div>

        {/* KPI 2 */}
        <div className="relative overflow-hidden rounded-3xl border border-border/80 bg-card p-5 shadow-soft transition hover:border-primary/40">
          <div className="flex items-center justify-between">
            <p className="font-body text-xs font-medium text-muted-foreground">Mock Sessions</p>
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          </div>
          <div className="mt-3 flex items-baseline gap-1.5">
            <span className="font-metric text-3xl font-bold tracking-tight text-foreground tabular-nums sm:text-4xl">
              {completedCount}
            </span>
            <span className="font-body text-xs text-muted-foreground">done</span>
          </div>
          <p className="mt-1.5 font-body text-[11px] text-muted-foreground">
            {interviews.length} sessions initiated
          </p>
        </div>

        {/* KPI 3 */}
        <div className="relative overflow-hidden rounded-3xl border border-border/80 bg-card p-5 shadow-soft transition hover:border-primary/40">
          <div className="flex items-center justify-between">
            <p className="font-body text-xs font-medium text-muted-foreground">Weak Areas</p>
            <AlertCircle className="h-4 w-4 text-amber-500" />
          </div>
          <div className="mt-3 flex items-baseline gap-1.5">
            <span className="font-metric text-3xl font-bold tracking-tight text-foreground tabular-nums sm:text-4xl">
              {weakAreas.length}
            </span>
            <span className="font-body text-xs text-muted-foreground">flagged</span>
          </div>
          <p className="mt-1.5 font-body text-[11px] text-muted-foreground">
            {weakAreas.length === 0 ? "All topics evaluated cleanly" : "Needs review before drive"}
          </p>
        </div>

        {/* KPI 4 */}
        <div className="relative overflow-hidden rounded-3xl border border-border/80 bg-card p-5 shadow-soft transition hover:border-primary/40">
          <div className="flex items-center justify-between">
            <p className="font-body text-xs font-medium text-muted-foreground">Resumes on File</p>
            <FileSearch className="h-4 w-4 text-blue-500" />
          </div>
          <div className="mt-3 flex items-baseline gap-1.5">
            <span className="font-metric text-3xl font-bold tracking-tight text-foreground tabular-nums sm:text-4xl">
              {resumes.length}
            </span>
            <span className="font-body text-xs text-muted-foreground">drafts</span>
          </div>
          <p className="mt-1.5 font-body text-[11px] text-muted-foreground">
            {resumes.length > 0 ? "ATS profile scanned" : "Upload resume to scan"}
          </p>
        </div>
      </div>

      {/* Main Two-Column Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left Column (2 spans): Recent Interviews Table & Placement Drives */}
        <div className="space-y-6 lg:col-span-2">
          {/* Recent Practice Sessions Table */}
          <div className="rounded-3xl border border-border/80 bg-card shadow-soft overflow-hidden">
            <div className="flex items-center justify-between border-b border-border/80 px-6 py-4">
              <div>
                <h2 className="font-headline text-sm font-semibold text-foreground">
                  Recent Practice Sessions
                </h2>
                <p className="font-body text-[11px] text-muted-foreground">
                  AI-evaluated mock interviews and performance records
                </p>
              </div>
              <Link
                href="/app/history"
                className="inline-flex items-center gap-1 font-body text-xs font-semibold text-primary hover:underline"
              >
                <span>View all history</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left font-body text-xs">
                <thead>
                  <tr className="border-b border-border/60 bg-muted/20 text-muted-foreground">
                    <th className="px-6 py-3 font-semibold">Interview</th>
                    <th className="px-4 py-3 font-semibold">Difficulty</th>
                    <th className="px-4 py-3 font-semibold">Date</th>
                    <th className="px-4 py-3 text-right font-semibold">Score</th>
                    <th className="px-6 py-3 text-right font-semibold">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {interviews.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-10 text-center text-muted-foreground">
                        No practice sessions yet. Start a 10-minute mock interview to receive real evaluation.
                      </td>
                    </tr>
                  ) : (
                    interviews.map((item) => {
                      const score = reportByInterviewId.get(item.id);
                      return (
                        <tr
                          key={item.id}
                          className="transition-colors hover:bg-muted/40"
                        >
                          <td className="px-6 py-3.5">
                            <p className="font-semibold text-foreground capitalize">
                              {item.target_role || `${item.interview_type} mock`}
                            </p>
                            <p className="text-[11px] text-muted-foreground capitalize">
                              {item.interview_type} track
                            </p>
                          </td>
                          <td className="px-4 py-3.5 capitalize text-muted-foreground">
                            {item.difficulty}
                          </td>
                          <td className="px-4 py-3.5 text-muted-foreground">
                            {new Date(item.created_at).toLocaleDateString("en-IN", {
                              month: "short",
                              day: "numeric",
                            })}
                          </td>
                          <td className="px-4 py-3.5 text-right font-metric font-semibold text-foreground tabular-nums">
                            {score !== undefined ? `${Math.round(score)} / 100` : "—"}
                          </td>
                          <td className="px-6 py-3.5 text-right">
                            {item.status === "completed" ? (
                              <Link
                                href={`/app/interview/${item.id}/report`}
                                className="inline-flex items-center gap-1 font-semibold text-primary hover:underline"
                              >
                                <span>Report</span>
                                <ArrowRight className="h-3 w-3" />
                              </Link>
                            ) : item.status === "in_progress" ? (
                              <Link
                                href={`/app/interview/${item.id}`}
                                className="inline-flex items-center gap-1 font-semibold text-amber-500 hover:underline"
                              >
                                <span>Resume</span>
                                <ArrowRight className="h-3 w-3" />
                              </Link>
                            ) : (
                              <StatusBadge status={item.status} />
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Placement Drives Briefing Card */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between rounded-3xl border border-border/80 bg-card p-6 shadow-soft gap-4">
            <div className="flex items-start gap-3.5">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary shrink-0">
                <Layers className="h-5 w-5" />
              </div>
              <div>
                <h2 className="font-headline text-sm font-semibold text-foreground">
                  Campus Placement Drives
                </h2>
                <p className="mt-0.5 font-body text-xs text-muted-foreground">
                  Verify cutoff criteria, eligibility, and take company-specific assessments.
                </p>
              </div>
            </div>
            <Link
              href="/app/drives"
              className="inline-flex h-9 items-center justify-center gap-1.5 rounded-2xl border border-input bg-background px-4 font-body text-xs font-semibold text-foreground shadow-xs transition hover:bg-muted shrink-0"
            >
              <span>Explore Drives</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>

        {/* Right Column: Diagnostic Weak Skills & Prep Utilities */}
        <div className="space-y-6">
          {/* Diagnostic Weak Skills */}
          <div className="rounded-3xl border border-border/80 bg-card shadow-soft overflow-hidden">
            <div className="flex items-center justify-between border-b border-border/80 px-5 py-4">
              <div>
                <h2 className="font-headline text-sm font-semibold text-foreground">
                  Diagnostic Focus Areas
                </h2>
                <p className="font-body text-[11px] text-muted-foreground">
                  Flagged during AI speech evaluation
                </p>
              </div>
              {weakAreas.length > 0 && (
                <span className="rounded-full bg-rose-500/10 px-2.5 py-0.5 font-mono text-[10px] font-semibold text-rose-500 border border-rose-500/20">
                  {weakAreas.length} active
                </span>
              )}
            </div>

            <div className="divide-y divide-border/50">
              {weakAreas.length === 0 ? (
                <div className="p-6 text-center">
                  <p className="font-body text-xs text-muted-foreground">
                    No weak skills flagged. Complete mock interviews to generate diagnostic feedback.
                  </p>
                </div>
              ) : (
                weakAreas.map((item) => (
                  <div key={item.id} className="p-4 space-y-1.5 transition hover:bg-muted/30">
                    <div className="flex items-center justify-between">
                      <span className="font-body text-xs font-semibold text-foreground">
                        {item.skill}
                      </span>
                      <span
                        className={`rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${
                          item.severity === "high"
                            ? "bg-rose-500/15 text-rose-500"
                            : "bg-amber-500/15 text-amber-500"
                        }`}
                      >
                        {item.severity}
                      </span>
                    </div>
                    {item.notes && (
                      <p className="font-body text-[11px] text-muted-foreground leading-relaxed">
                        {item.notes}
                      </p>
                    )}
                    <Link
                      href={`/app/chat`}
                      className="inline-flex items-center gap-1 font-body text-[11px] font-medium text-primary hover:underline pt-0.5"
                    >
                      <span>Ask AI practice plan</span>
                      <ArrowUpRight className="h-3 w-3" />
                    </Link>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Quick Placement Prep Shortcuts */}
          <div className="rounded-3xl border border-border/80 bg-card p-5 shadow-soft space-y-3">
            <h2 className="font-headline text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Placement Utilities
            </h2>
            <div className="space-y-1.5 font-body text-xs">
              <Link
                href="/app/resume/scanner"
                className="flex items-center justify-between rounded-xl p-2.5 font-medium text-foreground transition hover:bg-muted/60"
              >
                <div className="flex items-center gap-2.5">
                  <FileSearch className="h-4 w-4 text-primary" />
                  <span>ATS Resume Scanner</span>
                </div>
                <span className="text-[11px] text-muted-foreground">Scan PDF →</span>
              </Link>
              <Link
                href="/app/resume/builder"
                className="flex items-center justify-between rounded-xl p-2.5 font-medium text-foreground transition hover:bg-muted/60"
              >
                <div className="flex items-center gap-2.5">
                  <FileSearch className="h-4 w-4 text-emerald-500" />
                  <span>Resume Builder</span>
                </div>
                <span className="text-[11px] text-muted-foreground">Edit draft →</span>
              </Link>
              <Link
                href="/app/chat"
                className="flex items-center justify-between rounded-xl p-2.5 font-medium text-foreground transition hover:bg-muted/60"
              >
                <div className="flex items-center gap-2.5">
                  <Sparkles className="h-4 w-4 text-amber-500" />
                  <span>Prep Assistant Q&amp;A</span>
                </div>
                <span className="text-[11px] text-muted-foreground">Ask AI →</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
