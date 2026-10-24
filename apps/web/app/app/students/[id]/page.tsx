import Link from "next/link";
import { requireCollegeAdmin } from "@/lib/auth/require-college-admin";
import { createClient } from "@/lib/supabase/server";
import { READINESS_LABEL, readinessBand } from "@/lib/readiness";
import { isStubReport } from "@/lib/ai-stubs/interview-engine";
import { cn } from "@/lib/utils";

interface StudentDetailPageProps {
  params: Promise<{ id: string }>;
}

interface StudentProfileRow {
  id: string;
  full_name: string | null;
  email: string;
  department: string | null;
  graduation_year: number | null;
  batch_id: string | null;
  batches: { name: string } | null;
}

const READINESS_BADGE_CLASS: Record<string, string> = {
  ready: "bg-emerald-50 text-emerald-900 border-emerald-200/60 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/40",
  developing: "bg-amber-50 text-amber-900 border-amber-200/60 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/40",
  needs_practice: "bg-rose-50 text-rose-900 border-rose-200/60 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800/40",
  not_yet_assessed: "bg-muted text-muted-foreground border-border/80",
};

export default async function StudentDetailPage({ params }: StudentDetailPageProps) {
  await requireCollegeAdmin();
  const { id } = await params;
  const supabase = await createClient();

  const { data: studentRow } = await supabase
    .from("profiles")
    .select("id, full_name, email, department, graduation_year, batch_id, batches(name)")
    .eq("id", id)
    .eq("role", "student")
    .maybeSingle();
  const student = studentRow as unknown as StudentProfileRow | null;

  if (!student) {
    return (
      <div className="max-w-2xl space-y-4">
        <Link href="/app/students" className="font-body text-xs text-muted-foreground hover:text-foreground">
          &larr; Back to students
        </Link>
        <p className="rounded-lg border border-border/80 bg-card p-6 font-body text-xs text-muted-foreground">
          No student found with this link. They may not exist, or may not be enrolled in your college.
        </p>
      </div>
    );
  }

  const [reportsRes, weakAreasRes, resumesRes] = await Promise.all([
    supabase
      .from("interview_reports")
      .select(
        `id, status, overall_score, strengths, weak_areas_summary, practice_actions, model_id, created_at,
         interviews(interview_type, target_role, company_type, difficulty, started_at, ended_at, duration_seconds, status)`,
      )
      .eq("user_id", id)
      .order("created_at", { ascending: false }),
    supabase
      .from("weak_areas")
      .select("id, skill, severity, is_resolved, notes, created_at")
      .eq("user_id", id)
      .order("created_at", { ascending: false }),
    supabase
      .from("resumes")
      .select("id, title, template, data, version, is_primary, updated_at")
      .eq("user_id", id)
      .order("is_primary", { ascending: false })
      .order("updated_at", { ascending: false }),
  ]);

  const reports = (reportsRes.data ?? []) as unknown as ReportRow[];
  const weakAreas = weakAreasRes.data ?? [];
  const resume = (resumesRes.data ?? [])[0] ?? null;

  const latestCompleted = reports.find((r) => r.status === "completed") ?? null;
  const band = readinessBand(latestCompleted?.overall_score != null ? Number(latestCompleted.overall_score) : null);
  const bandIsPreview = latestCompleted ? isStubReport(latestCompleted.model_id) : false;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <Link href="/app/students" className="font-body text-xs text-muted-foreground hover:text-foreground">
          &larr; Back to students
        </Link>
      </div>

      {/* Candidate Profile Header */}
      <div className="rounded-lg border border-border/80 bg-card p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="font-headline text-xl font-semibold tracking-tight text-foreground">
              {student.full_name ?? student.email}
            </h1>
            <p className="mt-0.5 font-body text-xs text-muted-foreground">{student.email}</p>
          </div>
          <span
            className={cn(
              "inline-flex items-center rounded border px-2 py-0.5 font-body text-xs font-medium leading-none capitalize",
              READINESS_BADGE_CLASS[band],
            )}
          >
            {READINESS_LABEL[band]}
            {bandIsPreview && (
              <span className="ml-1 text-[10px] text-amber-700 dark:text-amber-300">(preview)</span>
            )}
          </span>
        </div>

        <dl className="mt-4 grid grid-cols-2 gap-3 border-t border-border/60 pt-3 font-body text-xs sm:grid-cols-3">
          <Field label="Batch" value={student.batches?.name ?? "—"} />
          <Field label="Department" value={student.department ?? "—"} />
          <Field label="Graduation year" value={student.graduation_year ? String(student.graduation_year) : "—"} />
        </dl>
      </div>

      {/* Interview Reports Section */}
      <section className="rounded-lg border border-border/80 bg-card p-5">
        <h2 className="font-body text-sm font-semibold text-foreground">Interview reports</h2>
        <p className="font-body text-xs text-muted-foreground">Historical mock interviews and AI evaluations</p>

        {reports.length === 0 ? (
          <EmptyNote text="No interviews completed yet." />
        ) : (
          <div className="mt-4 space-y-3">
            {reports.map((report) => (
              <ReportCard key={report.id} report={report} />
            ))}
          </div>
        )}
      </section>

      {/* Weak Areas Section */}
      <section className="rounded-lg border border-border/80 bg-card p-5">
        <h2 className="font-body text-sm font-semibold text-foreground">Diagnostic weak skills</h2>
        <p className="font-body text-xs text-muted-foreground">Specific skills flagged during speech evaluation</p>

        {weakAreas.length === 0 ? (
          <EmptyNote text="No weak areas recorded yet." />
        ) : (
          <ul className="mt-3 divide-y divide-border/60">
            {weakAreas.map((area) => (
              <li key={area.id} className="py-2.5 flex items-center justify-between font-body text-xs">
                <div>
                  <p className="font-medium text-foreground">{area.skill}</p>
                  {area.notes && <p className="text-[11px] text-muted-foreground">{area.notes}</p>}
                </div>
                <span
                  className={cn(
                    "rounded px-1.5 py-0.5 text-[10px] font-medium uppercase border",
                    area.is_resolved
                      ? "bg-muted text-muted-foreground border-border/80"
                      : area.severity === "high"
                        ? "bg-rose-50 text-rose-900 border-rose-200/60 dark:bg-rose-950/40 dark:text-rose-300"
                        : "bg-amber-50 text-amber-900 border-amber-200/60 dark:bg-amber-950/40 dark:text-amber-300",
                  )}
                >
                  {area.is_resolved ? "resolved" : `${area.severity} priority`}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Resume Section */}
      <section className="rounded-lg border border-border/80 bg-card p-5">
        <h2 className="font-body text-sm font-semibold text-foreground">Resume profile</h2>
        <p className="font-body text-xs text-muted-foreground">Stored resume content and ATS data</p>

        {!resume ? (
          <EmptyNote text="This student hasn't built or uploaded a resume yet." />
        ) : (
          <ResumeView resume={resume} />
        )}
      </section>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[11px] font-medium text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 font-medium text-foreground">{value}</dd>
    </div>
  );
}

function EmptyNote({ text }: { text: string }) {
  return (
    <p className="mt-3 rounded border border-dashed border-border/80 bg-background px-4 py-6 text-center font-body text-xs text-muted-foreground">
      {text}
    </p>
  );
}

interface ReportInterview {
  interview_type: string;
  target_role: string | null;
  company_type: string | null;
  difficulty: string;
  started_at: string | null;
  ended_at: string | null;
  duration_seconds: number | null;
  status: string;
}

interface ReportRow {
  id: string;
  status: "pending" | "completed" | "failed";
  overall_score: number | null;
  strengths: unknown;
  weak_areas_summary: unknown;
  practice_actions: unknown;
  model_id: string | null;
  created_at: string;
  interviews: ReportInterview | null;
}

function ReportCard({ report }: { report: ReportRow }) {
  const interview = report.interviews;
  const strengths = Array.isArray(report.strengths) ? (report.strengths as string[]) : [];
  const practiceActions = Array.isArray(report.practice_actions) ? (report.practice_actions as string[]) : [];

  return (
    <div className="rounded border border-border/80 bg-background p-3.5 space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-body text-xs font-medium text-foreground capitalize">
          {interview?.interview_type ? capitalize(interview.interview_type) : "Interview"}
          {interview?.target_role ? ` · ${interview.target_role}` : ""}
        </p>
        <span className="font-body text-[11px] capitalize text-muted-foreground">{report.status}</span>
      </div>

      <p className="font-body text-[11px] text-muted-foreground">
        {new Date(report.created_at).toLocaleDateString("en-IN", {
          year: "numeric",
          month: "short",
          day: "numeric",
        })}
        {interview?.duration_seconds ? ` · ${Math.round(interview.duration_seconds / 60)}m duration` : ""}
      </p>

      {report.status === "completed" && (
        <>
          <div className="flex items-baseline gap-2 pt-1">
            <span className="font-body text-xs text-muted-foreground">Overall Score:</span>
            <span className="font-metric text-lg font-semibold text-foreground tabular-nums">
              {report.overall_score !== null ? Number(report.overall_score).toFixed(0) : "—"}
            </span>
            <span className="font-body text-xs text-muted-foreground">/ 100</span>
          </div>

          {strengths.length > 0 && (
            <div className="pt-1">
              <p className="font-body text-[11px] font-medium text-muted-foreground">Strengths</p>
              <ul className="mt-0.5 list-inside list-disc font-body text-xs text-foreground">
                {strengths.map((item, i) => (
                  <li key={i}>{String(item)}</li>
                ))}
              </ul>
            </div>
          )}

          {practiceActions.length > 0 && (
            <div className="pt-1">
              <p className="font-body text-[11px] font-medium text-muted-foreground">Practice actions</p>
              <ul className="mt-0.5 list-inside list-disc font-body text-xs text-foreground">
                {practiceActions.map((item, i) => (
                  <li key={i}>{String(item)}</li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}

      {report.status === "pending" && (
        <p className="font-body text-xs text-muted-foreground">Report evaluation in progress.</p>
      )}
    </div>
  );
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

interface ResumeRow {
  id: string;
  title: string;
  template: string;
  data: unknown;
  version: number;
  is_primary: boolean;
  updated_at: string;
}

function ResumeView({ resume }: { resume: ResumeRow }) {
  const data = (resume.data ?? {}) as Record<string, unknown>;
  const basics = isRecord(data.basics) ? data.basics : null;
  const work = Array.isArray(data.work) ? (data.work as Record<string, unknown>[]) : [];
  const education = Array.isArray(data.education) ? (data.education as Record<string, unknown>[]) : [];
  const skills = Array.isArray(data.skills) ? (data.skills as Record<string, unknown>[]) : [];
  const hasContent = basics || work.length > 0 || education.length > 0 || skills.length > 0;

  return (
    <div className="mt-3 space-y-3 font-body text-xs">
      <p className="text-muted-foreground">
        {resume.title} · template: {resume.template} · v{resume.version}
        {resume.is_primary ? " · primary resume" : ""}
      </p>

      {!hasContent && <EmptyNote text="This student hasn't populated resume fields yet." />}

      {basics && (
        <div>
          {typeof basics.name === "string" && (
            <p className="font-medium text-foreground">{basics.name}</p>
          )}
          {typeof basics.summary === "string" && (
            <p className="mt-0.5 text-muted-foreground leading-relaxed">{basics.summary}</p>
          )}
        </div>
      )}

      {work.length > 0 && (
        <div>
          <p className="font-medium text-muted-foreground text-[11px]">Experience</p>
          <ul className="mt-1 space-y-1">
            {work.map((entry, i) => (
              <li key={i} className="text-foreground">
                <span className="font-medium">{String(entry.position ?? "")}</span>
                {entry.name ? ` at ${String(entry.name)}` : ""}
              </li>
            ))}
          </ul>
        </div>
      )}

      {skills.length > 0 && (
        <div>
          <p className="font-medium text-muted-foreground text-[11px]">Skills</p>
          <p className="mt-0.5 text-foreground">
            {skills.map((entry) => String(entry.name ?? "")).join(", ")}
          </p>
        </div>
      )}
    </div>
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
