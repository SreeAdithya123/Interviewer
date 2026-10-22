import Link from "next/link";
import { Video, FileSearch, MessageSquare, FileText, ArrowRight, Sparkles, CheckCircle2, AlertCircle, Clock } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/auth/current-profile";
import { readinessBand, READINESS_LABEL } from "@/lib/readiness";

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

  // Map latest score
  const latestReport = reports[0];
  const latestScore = latestReport?.overall_score !== null && latestReport?.overall_score !== undefined
    ? Number(latestReport.overall_score)
    : null;
  const currentBand = readinessBand(latestScore);

  const completedCount = interviews.filter((i) => i.status === "completed").length;

  return (
    <div className="max-w-6xl space-y-8">
      {/* Welcome Banner & Readiness Status */}
      <div className="relative overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-card to-background p-6 shadow-soft sm:p-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 font-body text-xs font-semibold text-primary">
              <Sparkles className="h-3.5 w-3.5" />
              <span>Campus Placement Hub</span>
            </div>
            <h1 className="font-headline text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              Welcome back{profile.full_name ? `, ${profile.full_name.split(" ")[0]}` : ""}!
            </h1>
            <p className="font-body text-sm text-muted-foreground">
              Practice mock interviews, diagnose weak areas, and optimize your resume for placement season.
            </p>
          </div>

          {/* Readiness Pill */}
          <div className="flex flex-col items-start gap-1 rounded-2xl border border-border/80 bg-card/80 p-4 sm:items-end">
            <span className="font-body text-xs font-medium text-muted-foreground">Placement Readiness</span>
            <div className="flex items-center gap-2">
              <span
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 font-body text-xs font-semibold ${
                  currentBand === "ready"
                    ? "border border-emerald-500/30 bg-emerald-500/10 text-emerald-600"
                    : currentBand === "developing"
                      ? "border border-amber-500/30 bg-amber-500/10 text-amber-600"
                      : currentBand === "needs_practice"
                        ? "border border-rose-500/30 bg-rose-500/10 text-rose-600"
                        : "border border-border bg-muted/60 text-muted-foreground"
                }`}
              >
                {currentBand === "ready" && <CheckCircle2 className="h-3.5 w-3.5" />}
                {currentBand === "developing" && <Clock className="h-3.5 w-3.5" />}
                {currentBand === "needs_practice" && <AlertCircle className="h-3.5 w-3.5" />}
                {READINESS_LABEL[currentBand]}
                {latestScore !== null && ` (${latestScore}/100)`}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Action Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Practice Interview */}
        <Link
          href="/app/interview"
          className="group flex flex-col justify-between rounded-3xl border border-border bg-card p-6 shadow-soft transition-all hover:border-primary/50 hover:shadow-md"
        >
          <div className="space-y-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 text-primary transition-transform group-hover:scale-110">
              <Video className="h-6 w-6" strokeWidth={1.75} />
            </div>
            <div>
              <h2 className="font-headline text-base font-semibold text-foreground">Practice Interview</h2>
              <p className="mt-1 font-body text-xs text-muted-foreground">
                Live AI technical & HR mock interviews with real-time speech and instant scorecard.
              </p>
            </div>
          </div>
          <div className="mt-4 flex items-center gap-1.5 font-body text-xs font-semibold text-primary">
            <span>Start Practice</span>
            <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
          </div>
        </Link>

        {/* ATS Resume Scanner */}
        <Link
          href="/app/resume/scanner"
          className="group flex flex-col justify-between rounded-3xl border border-border bg-card p-6 shadow-soft transition-all hover:border-primary/50 hover:shadow-md"
        >
          <div className="space-y-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-accent/20 bg-accent/10 text-accent transition-transform group-hover:scale-110">
              <FileSearch className="h-6 w-6" strokeWidth={1.75} />
            </div>
            <div>
              <h2 className="font-headline text-base font-semibold text-foreground">Resume Scanner</h2>
              <p className="mt-1 font-body text-xs text-muted-foreground">
                Get 4 honest checks: section health, JD keyword match, metric quality, and formatting risks.
              </p>
            </div>
          </div>
          <div className="mt-4 flex items-center gap-1.5 font-body text-xs font-semibold text-accent">
            <span>Scan PDF</span>
            <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
          </div>
        </Link>

        {/* Placement Prep Assistant */}
        <Link
          href="/app/chat"
          className="group flex flex-col justify-between rounded-3xl border border-border bg-card p-6 shadow-soft transition-all hover:border-primary/50 hover:shadow-md"
        >
          <div className="space-y-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-emerald-500/20 bg-emerald-500/10 text-emerald-600 transition-transform group-hover:scale-110">
              <MessageSquare className="h-6 w-6" strokeWidth={1.75} />
            </div>
            <div>
              <h2 className="font-headline text-base font-semibold text-foreground">Prep Assistant</h2>
              <p className="mt-1 font-body text-xs text-muted-foreground">
                RAG-grounded Q&A on company hiring patterns, DSA questions, and placement guides.
              </p>
            </div>
          </div>
          <div className="mt-4 flex items-center gap-1.5 font-body text-xs font-semibold text-emerald-600">
            <span>Ask Questions</span>
            <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
          </div>
        </Link>

        {/* Resume Builder */}
        <Link
          href="/app/resume/builder"
          className="group flex flex-col justify-between rounded-3xl border border-border bg-card p-6 shadow-soft transition-all hover:border-primary/50 hover:shadow-md"
        >
          <div className="space-y-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-indigo-500/20 bg-indigo-500/10 text-indigo-600 transition-transform group-hover:scale-110">
              <FileText className="h-6 w-6" strokeWidth={1.75} />
            </div>
            <div>
              <h2 className="font-headline text-base font-semibold text-foreground">Resume Builder</h2>
              <p className="mt-1 font-body text-xs text-muted-foreground">
                Create a high-impact, single-page ATS resume with AI bullet rewrites and PDF export.
              </p>
            </div>
          </div>
          <div className="mt-4 flex items-center gap-1.5 font-body text-xs font-semibold text-indigo-600">
            <span>Edit Resume</span>
            <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
          </div>
        </Link>
      </div>

      {/* Snapshot Stats Grid */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
          <p className="font-body text-xs font-medium text-muted-foreground">Interviews Completed</p>
          <p className="mt-2 font-metric text-2xl font-bold text-foreground">{completedCount}</p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
          <p className="font-body text-xs font-medium text-muted-foreground">Latest Score</p>
          <p className="mt-2 font-metric text-2xl font-bold text-foreground">
            {latestScore !== null ? `${latestScore}/100` : "—"}
          </p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
          <p className="font-body text-xs font-medium text-muted-foreground">Skills to Improve</p>
          <p className="mt-2 font-metric text-2xl font-bold text-foreground">{weakAreas.length}</p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
          <p className="font-body text-xs font-medium text-muted-foreground">Saved Resumes</p>
          <p className="mt-2 font-metric text-2xl font-bold text-foreground">{resumes.length}</p>
        </div>
      </div>

      {/* Two Column Layout: Weak Areas + Recent Interviews */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        {/* Diagnostic Weak Areas */}
        <div className="rounded-3xl border border-border bg-card p-6 shadow-soft">
          <div className="flex items-center justify-between pb-4 border-b border-border">
            <div>
              <h2 className="font-headline text-lg font-semibold text-foreground">Skills to Master</h2>
              <p className="font-body text-xs text-muted-foreground">
                Actionable areas diagnosed by AI during your mock interviews
              </p>
            </div>
            {weakAreas.length > 0 && (
              <span className="rounded-full bg-destructive/10 px-2.5 py-0.5 font-body text-xs font-semibold text-destructive">
                {weakAreas.length} active
              </span>
            )}
          </div>

          <div className="mt-4 space-y-3">
            {weakAreas.length === 0 ? (
              <div className="py-8 text-center">
                <CheckCircle2 className="mx-auto h-8 w-8 text-emerald-500 opacity-80" strokeWidth={1.5} />
                <p className="mt-2 font-body text-sm font-medium text-foreground">No weak areas diagnosed yet!</p>
                <p className="mt-1 font-body text-xs text-muted-foreground">
                  Complete mock interviews to receive honest, detailed feedback on communication and technical topics.
                </p>
                <Link
                  href="/app/interview"
                  className="mt-4 inline-flex items-center gap-1.5 rounded-xl border border-primary/30 bg-primary/10 px-3 py-1.5 font-body text-xs font-medium text-primary hover:bg-primary/20"
                >
                  Start an interview
                </Link>
              </div>
            ) : (
              weakAreas.map((item) => (
                <div
                  key={item.id}
                  className="flex flex-col gap-2 rounded-2xl border border-border bg-background/50 p-4 transition-colors hover:border-primary/30"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-body text-sm font-semibold text-foreground">{item.skill}</span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${
                        item.severity === "high"
                          ? "bg-rose-500/10 text-rose-600 border border-rose-500/20"
                          : "bg-amber-500/10 text-amber-600 border border-amber-500/20"
                      }`}
                    >
                      {item.severity} priority
                    </span>
                  </div>
                  {item.notes && <p className="font-body text-xs text-muted-foreground">{item.notes}</p>}
                  <div className="mt-1 flex items-center gap-2">
                    <Link
                      href={`/app/chat?q=How can I improve my skills in ${encodeURIComponent(item.skill)} for placement interviews?`}
                      className="inline-flex items-center gap-1 font-body text-xs font-medium text-primary hover:underline"
                    >
                      <span>Ask AI for practice plan</span>
                      <ArrowRight className="h-3 w-3" />
                    </Link>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recent Interviews */}
        <div className="rounded-3xl border border-border bg-card p-6 shadow-soft">
          <div className="flex items-center justify-between pb-4 border-b border-border">
            <div>
              <h2 className="font-headline text-lg font-semibold text-foreground">Recent Practice Sessions</h2>
              <p className="font-body text-xs text-muted-foreground">Your interview attempts and evaluations</p>
            </div>
            <Link href="/app/history" className="font-body text-xs font-medium text-primary hover:underline">
              View all
            </Link>
          </div>

          <div className="mt-4 space-y-3">
            {interviews.length === 0 ? (
              <div className="py-8 text-center">
                <Video className="mx-auto h-8 w-8 text-muted-foreground opacity-60" strokeWidth={1.5} />
                <p className="mt-2 font-body text-sm font-medium text-foreground">No practice sessions yet</p>
                <p className="mt-1 font-body text-xs text-muted-foreground">
                  Try a 10-15 minute mock interview to test your responses with real speech.
                </p>
                <Link
                  href="/app/interview"
                  className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-primary px-3 py-1.5 font-body text-xs font-semibold text-primary-foreground hover:bg-primary-hover"
                >
                  Start first interview
                </Link>
              </div>
            ) : (
              interviews.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between rounded-2xl border border-border bg-background/50 p-3.5 transition-colors hover:border-primary/30"
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-body text-sm font-semibold capitalize text-foreground">
                        {item.interview_type} Interview
                      </span>
                      <span className="rounded-md border border-border px-1.5 py-0.2 font-body text-[10px] capitalize text-muted-foreground">
                        {item.difficulty}
                      </span>
                    </div>
                    <p className="font-body text-xs text-muted-foreground">
                      {item.target_role || "General placement"} &bull;{" "}
                      {new Date(item.created_at).toLocaleDateString("en-IN", {
                        month: "short",
                        day: "numeric",
                      })}
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    {item.status === "completed" ? (
                      <Link
                        href={`/app/interview/${item.id}/report`}
                        className="rounded-xl border border-primary/20 bg-primary/10 px-3 py-1.5 font-body text-xs font-semibold text-primary hover:bg-primary/20"
                      >
                        View Report
                      </Link>
                    ) : item.status === "in_progress" ? (
                      <Link
                        href={`/app/interview/${item.id}`}
                        className="rounded-xl bg-primary px-3 py-1.5 font-body text-xs font-semibold text-primary-foreground hover:bg-primary-hover"
                      >
                        Resume
                      </Link>
                    ) : (
                      <span className="font-body text-xs capitalize text-muted-foreground">{item.status}</span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
