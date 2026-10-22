import Link from "next/link";
import {
  Building2,
  Users,
  Video,
  Coins,
  ArrowRight,
  Database,
  BookOpen,
  Sparkles,
  BarChart3,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/auth/current-profile";

interface PlatformAdminOverviewProps {
  profile: Profile;
}

export default async function PlatformAdminOverview({ profile }: PlatformAdminOverviewProps) {
  const supabase = await createClient();

  const [collegesRes, studentsRes, interviewsRes, usageRes, questionsRes, kbRes] = await Promise.all([
    supabase.from("colleges").select("id, name, created_at").order("created_at", { ascending: false }),
    supabase.from("profiles").select("id, created_at").eq("role", "student"),
    supabase.from("interviews").select("id, status, created_at").order("created_at", { ascending: false }),
    supabase.from("usage_events").select("cost_paise, provider, feature"),
    supabase.from("question_bank").select("id, status"),
    supabase.from("kb_documents").select("id, status"),
  ]);

  const colleges = collegesRes.data ?? [];
  const students = studentsRes.data ?? [];
  const interviews = interviewsRes.data ?? [];
  const usageEvents = usageRes.data ?? [];
  const questions = questionsRes.data ?? [];
  const kbDocs = kbRes.data ?? [];

  // Compute live aggregates
  const completedInterviews = interviews.filter((i) => i.status === "completed").length;
  const totalCostPaise = usageEvents.reduce((sum, e) => sum + (e.cost_paise || 0), 0);
  const totalCostInr = (totalCostPaise / 100).toFixed(2);

  const reviewedQuestions = questions.filter((q) => q.status === "reviewed").length;
  const publishedKbDocs = kbDocs.filter((d) => d.status === "published").length;

  return (
    <div className="max-w-6xl space-y-8">
      {/* Header */}
      <div className="overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-card to-background p-6 shadow-soft sm:p-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 font-body text-xs font-semibold text-primary">
              <Sparkles className="h-3.5 w-3.5" />
              <span>Platform Operations</span>
            </div>
            <h1 className="mt-2 font-headline text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              Platform Administration{profile.full_name ? ` — ${profile.full_name}` : ""}
            </h1>
            <p className="mt-1 font-body text-sm text-muted-foreground">
              Cross-college oversight, AI infrastructure usage, content moderation, and benchmarking.
            </p>
          </div>
          <div className="rounded-2xl border border-border bg-card/80 p-4">
            <span className="font-body text-xs font-medium text-muted-foreground">Platform AI Spend</span>
            <p className="font-metric text-2xl font-bold text-foreground">INR {totalCostInr}</p>
            <p className="font-body text-[11px] text-muted-foreground">{usageEvents.length} tracked API events</p>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Building2 className="h-4 w-4 text-primary" />
            <span className="font-body text-xs font-medium">Partner Colleges</span>
          </div>
          <p className="mt-2 font-metric text-2xl font-bold text-foreground">{colleges.length}</p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Users className="h-4 w-4 text-accent" />
            <span className="font-body text-xs font-medium">Total Students</span>
          </div>
          <p className="mt-2 font-metric text-2xl font-bold text-foreground">{students.length}</p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Video className="h-4 w-4 text-emerald-500" />
            <span className="font-body text-xs font-medium">Interviews Conducted</span>
          </div>
          <p className="mt-2 font-metric text-2xl font-bold text-foreground">{completedInterviews}</p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Database className="h-4 w-4 text-indigo-500" />
            <span className="font-body text-xs font-medium">Curated Questions</span>
          </div>
          <p className="mt-2 font-metric text-2xl font-bold text-foreground">
            {reviewedQuestions} <span className="text-xs text-muted-foreground">/ {questions.length}</span>
          </p>
        </div>
      </div>

      {/* Quick Operation Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Link
          href="/app/colleges"
          className="group rounded-3xl border border-border bg-card p-6 shadow-soft transition-all hover:border-primary/50 hover:shadow-md"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 text-primary transition-transform group-hover:scale-110">
            <Building2 className="h-5 w-5" strokeWidth={1.75} />
          </div>
          <h2 className="mt-4 font-headline text-base font-semibold text-foreground">Colleges Directory</h2>
          <p className="mt-1 font-body text-xs text-muted-foreground">
            Onboard new educational institutions, provision college admins, and review roster limits.
          </p>
          <div className="mt-4 flex items-center gap-1 font-body text-xs font-semibold text-primary">
            <span>Manage Colleges</span>
            <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-1" />
          </div>
        </Link>

        <Link
          href="/app/cost-dashboard"
          className="group rounded-3xl border border-border bg-card p-6 shadow-soft transition-all hover:border-primary/50 hover:shadow-md"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-amber-500/20 bg-amber-500/10 text-amber-600 transition-transform group-hover:scale-110">
            <Coins className="h-5 w-5" strokeWidth={1.75} />
          </div>
          <h2 className="mt-4 font-headline text-base font-semibold text-foreground">Cost Dashboard</h2>
          <p className="mt-1 font-body text-xs text-muted-foreground">
            Verify actual AI provider spend down to the paise across Groq, Sarvam, Gemini, and Redis.
          </p>
          <div className="mt-4 flex items-center gap-1 font-body text-xs font-semibold text-amber-600">
            <span>View Spend Analytics</span>
            <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-1" />
          </div>
        </Link>

        <Link
          href="/app/question-bank"
          className="group rounded-3xl border border-border bg-card p-6 shadow-soft transition-all hover:border-primary/50 hover:shadow-md"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-indigo-500/20 bg-indigo-500/10 text-indigo-600 transition-transform group-hover:scale-110">
            <Database className="h-5 w-5" strokeWidth={1.75} />
          </div>
          <h2 className="mt-4 font-headline text-base font-semibold text-foreground">Question Bank</h2>
          <p className="mt-1 font-body text-xs text-muted-foreground">
            Review, edit, and approve multi-stage placement questions across Technical, HR, and Behavioral tracks.
          </p>
          <div className="mt-4 flex items-center gap-1 font-body text-xs font-semibold text-indigo-600">
            <span>Review Questions</span>
            <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-1" />
          </div>
        </Link>

        <Link
          href="/app/knowledge-base"
          className="group rounded-3xl border border-border bg-card p-6 shadow-soft transition-all hover:border-primary/50 hover:shadow-md"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-emerald-500/20 bg-emerald-500/10 text-emerald-600 transition-transform group-hover:scale-110">
            <BookOpen className="h-5 w-5" strokeWidth={1.75} />
          </div>
          <h2 className="mt-4 font-headline text-base font-semibold text-foreground">Knowledge Base RAG</h2>
          <p className="mt-1 font-body text-xs text-muted-foreground">
            Manage company guides and chunk embeddings queried by the Prep Assistant ({publishedKbDocs} published).
          </p>
          <div className="mt-4 flex items-center gap-1 font-body text-xs font-semibold text-emerald-600">
            <span>View Knowledge Base</span>
            <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-1" />
          </div>
        </Link>

        <Link
          href="/app/golden-set"
          className="group rounded-3xl border border-border bg-card p-6 shadow-soft transition-all hover:border-primary/50 hover:shadow-md"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-rose-500/20 bg-rose-500/10 text-rose-600 transition-transform group-hover:scale-110">
            <BarChart3 className="h-5 w-5" strokeWidth={1.75} />
          </div>
          <h2 className="mt-4 font-headline text-base font-semibold text-foreground">Golden Set Calibration</h2>
          <p className="mt-1 font-body text-xs text-muted-foreground">
            Benchmark rubric evaluation alignment against expert-scored ground-truth interviews.
          </p>
          <div className="mt-4 flex items-center gap-1 font-body text-xs font-semibold text-rose-600">
            <span>Run Golden Evals</span>
            <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-1" />
          </div>
        </Link>

        <Link
          href="/app/plans"
          className="group rounded-3xl border border-border bg-card p-6 shadow-soft transition-all hover:border-primary/50 hover:shadow-md"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-sky-500/20 bg-sky-500/10 text-sky-600 transition-transform group-hover:scale-110">
            <Sparkles className="h-5 w-5" strokeWidth={1.75} />
          </div>
          <h2 className="mt-4 font-headline text-base font-semibold text-foreground">Subscription Plans</h2>
          <p className="mt-1 font-body text-xs text-muted-foreground">
            Manage student and institutional quota packages and pricing structures.
          </p>
          <div className="mt-4 flex items-center gap-1 font-body text-xs font-semibold text-sky-600">
            <span>Configure Plans</span>
            <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-1" />
          </div>
        </Link>
      </div>

      {/* Partner Colleges Table */}
      <div className="rounded-3xl border border-border bg-card p-6 shadow-soft">
        <div className="flex items-center justify-between pb-4 border-b border-border">
          <div>
            <h2 className="font-headline text-lg font-semibold text-foreground">Partner Colleges</h2>
            <p className="font-body text-xs text-muted-foreground">Institutions currently active on the platform</p>
          </div>
          <Link href="/app/colleges" className="font-body text-xs font-medium text-primary hover:underline">
            View all colleges &rarr;
          </Link>
        </div>

        <div className="mt-4 overflow-x-auto">
          {colleges.length === 0 ? (
            <p className="py-6 text-center font-body text-sm text-muted-foreground">
              No partner colleges registered yet.
            </p>
          ) : (
            <table className="w-full text-left font-body text-sm">
              <thead>
                <tr className="border-b border-border text-xs text-muted-foreground">
                  <th className="pb-3 font-medium">College Name</th>
                  <th className="pb-3 font-medium">Date Onboarded</th>
                  <th className="pb-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {colleges.map((college) => (
                  <tr key={college.id} className="hover:bg-muted/40">
                    <td className="py-3 font-medium text-foreground">{college.name}</td>
                    <td className="py-3 text-muted-foreground">
                      {new Date(college.created_at).toLocaleDateString("en-IN", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                    </td>
                    <td className="py-3 text-right">
                      <Link
                        href={`/app/colleges/${college.id}`}
                        className="rounded-lg border border-border bg-background px-2.5 py-1 text-xs font-medium text-foreground hover:bg-muted"
                      >
                        View Details
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
