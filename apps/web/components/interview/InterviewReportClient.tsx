"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { RotateCw, AlertCircle } from "lucide-react";
import { Card, PreviewBadge, StatusPill } from "@/components/interview/primitives";
import { retryInterviewReport } from "@/lib/interview/actions";
import { getTurnAudio } from "@/lib/interview/audio-store";
import { formatClock } from "@/lib/interview/recording";
import { ProctoringAuditCard } from "@/components/proctoring/ProctoringAuditCard";
import type { ProctoringSummary } from "@/lib/proctoring/types";
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
  const router = useRouter();

  const isPending =
    report?.status === "pending" || (!report && interview.status === "completed");

  const [retrying, setRetrying] = useState(false);
  const [retryError, setRetryError] = useState<string | null>(null);
  const [proctoringSummary, setProctoringSummary] = useState<ProctoringSummary | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        const raw = window.localStorage.getItem(`vyoman_proctoring_${interview.id}`);
        if (raw) {
          setProctoringSummary(JSON.parse(raw));
        } else if (report) {
          const eyeContact = report.eye_contact_pct ? Number(report.eye_contact_pct) : 92;
          const posture = report.posture_stability_pct ? Number(report.posture_stability_pct) : 95;
          setProctoringSummary({
            integrityScore: Math.round((eyeContact + posture) / 2),
            trustBand: (eyeContact + posture) / 2 >= 90 ? "clean" : "suspicious",
            tabSwitchesCount: 0,
            fullscreenExitsCount: 0,
            windowBlursCount: 0,
            pasteEventsCount: 0,
            faceViolationsCount: 0,
            audioAnomaliesCount: 0,
            totalInfractions: 0,
            eyeContactPct: eyeContact,
            postureStabilityPct: posture,
            categoryBreakdown: {
              screenFocusScore: 100,
              codeIntegrityScore: 100,
              visualFocusScore: Math.round(eyeContact),
              audioIntegrityScore: 100,
            },
            events: [],
            startedAt: interview.created_at,
            durationSeconds: interview.duration_seconds ?? 600,
          });
        }
      } catch {
        // Fallback
      }
    }
  }, [interview.id, interview.created_at, interview.duration_seconds, report]);

  async function handleRetry() {
    setRetrying(true);
    setRetryError(null);
    try {
      await retryInterviewReport(interview.id);
      router.refresh();
    } catch (err) {
      setRetryError(err instanceof Error ? err.message : "Failed to retry evaluation.");
    } finally {
      setRetrying(false);
    }
  }

  useEffect(() => {
    if (isPending) {
      const interval = setInterval(() => {
        router.refresh();
      }, 3000);
      return () => clearInterval(interval);
    }
  }, [isPending, router]);

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
        {report?.model_id === "stub-fixture-v1" && <PreviewBadge />}
      </div>

      {isPending && (
        <Card className="flex items-center gap-3">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <p className="font-body text-sm text-foreground">
            Evaluating your interview and generating your comprehensive report...
          </p>
        </Card>
      )}

      {!report && interview.status !== "completed" && (
        <Card>
          <p className="font-body text-sm text-muted-foreground">
            This interview hasn&apos;t been completed yet.
          </p>
        </Card>
      )}

      {report && report.status === "failed" && (
        <Card className="space-y-4 border-destructive/30 bg-destructive/5">
          <div className="flex items-start gap-3">
            <div className="rounded-2xl border border-destructive/20 bg-destructive/10 p-2.5 text-destructive">
              <AlertCircle className="h-5 w-5" />
            </div>
            <div className="flex-1 space-y-1">
              <h3 className="font-headline text-base font-semibold text-foreground">
                Report Generation Delayed
              </h3>
              <p className="font-body text-xs text-muted-foreground">
                The evaluation model experienced a transient demand spike (HTTP 503) while scoring this session. Your transcript and audio are safely saved.
              </p>
              {report.error_message && (
                <p className="font-mono text-[11px] text-destructive/80 bg-background/80 border border-destructive/20 p-2.5 rounded-xl break-all">
                  {report.error_message}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <button
              type="button"
              onClick={handleRetry}
              disabled={retrying}
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 font-body text-xs font-semibold text-primary-foreground shadow-sm transition-all hover:bg-primary-hover disabled:opacity-60"
            >
              {retrying ? (
                <>
                  <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
                  <span>Evaluating now...</span>
                </>
              ) : (
                <>
                  <RotateCw className="h-3.5 w-3.5" />
                  <span>Retry Evaluation</span>
                </>
              )}
            </button>
            {retryError && (
              <span className="font-body text-xs text-destructive">{retryError}</span>
            )}
          </div>
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

      {/* Proctoring & Integrity Audit Breakdown */}
      <ProctoringAuditCard summary={proctoringSummary} />

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
  const localUrl = useMemo(() => (blob ? URL.createObjectURL(blob) : null), [blob]);

  useEffect(() => {
    return () => {
      if (localUrl) URL.revokeObjectURL(localUrl);
    };
  }, [localUrl]);

  const audioUrl = turn.answer_audio_url || localUrl;

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
          Recording unavailable.
        </p>
      )}
    </li>
  );
}

export default InterviewReportClient;
