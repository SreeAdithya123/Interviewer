import type { Metadata } from "next";
import Link from "next/link";
import { getCurrentProfile } from "@/lib/auth/current-profile";
import { requireRole } from "@/lib/auth/require-role";
import { createClient } from "@/lib/supabase/server";
import type { InterviewRow } from "@/lib/types/db";

export const metadata: Metadata = {
  title: "Golden set",
};

export const dynamic = "force-dynamic";

export default async function GoldenSetPage() {
  requireRole(await getCurrentProfile(), ["platform_admin"]);

  const supabase = await createClient();

  const [{ data: interviews, error }, { data: ratings }] = await Promise.all([
    supabase
      .from("interviews")
      .select("id, user_id, college_id, interview_type, target_role, difficulty, ended_at, status")
      .eq("status", "completed")
      .order("ended_at", { ascending: false })
      .limit(100),
    supabase.from("golden_set_ratings").select("interview_id"),
  ]);

  if (error) throw new Error(error.message);

  const ratedIds = new Set((ratings ?? []).map((r: { interview_id: string }) => r.interview_id));
  const rows = (interviews ?? []) as Pick<
    InterviewRow,
    "id" | "user_id" | "college_id" | "interview_type" | "target_role" | "difficulty" | "ended_at" | "status"
  >[];
  const unrated = rows.filter((r) => !ratedIds.has(r.id));
  const rated = rows.filter((r) => ratedIds.has(r.id));

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="font-headline text-2xl font-semibold tracking-tight text-foreground">
          Golden Set Calibration
        </h1>
        <p className="mt-1 font-body text-sm text-muted-foreground">
          Blind evaluator scoring across the five standard placement rubrics. Human scores are persisted prior to revealing AI evaluation outputs.
        </p>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border/80 bg-card p-10 text-center font-body text-xs text-muted-foreground">
          No completed interviews recorded in this sample window.
        </div>
      ) : (
        <div className="space-y-6">
          <section className="space-y-2.5">
            <h2 className="font-body text-sm font-semibold text-foreground">
              Awaiting blind human evaluation ({unrated.length})
            </h2>
            <div className="overflow-x-auto rounded-lg border border-border/80 bg-card divide-y divide-border/60">
              {unrated.length === 0 ? (
                <p className="p-5 font-body text-xs text-muted-foreground">
                  All sampled completed interviews have been rated.
                </p>
              ) : (
                unrated.map((interview) => (
                  <InterviewRowItem key={interview.id} interview={interview} rated={false} />
                ))
              )}
            </div>
          </section>

          <section className="space-y-2.5">
            <h2 className="font-body text-sm font-semibold text-foreground">
              Rated benchmark calibration records ({rated.length})
            </h2>
            <div className="overflow-x-auto rounded-lg border border-border/80 bg-card divide-y divide-border/60">
              {rated.length === 0 ? (
                <p className="p-5 font-body text-xs text-muted-foreground">No completed evaluations yet.</p>
              ) : (
                rated.map((interview) => (
                  <InterviewRowItem key={interview.id} interview={interview} rated />
                ))
              )}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

function InterviewRowItem({
  interview,
  rated,
}: {
  interview: Pick<InterviewRow, "id" | "interview_type" | "target_role" | "difficulty" | "ended_at">;
  rated: boolean;
}) {
  return (
    <div className="flex items-center justify-between p-4 transition-colors hover:bg-muted/30">
      <div>
        <p className="font-body text-xs font-medium text-foreground capitalize">
          {interview.target_role ?? "General practice"} ·{" "}
          <span className="text-muted-foreground">{interview.interview_type}</span> ·{" "}
          <span className="text-muted-foreground">{interview.difficulty}</span>
        </p>
        <p className="font-body text-[11px] text-muted-foreground">
          {interview.ended_at
            ? new Date(interview.ended_at).toLocaleString("en-IN", {
                month: "short",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })
            : "—"}
        </p>
      </div>
      <Link
        href={`/app/golden-set/${interview.id}`}
        className="font-body text-xs font-medium text-foreground underline-offset-4 hover:underline"
      >
        {rated ? "Review rating →" : "Rate blind →"}
      </Link>
    </div>
  );
}
