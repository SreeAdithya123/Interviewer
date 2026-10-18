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
    <div className="max-w-4xl">
      <h1 className="text-2xl font-semibold text-foreground">Golden set</h1>
      <p className="mt-1 font-body text-sm text-muted-foreground">
        Score a sampled interview blind, on the same five-dimension rubric the AI evaluation uses
        (docs/BUILD_SPEC.md Part 4.8). Your score is saved before the AI&apos;s is shown, so it stays
        blind.
      </p>

      {rows.length === 0 ? (
        <p className="mt-6 rounded-2xl bg-accent/10 px-4 py-3 font-body text-sm text-foreground">
          No completed interviews yet — this fills in once Phase 1 interviews start running.
        </p>
      ) : (
        <>
          <h2 className="mt-6 font-headline text-lg text-foreground">Awaiting a rating ({unrated.length})</h2>
          <div className="mt-3 divide-y divide-border rounded-3xl border border-border bg-card">
            {unrated.length === 0 ? (
              <p className="p-6 font-body text-sm text-muted-foreground">
                Every sampled completed interview already has a rating.
              </p>
            ) : (
              unrated.map((interview) => <InterviewRowItem key={interview.id} interview={interview} rated={false} />)
            )}
          </div>

          <h2 className="mt-8 font-headline text-lg text-foreground">Already rated ({rated.length})</h2>
          <div className="mt-3 divide-y divide-border rounded-3xl border border-border bg-card">
            {rated.length === 0 ? (
              <p className="p-6 font-body text-sm text-muted-foreground">None yet.</p>
            ) : (
              rated.map((interview) => <InterviewRowItem key={interview.id} interview={interview} rated />)
            )}
          </div>
        </>
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
    <div className="flex items-center justify-between px-6 py-4">
      <div>
        <p className="font-body text-sm text-foreground">
          {interview.target_role ?? "Unspecified role"} ·{" "}
          <span className="capitalize text-muted-foreground">{interview.interview_type}</span> ·{" "}
          <span className="capitalize text-muted-foreground">{interview.difficulty}</span>
        </p>
        <p className="font-body text-xs text-muted-foreground">
          {interview.ended_at ? new Date(interview.ended_at).toLocaleString("en-IN") : "—"}
        </p>
      </div>
      <Link
        href={`/app/golden-set/${interview.id}`}
        className={rated ? "font-body text-sm text-muted-foreground hover:underline" : "font-body text-sm font-medium text-primary hover:underline"}
      >
        {rated ? "View rating" : "Rate blind →"}
      </Link>
    </div>
  );
}
