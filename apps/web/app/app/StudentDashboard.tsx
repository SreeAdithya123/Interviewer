import Link from "next/link";
import { ArrowRight, ArrowUpRight } from "lucide-react";
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
    <div className="mx-auto max-w-6xl space-y-6">
      {/* First-time platform tour banner */}
      <TourBanner />

      {/* Title & Screen's One Finding & Primary Action */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-headline text-2xl font-semibold tracking-tight text-foreground">
            Placement Overview
          </h1>
          <p className="mt-1 font-body text-sm text-muted-foreground">
            {latestScore !== null ? (
              <>
                Readiness score:{" "}
                <span className="font-medium text-foreground">{latestScore} / 100</span> ·{" "}
                <span>{READINESS_LABEL[currentBand]}</span>
                {weakAreas.length > 0 && ` · ${weakAreas.length} diagnostic areas flagged`}
              </>
            ) : (
              "No mock interviews completed yet · Complete your first technical mock to compute readiness score."
            )}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/app/interview"
            className="inline-flex h-9 items-center justify-center rounded-md bg-foreground px-4 font-body text-xs font-medium text-background transition-colors hover:bg-foreground/90"
          >
            Start mock interview
          </Link>
        </div>
      </div>

      {/* KPI Strip: One container divided by 1px rules */}
      <div className="grid grid-cols-2 divide-y border border-border/80 bg-card rounded-lg sm:grid-cols-4 sm:divide-y-0 sm:divide-x">
        <div className="p-4 sm:p-5">
          <p className="font-body text-xs font-medium text-muted-foreground">
            Overall readiness
          </p>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="font-metric text-2xl font-semibold tracking-tight text-foreground tabular-nums sm:text-3xl">
              {latestScore !== null ? latestScore : "—"}
            </span>
            {latestScore !== null && (
              <span className="font-body text-xs text-muted-foreground">/ 100</span>
            )}
          </div>
          <p className="mt-1 font-body text-[11px] text-muted-foreground">
            {latestScore !== null ? "target 75+ for campus drives" : "complete 1st mock"}
          </p>
        </div>

        <div className="p-4 sm:p-5">
          <p className="font-body text-xs font-medium text-muted-foreground">
            Mock interviews
          </p>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="font-metric text-2xl font-semibold tracking-tight text-foreground tabular-nums sm:text-3xl">
              {completedCount}
            </span>
            <span className="font-body text-xs text-muted-foreground">completed</span>
          </div>
          <p className="mt-1 font-body text-[11px] text-muted-foreground">
            {interviews.length} sessions started
          </p>
        </div>

        <div className="p-4 sm:p-5">
          <p className="font-body text-xs font-medium text-muted-foreground">
            Weak areas
          </p>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="font-metric text-2xl font-semibold tracking-tight text-foreground tabular-nums sm:text-3xl">
              {weakAreas.length}
            </span>
            <span className="font-body text-xs text-muted-foreground">flagged</span>
          </div>
          <p className="mt-1 font-body text-[11px] text-muted-foreground">
            {weakAreas.length === 0 ? "all diagnostic topics clear" : "action required before drives"}
          </p>
        </div>

        <div className="p-4 sm:p-5">
          <p className="font-body text-xs font-medium text-muted-foreground">
            Resumes on file
          </p>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="font-metric text-2xl font-semibold tracking-tight text-foreground tabular-nums sm:text-3xl">
              {resumes.length}
            </span>
            <span className="font-body text-xs text-muted-foreground">versions</span>
          </div>
          <p className="mt-1 font-body text-[11px] text-muted-foreground">
            {resumes.length > 0 ? "ATS profile active" : "upload required"}
          </p>
        </div>
      </div>

      {/* Main Two-Column Working Surface */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left Column (2 spans): Recent Interviews Table & Placement Drives */}
        <div className="space-y-6 lg:col-span-2">
          {/* Recent Interviews Table */}
          <div className="rounded-lg border border-border/80 bg-card">
            <div className="flex items-center justify-between border-b border-border/80 px-5 py-3.5">
              <div>
                <h2 className="font-body text-sm font-semibold text-foreground">
                  Recent practice sessions
                </h2>
                <p className="font-body text-xs text-muted-foreground">
                  AI-evaluated mock interviews and performance records
                </p>
              </div>
              <Link
                href="/app/history"
                className="inline-flex items-center gap-1 font-body text-xs font-medium text-muted-foreground hover:text-foreground"
              >
                <span>View all</span>
                <ArrowRight className="h-3 w-3" />
              </Link>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left font-body text-xs">
                <thead>
                  <tr className="border-b border-border/60 text-muted-foreground">
                    <th className="px-5 py-2.5 font-medium">Interview</th>
                    <th className="px-4 py-2.5 font-medium">Difficulty</th>
                    <th className="px-4 py-2.5 font-medium">Date</th>
                    <th className="px-4 py-2.5 text-right font-medium">Score</th>
                    <th className="px-5 py-2.5 text-right font-medium">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {interviews.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-5 py-8 text-center text-muted-foreground">
                        No practice sessions yet. Start a 10-minute mock interview to receive real evaluation.
                      </td>
                    </tr>
                  ) : (
                    interviews.map((item) => {
                      const score = reportByInterviewId.get(item.id);
                      return (
                        <tr
                          key={item.id}
                          className="border-b border-border/60 transition-colors last:border-0 hover:bg-muted/30"
                        >
                          <td className="px-5 py-3">
                            <p className="font-medium text-foreground capitalize">
                              {item.target_role || `${item.interview_type} mock`}
                            </p>
                            <p className="text-[11px] text-muted-foreground capitalize">
                              {item.interview_type} track
                            </p>
                          </td>
                          <td className="px-4 py-3 capitalize text-muted-foreground">
                            {item.difficulty}
                          </td>
                          <td className="px-4 py-3 text-muted-foreground">
                            {new Date(item.created_at).toLocaleDateString("en-IN", {
                              month: "short",
                              day: "numeric",
                            })}
                          </td>
                          <td className="px-4 py-3 text-right font-metric font-medium text-foreground tabular-nums">
                            {score !== undefined ? `${score} / 100` : "—"}
                          </td>
                          <td className="px-5 py-3 text-right">
                            {item.status === "completed" ? (
                              <Link
                                href={`/app/interview/${item.id}/report`}
                                className="font-medium text-foreground underline-offset-4 hover:underline"
                              >
                                Report →
                              </Link>
                            ) : item.status === "in_progress" ? (
                              <Link
                                href={`/app/interview/${item.id}`}
                                className="font-medium text-foreground underline-offset-4 hover:underline"
                              >
                                Resume →
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

          {/* Placement Drives Pipeline Briefing */}
          <div className="flex items-center justify-between rounded-lg border border-border/80 bg-card p-5">
            <div>
              <h2 className="font-body text-sm font-semibold text-foreground">
                Campus placement drives
              </h2>
              <p className="mt-0.5 font-body text-xs text-muted-foreground">
                Verify cutoff criteria, eligibility, and take company-specific assessments.
              </p>
            </div>
            <Link
              href="/app/drives"
              className="inline-flex h-8 items-center gap-1.5 rounded border border-border/80 bg-background px-3 font-body text-xs font-medium text-foreground transition-colors hover:bg-muted"
            >
              <span>Explore drives</span>
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        </div>

        {/* Right Column (1 span): Diagnostic Weak Skills & Prep Utilities */}
        <div className="space-y-6">
          {/* Weak Skills Diagnosis */}
          <div className="rounded-lg border border-border/80 bg-card">
            <div className="flex items-center justify-between border-b border-border/80 px-4 py-3.5">
              <div>
                <h2 className="font-body text-sm font-semibold text-foreground">
                  Diagnostic weak skills
                </h2>
                <p className="font-body text-[11px] text-muted-foreground">
                  Flagged during AI speech evaluation
                </p>
              </div>
              {weakAreas.length > 0 && (
                <span className="rounded bg-rose-50 px-2 py-0.5 font-body text-[10px] font-medium text-rose-800 border border-rose-200/60 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800/40">
                  {weakAreas.length} active
                </span>
              )}
            </div>

            <div className="divide-y divide-border/60">
              {weakAreas.length === 0 ? (
                <p className="p-4 text-center font-body text-xs text-muted-foreground">
                  No weak skills flagged. Complete mock interviews to generate diagnostic feedback.
                </p>
              ) : (
                weakAreas.map((item) => (
                  <div key={item.id} className="p-3.5 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-body text-xs font-medium text-foreground">
                        {item.skill}
                      </span>
                      <span
                        className={`rounded px-1.5 py-0.2 text-[10px] font-medium uppercase border ${
                          item.severity === "high"
                            ? "bg-rose-50 text-rose-800 border-rose-200/60 dark:bg-rose-950/40 dark:text-rose-300"
                            : "bg-amber-50 text-amber-800 border-amber-200/60 dark:bg-amber-950/40 dark:text-amber-300"
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
                      href={`/app/chat?q=How can I improve my skills in ${encodeURIComponent(item.skill)} for placement interviews?`}
                      className="inline-flex items-center gap-1 font-body text-[11px] font-medium text-muted-foreground hover:text-foreground pt-0.5"
                    >
                      <span>Ask AI practice plan</span>
                      <ArrowUpRight className="h-3 w-3" />
                    </Link>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Career & Placement Tools */}
          <div className="rounded-lg border border-border/80 bg-card p-4 space-y-3">
            <h2 className="font-body text-xs font-medium text-muted-foreground">
              Placement preparation tools
            </h2>
            <div className="divide-y divide-border/60 font-body text-xs">
              <Link
                href="/app/resume/scanner"
                className="flex items-center justify-between py-2 font-medium text-foreground transition-colors hover:text-foreground/80"
              >
                <span>ATS Resume Scanner</span>
                <span className="text-[11px] text-muted-foreground">Scan PDF →</span>
              </Link>
              <Link
                href="/app/resume/builder"
                className="flex items-center justify-between py-2 font-medium text-foreground transition-colors hover:text-foreground/80"
              >
                <span>Resume Builder</span>
                <span className="text-[11px] text-muted-foreground">Edit draft →</span>
              </Link>
              <Link
                href="/app/chat"
                className="flex items-center justify-between py-2 font-medium text-foreground transition-colors hover:text-foreground/80"
              >
                <span>Placement Prep Assistant</span>
                <span className="text-[11px] text-muted-foreground">Ask Q&A →</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
