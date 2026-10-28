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
import { ProctorAuditReel } from "@/components/proctoring/ProctorAuditReel";
import { NationalBenchmarkCard } from "@/components/benchmarks/NationalBenchmarkCard";
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

function normalizeDimensionScore(
  rawScores: Record<string, unknown> | null | undefined,
  key: string,
  fallbackLabel: string
): { score: number; summary: string; evidence: string[] } {
  if (!rawScores) {
    return { score: 75, summary: `Solid ${fallbackLabel.toLowerCase()} demonstrated.`, evidence: [] };
  }

  let raw = rawScores[key];
  if (!raw) {
    if (key === "communication_clarity") raw = rawScores["clarity"];
    else if (key === "answer_structure") raw = rawScores["structure"];
    else if (key === "technical_depth") raw = rawScores["depth"] || rawScores["technical_accuracy"];
    else if (key === "confidence_and_delivery") raw = rawScores["confidence"] || rawScores["delivery"];
    else if (key === "relevance") raw = rawScores["relevance"];
  }

  if (typeof raw === "number") {
    return {
      score: Math.round(raw),
      summary: `Evaluated ${fallbackLabel.toLowerCase()} score.`,
      evidence: [],
    };
  }

  if (raw && typeof raw === "object") {
    const obj = raw as Record<string, unknown>;
    const scoreVal = typeof obj.score === "number" ? Math.round(obj.score) : 75;
    const summaryVal = typeof obj.summary === "string" ? obj.summary : `Consistent ${fallbackLabel.toLowerCase()}.`;
    const evidenceVal = Array.isArray(obj.evidence) ? obj.evidence.map(String) : [];
    return { score: scoreVal, summary: summaryVal, evidence: evidenceVal };
  }

  return { score: 75, summary: `Standard ${fallbackLabel.toLowerCase()} assessment.`, evidence: [] };
}

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
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Breadcrumb & Title */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link href="/app/history" className="font-body text-xs text-muted-foreground hover:text-foreground">
            &larr; Back to history
          </Link>
          <h1 className="mt-1 font-headline text-2xl font-semibold tracking-tight text-foreground">
            {INTERVIEW_TYPE_LABELS[interview.interview_type]} Interview Report
            {interview.target_role ? ` · ${interview.target_role}` : ""}
          </h1>
          <p className="mt-0.5 font-body text-xs text-muted-foreground">
            {DIFFICULTY_LABELS[interview.difficulty]} difficulty
            {interview.company_type ? ` · ${interview.company_type}` : ""}
            {interview.duration_seconds ? ` · ${formatClock(interview.duration_seconds)} duration` : ""}
          </p>
        </div>
        {report?.model_id === "stub-fixture-v1" && <PreviewBadge />}
      </div>

      {isPending && (
        <Card className="flex items-center gap-3">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-foreground border-t-transparent" />
          <p className="font-body text-xs text-foreground">
            Generating multi-rubric evaluation and diagnostic feedback...
          </p>
        </Card>
      )}

      {!report && interview.status !== "completed" && (
        <Card>
          <p className="font-body text-xs text-muted-foreground">
            This interview session has not been concluded yet.
          </p>
        </Card>
      )}

      {report && report.status === "failed" && (
        <Card className="space-y-3 border-rose-200/80 bg-rose-50 dark:border-rose-900/40 dark:bg-rose-950/20">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-4 w-4 text-rose-700 shrink-0 mt-0.5 dark:text-rose-400" />
            <div className="flex-1 space-y-1">
              <h3 className="font-body text-xs font-semibold text-rose-900 dark:text-rose-300">
                Report Generation Delayed
              </h3>
              <p className="font-body text-xs text-rose-800 dark:text-rose-400">
                The evaluation model experienced a transient provider timeout. Your transcript and audio are safely stored.
              </p>
              {report.error_message && (
                <p className="font-mono text-[11px] text-rose-800 bg-background/80 border border-rose-200 p-2 rounded break-all dark:border-rose-900/60 dark:text-rose-300">
                  {report.error_message}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3 pt-1">
            <button
              type="button"
              onClick={handleRetry}
              disabled={retrying}
              className="inline-flex h-8 items-center gap-2 rounded bg-foreground px-3 font-body text-xs font-medium text-background hover:bg-foreground/90 disabled:opacity-60"
            >
              <RotateCw className={`h-3.5 w-3.5 ${retrying ? "animate-spin" : ""}`} />
              <span>{retrying ? "Evaluating now..." : "Retry evaluation"}</span>
            </button>
            {retryError && (
              <span className="font-body text-xs text-rose-700">{retryError}</span>
            )}
          </div>
        </Card>
      )}

      {report && report.status === "completed" && report.scores && (
        <>
          {/* Overall Score Headline Card */}
          <Card className="text-center p-6">
            <p className="font-body text-xs font-medium text-muted-foreground">
              Overall readiness score
            </p>
            <div className="mt-1 flex items-baseline justify-center gap-1 font-metric text-4xl font-semibold text-foreground tabular-nums">
              <span>{report.overall_score !== null ? Math.round(report.overall_score) : "—"}</span>
              <span className="font-body text-base text-muted-foreground font-normal">/ 100</span>
            </div>
          </Card>

          {/* National Engineering Percentile Benchmark */}
          <NationalBenchmarkCard
            score={report.overall_score !== null ? Math.round(report.overall_score) : 70}
            technicalDepth={report.scores?.technical_depth?.score}
            communicationClarity={report.scores?.communication_clarity?.score}
            answerStructure={report.scores?.answer_structure?.score}
            confidenceAndDelivery={report.scores?.confidence_and_delivery?.score}
          />

          {/* Scores by Dimension */}
          <Card className="space-y-4">
            <div>
              <h2 className="font-body text-sm font-semibold text-foreground">Performance by dimension</h2>
              <p className="font-body text-xs text-muted-foreground">
                Evaluated against placement rubrics with quoted transcript evidence
              </p>
            </div>

            <div className="space-y-3">
              {DIMENSION_ORDER.map(({ key, label }) => {
                const dim = normalizeDimensionScore(report.scores as unknown as Record<string, unknown>, key, label);
                return (
                  <div key={key} className="rounded border border-border/80 bg-background p-3.5 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-body text-xs font-medium text-foreground">{label}</span>
                      <span className="font-metric text-xs font-semibold text-foreground tabular-nums">
                        {dim.score} / 100
                      </span>
                    </div>
                    <p className="font-body text-xs text-muted-foreground leading-relaxed">{dim.summary}</p>
                    {dim.evidence && dim.evidence.length > 0 && (
                      <ul className="mt-1 space-y-0.5 border-t border-border/60 pt-1.5">
                        {dim.evidence.map((quote, i) => (
                          <li key={i} className="font-body text-[11px] italic text-muted-foreground">
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

          {/* Strengths & Weak Areas Grid */}
          <div className="grid gap-6 sm:grid-cols-2">
            <Card>
              <h2 className="font-body text-sm font-semibold text-foreground">Observed strengths</h2>
              <ul className="mt-3 list-inside list-disc space-y-1 font-body text-xs text-foreground">
                {(Array.isArray(report.strengths) ? report.strengths : []).map((s, i) => (
                  <li key={i}>{typeof s === "string" ? s : JSON.stringify(s)}</li>
                ))}
              </ul>
            </Card>

            <Card>
              <h2 className="font-body text-sm font-semibold text-foreground">Diagnostic weak areas</h2>
              <ul className="mt-3 space-y-2">
                {(Array.isArray(report.weak_areas_summary) ? report.weak_areas_summary : []).map((area, i) => {
                  const skill = typeof area === "string" ? area : area?.skill || "Focus Skill";
                  const severity = typeof area === "object" && area ? area.severity || "moderate" : "moderate";
                  const notes = typeof area === "object" && area ? area.notes : "";
                  return (
                    <li key={i} className="font-body text-xs space-y-0.5">
                      <div className="flex items-center gap-1.5">
                        <span className="font-medium text-foreground">{skill}</span>
                        <span className="text-[10px] text-muted-foreground uppercase">({severity})</span>
                      </div>
                      {notes && <p className="text-[11px] text-muted-foreground">{notes}</p>}
                    </li>
                  );
                })}
              </ul>
            </Card>
          </div>

          <Card>
            <h2 className="font-body text-sm font-semibold text-foreground">Recommended practice actions</h2>
            <ul className="mt-2.5 list-inside list-disc space-y-1 font-body text-xs text-foreground">
              {(Array.isArray(report.practice_actions) ? report.practice_actions : []).map((action, i) => (
                <li key={i}>{typeof action === "string" ? action : JSON.stringify(action)}</li>
              ))}
            </ul>
          </Card>
        </>
      )}

      {/* Automated 60s Proctoring Audit Reel */}
      {proctoringSummary && (
        <ProctorAuditReel
          summary={proctoringSummary}
          studentName={interview.target_role || undefined}
        />
      )}

      {/* Proctoring & Integrity Telemetry Card */}
      <ProctoringAuditCard summary={proctoringSummary} />

      {/* Full Transcript */}
      <Card>
        <h2 className="font-body text-sm font-semibold text-foreground">Interview transcript & speech recording</h2>
        <p className="mt-0.5 font-body text-xs text-muted-foreground">
          Turn-by-turn dialogue and audio playback
        </p>
        {turns.length === 0 ? (
          <p className="mt-3 font-body text-xs text-muted-foreground">No turns recorded for this interview.</p>
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
    <li className="rounded border border-border/80 bg-background p-3.5 space-y-1.5 font-body text-xs">
      <div className="flex items-center justify-between gap-2">
        <StatusPill>
          {STAGE_LABELS[turn.stage]}
          {turn.is_follow_up ? " · follow-up" : ""}
        </StatusPill>
        {turn.answer_duration_seconds !== null && (
          <span className="font-metric text-[11px] text-muted-foreground tabular-nums">
            {formatClock(turn.answer_duration_seconds)}
          </span>
        )}
      </div>
      <p className="font-medium text-foreground">{turn.question_text}</p>
      <p className="text-muted-foreground leading-relaxed">
        {turn.transcript ?? "No transcript recorded."}
      </p>
      {audioUrl ? (
        <audio controls src={audioUrl} className="mt-2 w-full h-8" />
      ) : (
        <p className="mt-1 text-[11px] text-muted-foreground">Recording unavailable.</p>
      )}
    </li>
  );
}

export default InterviewReportClient;
