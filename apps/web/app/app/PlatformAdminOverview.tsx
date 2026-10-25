import Link from "next/link";
import {
  Building2,
  Users,
  Video,
  Coins,
  ArrowRight,
  Database,
  BookOpen,
  BarChart3,
  Layers,
  GraduationCap,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/auth/current-profile";
import PlatformUsersTable, { type PlatformUserRow } from "./PlatformUsersTable";

interface PlatformAdminOverviewProps {
  profile: Profile;
}

export default async function PlatformAdminOverview({ profile }: PlatformAdminOverviewProps) {
  const supabase = await createClient();

  const [collegesRes, profilesRes, interviewsRes, usageRes, questionsRes, kbRes] = await Promise.all([
    supabase.from("colleges").select("id, name, slug, city, state, created_at").order("name", { ascending: true }),
    supabase
      .from("profiles")
      .select("id, full_name, email, role, department, graduation_year, college_id, created_at")
      .order("created_at", { ascending: false }),
    supabase.from("interviews").select("id, status, created_at").order("created_at", { ascending: false }),
    supabase.from("usage_events").select("cost_paise, provider, feature"),
    supabase.from("question_bank").select("id, status"),
    supabase.from("kb_documents").select("id, status"),
  ]);

  const colleges = collegesRes.data ?? [];
  const rawProfiles = profilesRes.data ?? [];
  const interviews = interviewsRes.data ?? [];
  const usageEvents = usageRes.data ?? [];
  const questions = questionsRes.data ?? [];
  const kbDocs = kbRes.data ?? [];

  // Aggregates
  const completedInterviews = interviews.filter((i) => i.status === "completed").length;
  const totalCostPaise = usageEvents.reduce((sum, e) => sum + (e.cost_paise || 0), 0);
  const totalCostInr = (totalCostPaise / 100).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  const reviewedQuestions = questions.filter((q) => q.status === "reviewed").length;
  const publishedKbDocs = kbDocs.filter((d) => d.status === "published").length;

  // College lookup map for instant resolution
  const collegeMap = new Map<string, string>();
  for (const c of colleges) {
    collegeMap.set(c.id, c.name);
  }

  // Map users with resolved college name
  const platformUsers: PlatformUserRow[] = rawProfiles.map((p) => ({
    id: p.id,
    fullName: p.full_name,
    email: p.email,
    role: (p.role || "student") as "student" | "college_admin" | "platform_admin",
    collegeId: p.college_id,
    collegeName: p.college_id ? (collegeMap.get(p.college_id) ?? "Unknown College") : "Independent / Direct",
    department: p.department,
    graduationYear: p.graduation_year,
    createdAt: p.created_at,
  }));

  // Counts & Distribution
  const totalUsersCount = platformUsers.length;
  const studentCount = platformUsers.filter((u) => u.role === "student").length;
  const collegeAdminCount = platformUsers.filter((u) => u.role === "college_admin").length;
  const platformAdminCount = platformUsers.filter((u) => u.role === "platform_admin").length;

  const usersCountByCollege = new Map<string, number>();
  for (const u of platformUsers) {
    if (u.collegeId) {
      usersCountByCollege.set(u.collegeId, (usersCountByCollege.get(u.collegeId) ?? 0) + 1);
    }
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {/* Title & Primary Action */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-headline text-2xl font-semibold tracking-tight text-foreground">
            Platform Administration
          </h1>
          <p className="mt-1 font-body text-sm text-muted-foreground">
            AI infrastructure spend: <span className="font-medium text-foreground">₹{totalCostInr}</span> across{" "}
            {usageEvents.length} tracked API events · {colleges.length} partner colleges · {totalUsersCount} platform users ({studentCount} students, {collegeAdminCount} college admins).
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/app/colleges"
            className="inline-flex h-9 items-center justify-center rounded-md bg-foreground px-4 font-body text-xs font-medium text-background transition-colors hover:bg-foreground/90"
          >
            + Onboard college
          </Link>
        </div>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-2 divide-y border border-border/80 bg-card rounded-lg sm:grid-cols-4 sm:divide-y-0 sm:divide-x">
        <div className="p-4 sm:p-5">
          <p className="font-body text-xs font-medium text-muted-foreground">Partner colleges</p>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="font-metric text-2xl font-semibold tracking-tight text-foreground tabular-nums sm:text-3xl">
              {colleges.length}
            </span>
            <span className="font-body text-xs text-muted-foreground">institutions</span>
          </div>
          <p className="mt-1 font-body text-[11px] text-muted-foreground">
            {usersCountByCollege.size} colleges with active users
          </p>
        </div>

        <div className="p-4 sm:p-5">
          <p className="font-body text-xs font-medium text-muted-foreground">Total platform users</p>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="font-metric text-2xl font-semibold tracking-tight text-foreground tabular-nums sm:text-3xl">
              {totalUsersCount}
            </span>
            <span className="font-body text-xs text-muted-foreground">total</span>
          </div>
          <p className="mt-1 font-body text-[11px] text-muted-foreground">
            {studentCount} students · {collegeAdminCount} admins
          </p>
        </div>

        <div className="p-4 sm:p-5">
          <p className="font-body text-xs font-medium text-muted-foreground">Conducted interviews</p>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="font-metric text-2xl font-semibold tracking-tight text-foreground tabular-nums sm:text-3xl">
              {completedInterviews}
            </span>
            <span className="font-body text-xs text-muted-foreground">completed</span>
          </div>
          <p className="mt-1 font-body text-[11px] text-muted-foreground">
            {interviews.length} total sessions
          </p>
        </div>

        <div className="p-4 sm:p-5">
          <p className="font-body text-xs font-medium text-muted-foreground">Platform AI spend</p>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="font-metric text-2xl font-semibold tracking-tight text-foreground tabular-nums sm:text-3xl">
              ₹{totalCostInr}
            </span>
          </div>
          <p className="mt-1 font-body text-[11px] text-muted-foreground">
            {usageEvents.length} events logged
          </p>
        </div>
      </div>

      {/* Operational Fast Navigation Bar */}
      <div className="flex flex-wrap items-center gap-2 border-b border-border/80 pb-4 text-xs font-body">
        <a
          href="#platform-users"
          className="inline-flex items-center gap-1.5 rounded-md border border-border/80 bg-background px-3 py-1.5 font-medium text-foreground transition-colors hover:bg-muted"
        >
          <Users className="h-3.5 w-3.5 text-muted-foreground" />
          <span>Total users ({totalUsersCount})</span>
          <ArrowRight className="h-3 w-3" />
        </a>
        <Link
          href="/app/colleges"
          className="inline-flex items-center gap-1.5 rounded-md border border-border/80 bg-background px-3 py-1.5 font-medium text-foreground transition-colors hover:bg-muted"
        >
          <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
          <span>Colleges ({colleges.length})</span>
          <ArrowRight className="h-3 w-3" />
        </Link>
        <Link
          href="/app/cost-dashboard"
          className="inline-flex items-center gap-1.5 rounded-md border border-border/80 bg-background px-3 py-1.5 font-medium text-foreground transition-colors hover:bg-muted"
        >
          <Coins className="h-3.5 w-3.5 text-muted-foreground" />
          <span>Cost dashboard</span>
          <ArrowRight className="h-3 w-3" />
        </Link>
        <Link
          href="/app/question-bank"
          className="inline-flex items-center gap-1.5 rounded-md border border-border/80 bg-background px-3 py-1.5 font-medium text-foreground transition-colors hover:bg-muted"
        >
          <Database className="h-3.5 w-3.5 text-muted-foreground" />
          <span>Questions ({reviewedQuestions}/{questions.length})</span>
          <ArrowRight className="h-3 w-3" />
        </Link>
        <Link
          href="/app/knowledge-base"
          className="inline-flex items-center gap-1.5 rounded-md border border-border/80 bg-background px-3 py-1.5 font-medium text-foreground transition-colors hover:bg-muted"
        >
          <BookOpen className="h-3.5 w-3.5 text-muted-foreground" />
          <span>Knowledge base ({publishedKbDocs})</span>
          <ArrowRight className="h-3 w-3" />
        </Link>
        <Link
          href="/app/golden-set"
          className="inline-flex items-center gap-1.5 rounded-md border border-border/80 bg-background px-3 py-1.5 font-medium text-foreground transition-colors hover:bg-muted"
        >
          <BarChart3 className="h-3.5 w-3.5 text-muted-foreground" />
          <span>Golden set calibration</span>
          <ArrowRight className="h-3 w-3" />
        </Link>
        <Link
          href="/app/plans"
          className="inline-flex items-center gap-1.5 rounded-md border border-border/80 bg-background px-3 py-1.5 font-medium text-foreground transition-colors hover:bg-muted"
        >
          <Layers className="h-3.5 w-3.5 text-muted-foreground" />
          <span>Subscription plans</span>
          <ArrowRight className="h-3 w-3" />
        </Link>
      </div>

      {/* Primary Section: Total Users in Platform Along with College Names */}
      <div id="platform-users" className="space-y-4 pt-2">
        <PlatformUsersTable
          users={platformUsers}
          colleges={colleges.map((c) => ({ id: c.id, name: c.name }))}
        />
      </div>

      {/* Two-Column Secondary Working Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3 pt-2">
        {/* Left Column (2 spans): Partner Colleges Table */}
        <div className="rounded-lg border border-border/80 bg-card lg:col-span-2">
          <div className="flex items-center justify-between border-b border-border/80 px-5 py-3.5">
            <div>
              <h2 className="font-body text-sm font-semibold text-foreground">Partner colleges</h2>
              <p className="font-body text-xs text-muted-foreground">
                Educational institutions provisioned on the platform · {colleges.length} institutions
              </p>
            </div>
            <Link
              href="/app/colleges"
              className="inline-flex items-center gap-1 font-body text-xs font-medium text-muted-foreground hover:text-foreground"
            >
              <span>View directory</span>
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left font-body text-xs">
              <thead>
                <tr className="border-b border-border/60 text-muted-foreground">
                  <th className="px-5 py-2.5 font-medium">Institution</th>
                  <th className="px-4 py-2.5 font-medium">Enrolled Users</th>
                  <th className="px-4 py-2.5 font-medium">Onboarded</th>
                  <th className="px-5 py-2.5 text-right font-medium">Action</th>
                </tr>
              </thead>
              <tbody>
                {colleges.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-5 py-8 text-center text-muted-foreground">
                      No partner colleges onboarded yet. Click &quot;Onboard college&quot; above.
                    </td>
                  </tr>
                ) : (
                  colleges.map((college) => (
                    <tr
                      key={college.id}
                      className="border-b border-border/60 transition-colors last:border-0 hover:bg-muted/30"
                    >
                      <td className="px-5 py-3 font-medium text-foreground">{college.name}</td>
                      <td className="px-4 py-3 font-metric tabular-nums text-foreground">
                        <span className="inline-flex items-center gap-1 rounded bg-muted/60 px-2 py-0.5 font-mono text-[11px] font-medium text-foreground">
                          <Users className="h-3 w-3 text-muted-foreground" />
                          {usersCountByCollege.get(college.id) ?? 0}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {new Date(college.created_at).toLocaleDateString("en-IN", {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })}
                      </td>
                      <td className="px-5 py-3 text-right">
                        <Link
                          href={`/app/colleges/${college.id}`}
                          className="font-medium text-foreground underline-offset-4 hover:underline"
                        >
                          Manage →
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Column (1 span): Content & Calibration Pipelines */}
        <div className="space-y-6">
          <div className="rounded-lg border border-border/80 bg-card p-4 space-y-3">
            <h2 className="font-body text-sm font-semibold text-foreground">Content pipelines</h2>
            <p className="font-body text-[11px] text-muted-foreground">
              Review and approval state of system prompts and resources
            </p>

            <div className="divide-y divide-border/60 font-body text-xs">
              <div className="py-2.5 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-foreground">Question Bank</span>
                  <span className="font-metric text-muted-foreground tabular-nums">
                    {reviewedQuestions} / {questions.length} reviewed
                  </span>
                </div>
                <div className="h-1 w-full rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full bg-foreground/60"
                    style={{
                      width: `${questions.length > 0 ? (reviewedQuestions / questions.length) * 100 : 0}%`,
                    }}
                  />
                </div>
              </div>

              <div className="py-2.5 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-foreground">Knowledge Base RAG</span>
                  <span className="font-metric text-muted-foreground tabular-nums">
                    {publishedKbDocs} / {kbDocs.length} published
                  </span>
                </div>
                <div className="h-1 w-full rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full bg-foreground/60"
                    style={{
                      width: `${kbDocs.length > 0 ? (publishedKbDocs / kbDocs.length) * 100 : 0}%`,
                    }}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-border/80 bg-card p-4">
            <h2 className="font-body text-sm font-semibold text-foreground">Evaluation calibration</h2>
            <p className="mt-1 font-body text-[11px] text-muted-foreground leading-relaxed">
              Verify Gemini multi-rubric evaluator alignment against human-graded placement interviews.
            </p>
            <div className="mt-3">
              <Link
                href="/app/golden-set"
                className="inline-flex items-center gap-1 font-body text-xs font-medium text-foreground underline-offset-4 hover:underline"
              >
                <span>Run Golden Set evaluation</span>
                <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
