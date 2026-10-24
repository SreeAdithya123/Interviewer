import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { DIFFICULTY_LABELS, INTERVIEW_TYPE_LABELS, type Interview } from "@/lib/interview/types";
import { formatClock } from "@/lib/interview/recording";
import StatusBadge from "@/components/app-shell/StatusBadge";

export const metadata: Metadata = {
  title: "Interview history",
};

export default async function InterviewHistoryPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("interviews")
    .select("*")
    .order("created_at", { ascending: false });

  const interviews = (data ?? []) as Interview[];

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-headline text-2xl font-semibold tracking-tight text-foreground">
            Interview History
          </h1>
          <p className="mt-1 font-body text-sm text-muted-foreground">
            Record of completed and active AI mock interview sessions.
          </p>
        </div>

        <Link
          href="/app/interview"
          className="inline-flex h-9 items-center justify-center rounded-md bg-foreground px-4 font-body text-xs font-medium text-background transition-colors hover:bg-foreground/90"
        >
          + New interview
        </Link>
      </div>

      {interviews.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border/80 bg-card p-12 text-center">
          <p className="font-body text-xs text-muted-foreground">
            No interview sessions recorded yet. Start your first mock interview above.
          </p>
        </div>
      ) : (
        <div className="rounded-lg border border-border/80 bg-card divide-y divide-border/60">
          {interviews.map((interview) => (
            <HistoryRow key={interview.id} interview={interview} />
          ))}
        </div>
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
    <div className="flex flex-wrap items-center justify-between gap-3 p-4 transition-colors hover:bg-muted/30">
      <div>
        <p className="font-body text-xs font-medium text-foreground capitalize">
          {INTERVIEW_TYPE_LABELS[interview.interview_type]} Interview
          {interview.target_role ? ` · ${interview.target_role}` : ""}
        </p>
        <p className="mt-0.5 font-body text-[11px] text-muted-foreground">
          {DIFFICULTY_LABELS[interview.difficulty]} difficulty
          {interview.company_type ? ` · ${interview.company_type}` : ""} ·{" "}
          {new Date(interview.created_at).toLocaleDateString("en-IN", {
            year: "numeric",
            month: "short",
            day: "numeric",
          })}
          {interview.duration_seconds ? ` · ${formatClock(interview.duration_seconds)} duration` : ""}
        </p>
      </div>

      <div className="flex items-center gap-3">
        <StatusBadge status={interview.status} />
        {href && (
          <span className="font-body text-xs font-medium text-foreground underline-offset-4 group-hover:underline">
            {interview.status === "completed" ? "Report →" : "Resume →"}
          </span>
        )}
      </div>
    </div>
  );

  if (!href) return content;
  return (
    <Link href={href} className="group block">
      {content}
    </Link>
  );
}
