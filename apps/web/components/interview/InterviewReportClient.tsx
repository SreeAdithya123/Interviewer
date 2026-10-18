"use client";

import { useEffect, useMemo } from "react";
import Link from "next/link";
import { Card, PreviewBadge, StatusPill } from "@/components/interview/primitives";
import { getTurnAudio } from "@/lib/interview/audio-store";
import { formatClock } from "@/lib/interview/recording";
import {
  DIFFICULTY_LABELS,
  INTERVIEW_TYPE_LABELS,
  STAGE_LABELS,
  type Interview,
  type InterviewReport,
  type InterviewTurn,
  type ReportScores,
} from "@/lib/interview/types";

const DIMENSION_ORDER: { key: keyof ReportScores; label: string }[] = [
  { key: "communication_clarity", label: "Communication clarity" },
  { key: "answer_structure", label: "Answer structure" },
  { key: "technical_depth", label: "Technical depth" },
  { key: "relevance", label: "Relevance" },
  { key: "confidence_and_delivery", label: "Confidence and delivery" },
];

export function InterviewReportClient({
  interview,
  report,
  turns,
}: {
  interview: Interview;
  report: InterviewReport | null;
  turns: InterviewTurn[];
}) {
  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link href="/app/history" className="font-body text-sm text-muted-foreground hover:text-foreground">
            &larr; Back to history
          </Link>
          <h1 className="mt-2 font-headline text-2xl font-semibold tracking-tight text-foreground">
            {INTERVIEW_TYPE_LABELS[interview.interview_type]} interview report
            {interview.target_role ? ` · ${interview.target_role}` : ""}
          </h1>
          <p className="mt-1 font-body text-sm text-muted-foreground">
            {DIFFICULTY_LABELS[interview.difficulty]} difficulty
            {interview.company_type ? ` · ${interview.company_type}` : ""}
            {interview.duration_seconds ? ` · ${formatClock(interview.duration_seconds)} total` : ""}
          </p>
        </div>
        <PreviewBadge />
      </div>

      {!report && (
        <Card>
          <p className="font-body text-sm text-muted-foreground">
            {interview.status === "completed"
              ? "This interview finished, but its report hasn't been generated yet."
              : "This interview hasn't been completed yet."}
          </p>
        </Card>
      )}

      {report && report.status === "failed" && (
        <Card>
          <p className="font-body text-sm text-destructive">
            Report generation failed{report.error_message ? `: ${report.error_message}` : "."}
          </p>
        </Card>
      )}

      {report && report.status === "completed" && report.scores && (
        <>
          <Card className="text-center">
            <p className="font-body text-xs font-medium uppercase tracking-label text-muted-foreground">
              Overall score (preview)
            </p>
            <p className="mt-2 font-metric text-5xl text-foreground">
              {report.overall_score !== null ? Math.round(report.overall_score) : "—"}
              <span className="text-xl text-muted-foreground">/100</span>
            </p>
          </Card>

          <Card>
            <h2 className="font-headline text-lg font-semibold text-foreground">Scores by dimension</h2>
            <p className="mt-1 font-body text-xs text-muted-foreground">
              Evidence quotes below come from this interview&apos;s preview transcripts, not a real evaluation model.
            </p>
            <div className="mt-4 space-y-4">
              {DIMENSION_ORDER.map(({ key, label }) => {
                const dim = report.scores![key];
                return (
                  <div key={key} className="rounded-2xl border border-border bg-background p-4">
                    <div className="flex items-center justify-between gap-3">
                      <span className="font-body text-sm font-medium text-foreground">{label}</span>
                      <span className="font-metric text-sm text-foreground">{dim.score}/100</span>
                    </div>
                    <p className="mt-1 font-body text-sm text-muted-foreground">{dim.summary}</p>
                    {dim.evidence.length > 0 && (
                      <ul className="mt-2 space-y-1">
                        {dim.evidence.map((quote, i) => (
                          <li key={i} className="font-body text-xs italic text-muted-foreground">
                            &ldquo;{quote}&rdquo;
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                );
              })}
            </div>
          </Card>

          <div className="grid gap-6 sm:grid-cols-2">
            <Card>
              <h2 className="font-headline text-lg font-semibold text-foreground">Strengths</h2>
              <ul className="mt-3 list-inside list-disc space-y-1 font-body text-sm text-foreground">
                {report.strengths.map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ul>
            </Card>

            <Card>
              <h2 className="font-headline text-lg font-semibold text-foreground">Weak areas</h2>
              <ul className="mt-3 space-y-2">
                {report.weak_areas_summary.map((area, i) => (
                  <li key={i} className="font-body text-sm text-foreground">
                    <span className="font-medium">{area.skill}</span>{" "}
                    <span className="text-xs capitalize text-muted-foreground">({area.severity})</span>
                    <p className="text-xs text-muted-foreground">{area.notes}</p>
                  </li>
                ))}
              </ul>
            </Card>
          </div>

          <Card>
            <h2 className="font-headline text-lg font-semibold text-foreground">Recommended next practice</h2>
            <ul className="mt-3 list-inside list-disc space-y-1 font-body text-sm text-foreground">
              {report.practice_actions.map((action, i) => (
                <li key={i}>{action}</li>
              ))}
            </ul>
          </Card>
        </>
      )}

      <Card>
        <h2 className="font-headline text-lg font-semibold text-foreground">Full transcript</h2>
        <p className="mt-1 font-body text-xs text-muted-foreground">
          Transcript text is preview sample content, not a real transcription of your recording. Audio playback
          below is your real recording, available only for this browser tab until you reload the page (there&apos;s no
          audio upload wired up yet).
        </p>
        {turns.length === 0 ? (
          <p className="mt-4 font-body text-sm text-muted-foreground">No turns recorded for this interview.</p>
        ) : (
          <ol className="mt-4 space-y-3">
            {turns.map((turn) => (
              <TranscriptTurn key={turn.id} interviewId={interview.id} turn={turn} />
            ))}
          </ol>
        )}
      </Card>
    </div>
  );
}

function TranscriptTurn({ interviewId, turn }: { interviewId: string; turn: InterviewTurn }) {
  const blob = useMemo(() => getTurnAudio(interviewId, turn.turn_number), [interviewId, turn.turn_number]);
  // Derived synchronously from `blob` (itself memoized) rather than via
  // setState-in-an-effect, so there's no extra render pass; the effect
  // below only handles the one genuinely side-effectful part (freeing the
  // blob URL), not state assignment.
  const audioUrl = useMemo(() => (blob ? URL.createObjectURL(blob) : null), [blob]);

  useEffect(() => {
    return () => {
      if (audioUrl) URL.revokeObjectURL(audioUrl);
    };
  }, [audioUrl]);

  return (
    <li className="rounded-2xl border border-border bg-background p-4">
      <div className="flex items-center justify-between gap-2">
        <StatusPill>
          {STAGE_LABELS[turn.stage]}
          {turn.is_follow_up ? " · follow-up" : ""}
        </StatusPill>
        {turn.answer_duration_seconds !== null && (
          <span className="font-metric text-xs text-muted-foreground">
            {formatClock(turn.answer_duration_seconds)}
          </span>
        )}
      </div>
      <p className="mt-2 font-body text-sm font-medium text-foreground">{turn.question_text}</p>
      <p className="mt-1 font-body text-sm text-muted-foreground">
        {turn.transcript ?? "No transcript recorded."}
      </p>
      {audioUrl ? (
        <audio controls src={audioUrl} className="mt-3 w-full" />
      ) : (
        <p className="mt-3 font-body text-xs text-muted-foreground">
          Recording unavailable (not from this browser tab, or the page was reloaded).
        </p>
      )}
    </li>
  );
}

export default InterviewReportClient;
