import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { DIFFICULTY_LABELS, INTERVIEW_TYPE_LABELS, type Interview } from "@/lib/interview/types";
import { formatClock } from "@/lib/interview/recording";

export const metadata: Metadata = {
  title: "Interview history",
};

const STATUS_LABEL: Record<Interview["status"], string> = {
  pending: "Not started",
  in_progress: "In progress",
  completed: "Completed",
  abandoned: "Abandoned",
};

// /app/history — BUILD_SPEC Part 4.5 step 9 / Part 4.1 nav ("student:
// Interview, Resume, Chat, History"). Reads the real `interviews` table;
// RLS already scopes this to the caller's own rows (or, for a
// college_admin/platform_admin, their college's/everyone's), so no
// explicit user_id filter is needed here.
export default async function InterviewHistoryPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("interviews")
    .select("*")
    .order("created_at", { ascending: false });

  const interviews = (data ?? []) as Interview[];

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-headline text-2xl font-semibold tracking-tight text-foreground">Interview history</h1>
        <Link href="/app/interview" className="btn-primary">
          New interview
        </Link>
      </div>

      {interviews.length === 0 ? (
        <p className="rounded-3xl border border-dashed border-border bg-card p-10 text-center font-body text-sm text-muted-foreground shadow-soft">
          No interviews yet. Start your first one above.
        </p>
      ) : (
        <ul className="space-y-3">
          {interviews.map((interview) => (
            <li key={interview.id}>
              <HistoryRow interview={interview} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function HistoryRow({ interview }: { interview: Interview }) {
  const href =
    interview.status === "completed"
      ? `/app/interview/${interview.id}/report`
      : interview.status === "abandoned"
        ? null
        : `/app/interview/${interview.id}`;

  const content = (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-card p-5 shadow-soft transition-colors hover:border-primary/40">
      <div>
        <p className="font-body text-sm font-medium text-foreground">
          {INTERVIEW_TYPE_LABELS[interview.interview_type]}
          {interview.target_role ? ` · ${interview.target_role}` : ""}
        </p>
        <p className="mt-1 font-body text-xs text-muted-foreground">
          {DIFFICULTY_LABELS[interview.difficulty]} difficulty
          {interview.company_type ? ` · ${interview.company_type}` : ""} ·{" "}
          {new Date(interview.created_at).toLocaleDateString("en-IN", {
            year: "numeric",
            month: "short",
            day: "numeric",
          })}
          {interview.duration_seconds ? ` · ${formatClock(interview.duration_seconds)}` : ""}
        </p>
      </div>
      <span className="font-body text-xs font-medium capitalize text-muted-foreground">
        {STATUS_LABEL[interview.status]}
      </span>
    </div>
  );

  if (!href) return content;
  return <Link href={href}>{content}</Link>;
}
