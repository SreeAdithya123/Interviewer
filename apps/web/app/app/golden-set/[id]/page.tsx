import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth/current-profile";
import { requireRole } from "@/lib/auth/require-role";
import { createClient } from "@/lib/supabase/server";
import type { GoldenSetRating, InterviewReportRow, InterviewRow, InterviewTurnRow, RubricScores } from "@/lib/types/db";
import { submitGoldenSetRating } from "../actions";

export const metadata: Metadata = {
  title: "Rate interview",
};

export const dynamic = "force-dynamic";

const DIMENSIONS: { key: keyof RubricScores; label: string; help: string }[] = [
  { key: "communication_clarity", label: "Communication clarity", help: "Clear, well-articulated answers" },
  { key: "answer_structure", label: "Answer structure", help: "Organized, e.g. situation → action → result" },
  { key: "technical_depth", label: "Technical depth", help: "Correctness and depth of technical content" },
  { key: "relevance", label: "Relevance", help: "Answers the question actually asked" },
  { key: "confidence_delivery", label: "Confidence & delivery", help: "Eye contact, posture, pacing, filler words" },
];

export default async function GoldenSetInterviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  requireRole(await getCurrentProfile(), ["platform_admin"]);
  const { id } = await params;

  const supabase = await createClient();

  const [
    { data: interview, error: interviewError },
    { data: turns },
    { data: existingRating },
    { data: reportMeta },
  ] = await Promise.all([
    supabase.from("interviews").select("*").eq("id", id).maybeSingle(),
    supabase.from("interview_turns").select("*").eq("interview_id", id).order("turn_number", { ascending: true }),
    supabase.from("golden_set_ratings").select("*").eq("interview_id", id).maybeSingle(),
    // id + prompt_version only — never scores — so the rating form can
    // link/tag against the AI report without the blind rater seeing its
    // scores before they submit their own.
    supabase.from("interview_reports").select("id, prompt_version").eq("interview_id", id).maybeSingle(),
  ]);

  if (interviewError) throw new Error(interviewError.message);
  if (!interview) notFound();

  const typedInterview = interview as InterviewRow;
  const typedTurns = (turns ?? []) as InterviewTurnRow[];
  const rating = existingRating as GoldenSetRating | null;
  const reportMetaTyped = reportMeta as { id: string; prompt_version: string | null } | null;

  // Full report (with scores) is only fetched — and only ever rendered —
  // once a rating already exists, so the AI's scores never leak into the
  // page while the human rater is still scoring blind.
  let report: InterviewReportRow | null = null;
  if (rating) {
    const { data } = await supabase.from("interview_reports").select("*").eq("interview_id", id).maybeSingle();
    report = data as InterviewReportRow | null;
  }

  return (
    <div className="max-w-3xl">
      <Link href="/app/golden-set" className="font-body text-sm text-muted-foreground hover:text-foreground">
        ← Golden set
      </Link>

      <h1 className="mt-3 text-2xl font-semibold text-foreground">
        {typedInterview.target_role ?? "Unspecified role"}{" "}
        <span className="font-body text-base capitalize text-muted-foreground">
          · {typedInterview.interview_type} · {typedInterview.difficulty}
        </span>
      </h1>

      <section className="mt-6 rounded-3xl border border-border bg-card p-6">
        <h2 className="font-headline text-lg text-foreground">Transcript</h2>
        {typedTurns.length === 0 ? (
          <p className="mt-3 font-body text-sm text-muted-foreground">No turns recorded for this interview.</p>
        ) : (
          <ol className="mt-4 space-y-5">
            {typedTurns.map((turn) => (
              <li key={turn.id} className="border-b border-border pb-4 last:border-0">
                <p className="font-body text-xs uppercase tracking-label text-muted-foreground">
                  {turn.stage.replace(/_/g, " ")} · Q{turn.turn_number}
                  {turn.is_follow_up ? " · follow-up" : ""}
                </p>
                <p className="mt-1 font-body text-sm font-medium text-foreground">{turn.question_text}</p>
                <p className="mt-1 font-body text-sm text-muted-foreground">
                  {turn.transcript ?? <em>No transcript recorded.</em>}
                </p>
              </li>
            ))}
          </ol>
        )}
      </section>

      {!rating ? (
        <form
          action={submitGoldenSetRating}
          className="mt-6 space-y-5 rounded-3xl border border-border bg-card p-6"
        >
          <input type="hidden" name="interview_id" value={typedInterview.id} />
          {reportMetaTyped?.id && <input type="hidden" name="interview_report_id" value={reportMetaTyped.id} />}
          {reportMetaTyped?.prompt_version && (
            <input type="hidden" name="prompt_version_compared" value={reportMetaTyped.prompt_version} />
          )}
          <h2 className="font-headline text-lg text-foreground">Your blind rating</h2>
          <p className="font-body text-sm text-muted-foreground">
            Score each dimension 1 (poor) to 5 (excellent), from the transcript above only. The
            AI&apos;s score is hidden until after you submit.
          </p>

          {DIMENSIONS.map((dim) => (
            <div key={dim.key}>
              <label htmlFor={dim.key} className="font-body text-sm font-medium text-foreground">
                {dim.label}
              </label>
              <p className="font-body text-xs text-muted-foreground">{dim.help}</p>
              <select
                id={dim.key}
                name={dim.key}
                required
                defaultValue="3"
                className="mt-1.5 w-32 rounded-xl border border-input bg-background px-3 py-2 font-body text-sm text-foreground outline-none focus:border-primary"
              >
                {[1, 2, 3, 4, 5].map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </div>
          ))}

          <div>
            <label htmlFor="rater_notes" className="font-body text-sm font-medium text-foreground">
              Notes (optional)
            </label>
            <textarea
              id="rater_notes"
              name="rater_notes"
              rows={3}
              className="mt-1.5 w-full rounded-2xl border border-input bg-background px-4 py-3 font-body text-sm text-foreground outline-none focus:border-primary"
            />
          </div>

          <button type="submit" className="btn-primary">
            Submit rating
          </button>
        </form>
      ) : (
        <section className="mt-6 grid gap-6 sm:grid-cols-2">
          <div className="rounded-3xl border border-border bg-card p-6">
            <h2 className="font-headline text-lg text-foreground">Your rating</h2>
            <RubricTable scores={rating.rubric_scores} />
            {rating.rater_notes && (
              <p className="mt-3 font-body text-sm text-muted-foreground">&ldquo;{rating.rater_notes}&rdquo;</p>
            )}
          </div>

          <div className="rounded-3xl border border-border bg-card p-6">
            <h2 className="font-headline text-lg text-foreground">AI evaluation</h2>
            {!report || report.status !== "completed" || !report.scores ? (
              <p className="mt-3 font-body text-sm text-muted-foreground">
                No completed AI report for this interview yet to compare against.
              </p>
            ) : (
              <>
                <RubricTable scores={report.scores as unknown as RubricScores} />
                <p className="mt-3 font-body text-xs text-muted-foreground">
                  Model: {report.model_id ?? "—"} · Prompt: {report.prompt_version ?? "—"}
                </p>
              </>
            )}
          </div>
        </section>
      )}
    </div>
  );
}

function RubricTable({ scores }: { scores: RubricScores }) {
  return (
    <table className="mt-3 w-full text-left font-body text-sm">
      <tbody>
        {DIMENSIONS.map((dim) => (
          <tr key={dim.key} className="border-b border-border last:border-0">
            <td className="py-2 text-muted-foreground">{dim.label}</td>
            <td className="py-2 text-right font-metric text-foreground">{scores[dim.key] ?? "—"}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
