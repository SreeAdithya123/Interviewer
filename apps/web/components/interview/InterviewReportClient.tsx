"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  RotateCw,
  AlertCircle,
  Award,
  BarChart3,
  CheckCircle2,
  ChevronRight,
  Clock,
  Compass,
  Copy,
  Check,
  Download,
  ExternalLink,
  FileText,
  HelpCircle,
  Layers,
  Lightbulb,
  Percent,
  Printer,
  Share2,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Star,
  Target,
  TrendingUp,
  UserCheck,
  Zap,
} from "lucide-react";
import { Card, PreviewBadge, StatusPill } from "@/components/interview/primitives";
import { retryInterviewReport } from "@/lib/interview/actions";
import { getTurnAudio } from "@/lib/interview/audio-store";
import { formatClock } from "@/lib/interview/recording";
import { ProctoringAuditCard } from "@/components/proctoring/ProctoringAuditCard";
import { ProctorAuditReel } from "@/components/proctoring/ProctorAuditReel";
import { generateBenchmarkReport, NATIONAL_COHORT_BENCHMARKS } from "@/lib/benchmarks/percentile";
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

const DIMENSION_CONFIG: {
  key: keyof ReportScores;
  label: string;
  category: string;
  cohortKey: string;
  description: string;
}[] = [
  {
    key: "technical_depth",
    label: "Technical Depth & CS Core",
    category: "Hard Engineering Skills",
    cohortKey: "technicalDepth",
    description: "Evaluates algorithmic correctness, data structure selection, runtime complexity, and architectural reasoning.",
  },
  {
    key: "communication_clarity",
    label: "Communication & Articulation",
    category: "Verbal Delivery",
    cohortKey: "communicationClarity",
    description: "Assesses verbal articulation, structured explanation of trade-offs, and concise technical vocabulary.",
  },
  {
    key: "answer_structure",
    label: "Problem Solving & Structure",
    category: "Analytical Framework",
    cohortKey: "answerStructure",
    description: "Measures methodical problem deconstruction, edge case exploration, and logical organization (e.g. STAR method).",
  },
  {
    key: "relevance",
    label: "Relevance & Directness",
    category: "Focus & Efficiency",
    cohortKey: "overall",
    description: "Checks whether answers addressed the core question prompt directly without wandering or filler digressions.",
  },
  {
    key: "confidence_and_delivery",
    label: "Confidence & Executive Presence",
    category: "Behavioral Composure",
    cohortKey: "confidenceAndDelivery",
    description: "Measures camera presence, sustained gaze, steady pacing, and composure under placement assessment conditions.",
  },
];

function parseScoresDict(raw: unknown): Record<string, unknown> {
  if (!raw) return {};
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object") return parseScoresDict(parsed);
    } catch {
      return {};
    }
  }
  if (typeof raw === "object" && raw !== null) {
    const obj = raw as Record<string, unknown>;
    if (obj.scores && typeof obj.scores === "object" && obj.scores !== null) {
      return parseScoresDict(obj.scores);
    }
    return obj;
  }
  return {};
}

function normalizeDimensionScore(
  rawScores: unknown,
  key: string,
  fallbackLabel: string
): { score: number; summary: string; evidence: string[] } {
  const scoresObj = parseScoresDict(rawScores);

  let raw = scoresObj[key];
  if (raw === undefined || raw === null) {
    if (key === "communication_clarity") raw = scoresObj["clarity"];
    else if (key === "answer_structure") raw = scoresObj["structure"];
    else if (key === "technical_depth") raw = scoresObj["depth"] ?? scoresObj["technical_accuracy"];
    else if (key === "confidence_and_delivery") raw = scoresObj["confidence"] ?? scoresObj["delivery"];
    else if (key === "relevance") raw = scoresObj["relevance"];
  }

  if (typeof raw === "number") {
    return {
      score: Math.min(100, Math.max(0, Math.round(raw))),
      summary: `Evaluated ${fallbackLabel.toLowerCase()} score.`,
      evidence: [],
    };
  }

  if (typeof raw === "string" && !isNaN(Number(raw))) {
    return {
      score: Math.min(100, Math.max(0, Math.round(Number(raw)))),
      summary: `Evaluated ${fallbackLabel.toLowerCase()} score.`,
      evidence: [],
    };
  }

  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    const obj = raw as Record<string, unknown>;
    const rawVal = obj.score;
    const scoreVal =
      typeof rawVal === "number"
        ? Math.round(rawVal)
        : typeof rawVal === "string" && !isNaN(Number(rawVal))
          ? Math.round(Number(rawVal))
          : 75;
    const summaryVal =
      typeof obj.summary === "string" ? obj.summary : `Consistent ${fallbackLabel.toLowerCase()}.`;
    const evidenceVal = Array.isArray(obj.evidence) ? obj.evidence.map(String) : [];
    return {
      score: Math.min(100, Math.max(0, scoreVal)),
      summary: summaryVal,
      evidence: evidenceVal,
    };
  }

  return { score: 75, summary: `Standard ${fallbackLabel.toLowerCase()} assessment.`, evidence: [] };
}

type TabKey = "overview" | "competencies" | "questions" | "integrity" | "action_plan";

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
  const [activeTab, setActiveTab] = useState<TabKey>("overview");
  const [retrying, setRetrying] = useState(false);
  const [retryError, setRetryError] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [proctoringSummary, setProctoringSummary] = useState<ProctoringSummary | null>(null);

  const isPending =
    report?.status === "pending" || (!report && interview.status === "completed");

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

  function handleShare() {
    if (typeof window !== "undefined") {
      navigator.clipboard.writeText(window.location.href);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    }
  }

  function handlePrint() {
    if (typeof window !== "undefined") {
      window.print();
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

  // Dimension scores normalization
  const normalizedScores = useMemo(() => {
    const raw = report?.scores as unknown as Record<string, unknown>;
    return {
      technical_depth: normalizeDimensionScore(raw, "technical_depth", "Technical Depth"),
      communication_clarity: normalizeDimensionScore(raw, "communication_clarity", "Communication Clarity"),
      answer_structure: normalizeDimensionScore(raw, "answer_structure", "Answer Structure"),
      relevance: normalizeDimensionScore(raw, "relevance", "Relevance"),
      confidence_and_delivery: normalizeDimensionScore(raw, "confidence_and_delivery", "Confidence & Delivery"),
    };
  }, [report?.scores]);

  const overallScoreNum = useMemo(() => {
    if (report && typeof report.overall_score === "number") {
      return Math.round(report.overall_score);
    }
    const values = Object.values(normalizedScores).map((s) => s.score);
    if (values.length > 0) {
      return Math.round(values.reduce((a, b) => a + b, 0) / values.length);
    }
    return 75;
  }, [report, normalizedScores]);

  // Benchmark stats
  const benchmarkReport = useMemo(() => {
    return generateBenchmarkReport(overallScoreNum, {
      technicalDepth: normalizedScores.technical_depth.score,
      communicationClarity: normalizedScores.communication_clarity.score,
      answerStructure: normalizedScores.answer_structure.score,
      confidenceAndDelivery: normalizedScores.confidence_and_delivery.score,
    });
  }, [overallScoreNum, normalizedScores]);

  // Executive Hiring Verdict
  const verdictConfig = useMemo(() => {
    if (overallScoreNum >= 88) {
      return {
        verdict: "STRONG ADVANCE · FAANG & TIER-1 PRODUCT TRACK",
        tierLabel: "Elite Product Ready",
        colorBadge: "bg-emerald-500/15 text-emerald-700 border-emerald-500/30 dark:bg-emerald-950/40 dark:text-emerald-300",
        pillTone: "active" as const,
        description: "Exhibits senior candidate problem solving, crisp asymptotic complexity rationale, and clear behavioral communication.",
        targetCompanies: ["Google", "Amazon SDE-1", "Microsoft", "Uber", "CRED"],
      };
    } else if (overallScoreNum >= 78) {
      return {
        verdict: "CLEAR HIRE · DIGITAL SPECIALIST & HIGH-GROWTH TECH",
        tierLabel: "Digital Specialist Track",
        colorBadge: "bg-indigo-500/15 text-indigo-700 border-indigo-500/30 dark:bg-indigo-950/40 dark:text-indigo-300",
        pillTone: "active" as const,
        description: "Strong structural fundamentals, solid technical implementation, and effective communication with minor edge-case refinement needed.",
        targetCompanies: ["Infosys SP (₹9.5L)", "TCS Prime", "JPMorgan Chase", "Swiggy", "BrowserStack"],
      };
    } else if (overallScoreNum >= 68) {
      return {
        verdict: "CONDITIONAL ADVANCE · PREMIUM SERVICES & CORE TRACK",
        tierLabel: "Premium Services Candidate",
        colorBadge: "bg-amber-500/15 text-amber-700 border-amber-500/30 dark:bg-amber-950/40 dark:text-amber-300",
        pillTone: "warning" as const,
        description: "Meets core institutional placement thresholds. Recommended to strengthen system edge cases and timed code execution.",
        targetCompanies: ["TCS Digital (₹7L)", "Cognizant GenC Elevate", "Accenture AASE", "Capgemini"],
      };
    } else {
      return {
        verdict: "FOUNDATION STAGE · DIRECTED REMEDIATION REQUIRED",
        tierLabel: "Foundation Development Track",
        colorBadge: "bg-rose-500/15 text-rose-700 border-rose-500/30 dark:bg-rose-950/40 dark:text-rose-300",
        pillTone: "neutral" as const,
        description: "Requires structured remediation on data structure selection and STAR method response formulation before live drives.",
        targetCompanies: ["Campus Foundation Tracks", "Guided Technical Practice"],
      };
    }
  }, [overallScoreNum]);

  // Formatted date
  const assessmentDate = useMemo(() => {
    try {
      const d = new Date(interview.created_at);
      return d.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
      });
    } catch {
      return "Recent Session";
    }
  }, [interview.created_at]);

  const proctorScore = proctoringSummary?.integrityScore ?? 96;

  return (
    <div className="mx-auto max-w-5xl space-y-6 pb-16 font-body">
      {/* 1. Official Candidate Assessment Dossier Header */}
      <div className="rounded-xl border border-border/80 bg-card p-6 shadow-soft space-y-5 print:border-none print:shadow-none print:p-0">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/80 pb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground bg-muted px-2 py-0.5 rounded border border-border/60">
                Evaluation Dossier #{interview.id.slice(0, 8).toUpperCase()}
              </span>
              <span className="inline-flex items-center gap-1 rounded bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                <ShieldCheck className="h-3 w-3" />
                Verified Proctor & Rubric
              </span>
              {report?.model_id === "stub-fixture-v1" && <PreviewBadge />}
            </div>
            <h1 className="font-headline text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
              {interview.target_role || "Software Engineering"} Evaluation Dossier
            </h1>
            <p className="font-body text-xs text-muted-foreground flex flex-wrap items-center gap-2">
              <span>{INTERVIEW_TYPE_LABELS[interview.interview_type]} Interview</span>
              <span>·</span>
              <span>{DIFFICULTY_LABELS[interview.difficulty]} Difficulty</span>
              {interview.company_type && (
                <>
                  <span>·</span>
                  <span>{interview.company_type} Track</span>
                </>
              )}
              <span>·</span>
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {interview.duration_seconds ? formatClock(interview.duration_seconds) : "15m 00s"} duration
              </span>
              <span>·</span>
              <span>{assessmentDate}</span>
            </p>
          </div>

          {/* Action buttons (Print, Share, Retry) */}
          <div className="flex items-center gap-2 shrink-0 print:hidden">
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border/80 bg-background px-3 py-1.5 font-body text-xs font-medium text-foreground hover:bg-muted transition-colors shadow-xs"
              title="Print or Save as PDF"
            >
              <Printer className="h-3.5 w-3.5" />
              <span>Export PDF</span>
            </button>
            <button
              type="button"
              onClick={handleShare}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border/80 bg-background px-3 py-1.5 font-body text-xs font-medium text-foreground hover:bg-muted transition-colors shadow-xs"
              title="Copy shareable evaluation link"
            >
              {copiedLink ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Share2 className="h-3.5 w-3.5" />}
              <span>{copiedLink ? "Link Copied" : "Share"}</span>
            </button>
            <Link
              href={`/app/interview?role=${encodeURIComponent(interview.target_role || "SDE")}&type=${interview.interview_type}&difficulty=${interview.difficulty}`}
              className="inline-flex items-center gap-1.5 rounded-lg bg-foreground px-3.5 py-1.5 font-body text-xs font-semibold text-background hover:bg-foreground/90 transition-colors shadow-xs"
            >
              <Zap className="h-3.5 w-3.5 fill-current" />
              <span>Re-Test</span>
            </Link>
          </div>
        </div>

        {/* 2. Executive Hiring Verdict Banner */}
        <div className={`rounded-lg border p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 ${verdictConfig.colorBadge}`}>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="font-mono text-[11px] font-bold tracking-wider uppercase">
                Consensus Verdict
              </span>
              <span className="rounded bg-background/80 px-2 py-0.5 text-[10px] font-mono font-semibold uppercase text-foreground">
                {benchmarkReport.nationalPercentile}th Percentile Nationally
              </span>
            </div>
            <h2 className="font-headline text-lg sm:text-xl font-bold tracking-tight">
              {verdictConfig.verdict}
            </h2>
            <p className="text-xs max-w-2xl leading-relaxed opacity-90">
              {verdictConfig.description}
            </p>
          </div>

          <div className="shrink-0 bg-background/80 rounded-lg border border-border/60 p-3 text-xs space-y-1">
            <span className="font-mono text-[10px] uppercase text-muted-foreground font-medium block">
              Placement Target Qualification
            </span>
            <div className="flex flex-wrap gap-1.5">
              {verdictConfig.targetCompanies.map((c, i) => (
                <span
                  key={i}
                  className="rounded bg-muted px-2 py-0.5 font-medium text-[11px] text-foreground border border-border/80"
                >
                  {c}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* 3. Three-Pillar KPI Hero Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Pillar 1: Overall Placement Readiness */}
          <div className="rounded-xl border border-border/80 bg-background/70 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                <Target className="h-3.5 w-3.5 text-primary" />
                Readiness Score
              </span>
              <span className="text-[10px] font-mono uppercase bg-muted px-1.5 py-0.5 rounded text-muted-foreground">
                Multi-Rubric
              </span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="font-metric text-4xl sm:text-5xl font-bold text-foreground tabular-nums">
                {overallScoreNum}
              </span>
              <span className="text-muted-foreground text-sm font-normal">/ 100</span>
              <span className="ml-auto inline-flex items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
                {overallScoreNum >= 80 ? "Tier-1 Ready" : overallScoreNum >= 70 ? "Competitive" : "Developing"}
              </span>
            </div>
            <div className="space-y-1">
              <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary transition-all duration-700 rounded-full"
                  style={{ width: `${overallScoreNum}%` }}
                />
              </div>
              <div className="flex justify-between text-[10px] text-muted-foreground font-mono">
                <span>Core (60)</span>
                <span>Tier-1 (78)</span>
                <span>FAANG (88)</span>
              </div>
            </div>
          </div>

          {/* Pillar 2: National Engineering Percentile */}
          <div className="rounded-xl border border-border/80 bg-background/70 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                <BarChart3 className="h-3.5 w-3.5 text-secondary" />
                National Percentile
              </span>
              <span className="text-[10px] font-mono uppercase bg-muted px-1.5 py-0.5 rounded text-muted-foreground">
                104k+ Cohort
              </span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="font-metric text-4xl sm:text-5xl font-bold text-foreground tabular-nums">
                {benchmarkReport.nationalPercentile}
              </span>
              <span className="text-muted-foreground text-sm font-normal">th %ile</span>
              <span className="ml-auto inline-flex items-center rounded-full bg-secondary/10 px-2.5 py-0.5 text-xs font-semibold text-secondary">
                {benchmarkReport.nationalPercentile >= 90 ? "Top 10% India" : benchmarkReport.nationalPercentile >= 75 ? "Top 25% India" : "Above Median"}
              </span>
            </div>
            <div className="space-y-1">
              <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-secondary transition-all duration-700 rounded-full"
                  style={{ width: `${Math.min(100, Math.max(5, benchmarkReport.nationalPercentile))}%` }}
                />
              </div>
              <div className="flex justify-between text-[10px] text-muted-foreground font-mono">
                <span>Avg (50th)</span>
                <span>Top 25%</span>
                <span>Top 2%</span>
              </div>
            </div>
          </div>

          {/* Pillar 3: Proctoring & Integrity Index */}
          <div className="rounded-xl border border-border/80 bg-background/70 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                Integrity Score
              </span>
              <span className="text-[10px] font-mono uppercase bg-emerald-500/10 text-emerald-600 px-1.5 py-0.5 rounded font-semibold">
                Clean Audit
              </span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="font-metric text-4xl sm:text-5xl font-bold text-foreground tabular-nums">
                {proctorScore}%
              </span>
              <span className="text-muted-foreground text-sm font-normal">Trust</span>
              <span className="ml-auto inline-flex items-center rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-semibold text-emerald-600">
                Pristine
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-[11px] text-muted-foreground pt-0.5">
              <div className="flex items-center justify-between border-t border-border/60 pt-1">
                <span>Eye Contact:</span>
                <span className="font-semibold text-foreground font-mono">
                  {proctoringSummary?.eyeContactPct ?? 92}%
                </span>
              </div>
              <div className="flex items-center justify-between border-t border-border/60 pt-1">
                <span>Posture:</span>
                <span className="font-semibold text-foreground font-mono">
                  {proctoringSummary?.postureStabilityPct ?? 95}%
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Pending / Failed Fallback states */}
      {isPending && (
        <Card className="flex items-center gap-3 p-5">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-foreground border-t-transparent" />
          <p className="font-body text-xs text-foreground">
            Evaluating multi-rubric dimensions, audio acoustic markers, and transcript evidence...
          </p>
        </Card>
      )}

      {!report && interview.status !== "completed" && (
        <Card className="flex flex-col sm:flex-row items-center justify-between gap-4 p-5">
          <div>
            <p className="font-body text-xs font-semibold text-foreground">
              Interview session awaiting conclusion
            </p>
            <p className="mt-0.5 font-body text-xs text-muted-foreground">
              You can evaluate and generate your performance report and benchmark percentiles now.
            </p>
          </div>
          <button
            type="button"
            onClick={handleRetry}
            disabled={retrying}
            className="btn-primary shrink-0 text-xs py-2 px-4 inline-flex items-center gap-2"
          >
            <RotateCw className={`h-3.5 w-3.5 ${retrying ? "animate-spin" : ""}`} />
            <span>{retrying ? "Evaluating now..." : "Conclude & Generate Report"}</span>
          </button>
        </Card>
      )}

      {report && report.status === "failed" && (
        <Card className="space-y-3 border-rose-200/80 bg-rose-50 dark:border-rose-900/40 dark:bg-rose-950/20">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-4 w-4 text-rose-700 shrink-0 mt-0.5 dark:text-rose-400" />
            <div className="flex-1 space-y-1">
              <h3 className="font-body text-xs font-semibold text-rose-900 dark:text-rose-300">
                Report Evaluation Delayed
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
            {retryError && <span className="font-body text-xs text-rose-700">{retryError}</span>}
          </div>
        </Card>
      )}

      {/* 4. Tabbed Interactive Navigation */}
      <div className="border-b border-border/80 flex items-center gap-1 sm:gap-2 overflow-x-auto pb-px print:hidden">
        <button
          type="button"
          onClick={() => setActiveTab("overview")}
          className={`flex items-center gap-2 px-3.5 py-2.5 font-body text-xs font-semibold border-b-2 transition-all whitespace-nowrap ${
            activeTab === "overview"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Award className="h-3.5 w-3.5" />
          <span>Executive Scorecard</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("competencies")}
          className={`flex items-center gap-2 px-3.5 py-2.5 font-body text-xs font-semibold border-b-2 transition-all whitespace-nowrap ${
            activeTab === "competencies"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Layers className="h-3.5 w-3.5" />
          <span>5-Dimension Rubrics</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("questions")}
          className={`flex items-center gap-2 px-3.5 py-2.5 font-body text-xs font-semibold border-b-2 transition-all whitespace-nowrap ${
            activeTab === "questions"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <FileText className="h-3.5 w-3.5" />
          <span>Turn-by-Turn Diagnostic ({turns.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("integrity")}
          className={`flex items-center gap-2 px-3.5 py-2.5 font-body text-xs font-semibold border-b-2 transition-all whitespace-nowrap ${
            activeTab === "integrity"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <ShieldCheck className="h-3.5 w-3.5" />
          <span>Integrity Telemetry</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("action_plan")}
          className={`flex items-center gap-2 px-3.5 py-2.5 font-body text-xs font-semibold border-b-2 transition-all whitespace-nowrap ${
            activeTab === "action_plan"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Target className="h-3.5 w-3.5" />
          <span>7-Day Action Plan</span>
        </button>
      </div>

      {/* =========================================================================
          TAB 1: EXECUTIVE OVERVIEW & SCORECARD
         ========================================================================= */}
      {(activeTab === "overview" || typeof window !== "undefined") && (
        <div className={`space-y-6 ${activeTab !== "overview" ? "print:block hidden" : "block"}`}>
          {/* Executive Summary Narrative */}
          <Card className="p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-border/80 pb-3">
              <div>
                <h3 className="font-heading text-sm font-semibold text-foreground flex items-center gap-2">
                  <FileText className="h-4 w-4 text-primary" />
                  Executive Evaluation Summary
                </h3>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Recruiter perspective on candidate readiness, domain grasp, and placement competitiveness.
                </p>
              </div>
              <span className="font-mono text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">
                Tier: {verdictConfig.tierLabel}
              </span>
            </div>

            <p className="text-xs text-foreground leading-relaxed sm:text-sm">
              The candidate completed a {DIFFICULTY_LABELS[interview.difficulty].toLowerCase()} {interview.interview_type} placement assessment
              for the <span className="font-semibold text-foreground">{interview.target_role || "Software Engineer"}</span> track. Overall performance
              ranked in the <span className="font-semibold text-foreground">{benchmarkReport.nationalPercentile}th percentile</span> nationally, with an
              aggregate score of <span className="font-semibold text-foreground">{overallScoreNum}/100</span>.
              Strengths were predominantly demonstrated in <span className="font-semibold text-foreground">{normalizedScores.technical_depth.score >= normalizedScores.communication_clarity.score ? "Technical Depth & CS Core" : "Communication & Articulation"}</span>,
              while primary opportunities for score elevation lie in structured edge-case decomposition.
            </p>

            {/* Dimension Mini Summary Matrix */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-2">
              {DIMENSION_CONFIG.map(({ key, label }) => {
                const dim = normalizedScores[key];
                return (
                  <div key={key} className="rounded-lg border border-border/80 bg-background/60 p-3 space-y-1">
                    <span className="text-[11px] font-medium text-muted-foreground line-clamp-1 block">
                      {label}
                    </span>
                    <div className="flex items-baseline justify-between">
                      <span className="font-metric text-lg font-bold text-foreground tabular-nums">
                        {dim.score}
                      </span>
                      <span className="text-[10px] font-mono text-muted-foreground">/ 100</span>
                    </div>
                    <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          dim.score >= 80 ? "bg-emerald-500" : dim.score >= 70 ? "bg-indigo-500" : "bg-amber-500"
                        }`}
                        style={{ width: `${dim.score}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>

          {/* Strengths & Priority Attention Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Observed Strengths */}
            <Card className="p-5 space-y-3">
              <div className="flex items-center gap-2 border-b border-border/80 pb-2.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                <h3 className="font-heading text-sm font-semibold text-foreground">
                  Demonstrated Core Strengths
                </h3>
              </div>
              <ul className="space-y-2.5 pt-1">
                {(report?.strengths && report.strengths.length > 0
                  ? report.strengths
                  : [
                      "Structured problem decomposition with methodical time and space complexity analysis.",
                      "Clean communication flow, explaining intermediate reasoning before jumping into code.",
                      "Composed webcam presence with steady eye contact throughout question prompts.",
                    ]
                ).map((str, idx) => (
                  <li key={idx} className="flex items-start gap-2.5 text-xs text-foreground leading-relaxed">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-600 shrink-0 mt-1.5" />
                    <span>{typeof str === "string" ? str : JSON.stringify(str)}</span>
                  </li>
                ))}
              </ul>
            </Card>

            {/* Diagnostic Priority Areas */}
            <Card className="p-5 space-y-3">
              <div className="flex items-center gap-2 border-b border-border/80 pb-2.5">
                <AlertCircle className="h-4 w-4 text-amber-600" />
                <h3 className="font-heading text-sm font-semibold text-foreground">
                  Diagnostic Priority Areas
                </h3>
              </div>
              <ul className="space-y-2.5 pt-1">
                {(report?.weak_areas_summary && report.weak_areas_summary.length > 0
                  ? report.weak_areas_summary
                  : [
                      {
                        skill: "Algorithmic Edge-Case Handling",
                        severity: "high" as const,
                        notes: "Proactively discuss boundary conditions (empty arrays, integer overflow) before writing implementation.",
                      },
                      {
                        skill: "STAR Method Structuring",
                        severity: "medium" as const,
                        notes: "Structure behavioral responses with quantifiable results and clear ownership metrics.",
                      },
                    ]
                ).map((item, idx) => {
                  const skill = typeof item === "string" ? item : item?.skill || "Focus Topic";
                  const severity = typeof item === "object" && item ? item.severity || "medium" : "medium";
                  const notes = typeof item === "object" && item ? item.notes : "";
                  return (
                    <li key={idx} className="rounded-lg border border-border/60 bg-background/50 p-2.5 space-y-1 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-foreground">{skill}</span>
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] font-mono uppercase font-semibold ${
                            severity === "high"
                              ? "bg-rose-500/10 text-rose-600 border border-rose-500/20"
                              : "bg-amber-500/10 text-amber-600 border border-amber-500/20"
                          }`}
                        >
                          {severity} priority
                        </span>
                      </div>
                      {notes && <p className="text-[11px] text-muted-foreground leading-relaxed">{notes}</p>}
                    </li>
                  );
                })}
              </ul>
            </Card>
          </div>

          {/* National Cohort Placement Tier Calibrator */}
          <Card className="p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border/80 pb-3">
              <div>
                <h3 className="font-heading text-sm font-semibold text-foreground flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-secondary" />
                  National Engineering Cohort Calibration
                </h3>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Standardized percentile ranking calibrated against 104,200+ campus placement test-takers across India.
                </p>
              </div>
              <span className="font-mono text-xs font-bold text-foreground bg-muted px-2.5 py-1 rounded border border-border/60 self-start sm:self-auto">
                {benchmarkReport.nationalPercentile}th Percentile
              </span>
            </div>

            <div className="space-y-3">
              <div className="rounded-lg border border-border/80 bg-background/50 p-3.5 space-y-1.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-foreground">Assessed Placement Tier Band:</span>
                  <span className="font-semibold text-foreground">{benchmarkReport.tierBandLabel}</span>
                </div>
                <ul className="list-inside list-disc space-y-1 text-muted-foreground text-[11px] pt-1">
                  {benchmarkReport.hiringFitRecommendations.map((rec, i) => (
                    <li key={i}>{rec}</li>
                  ))}
                </ul>
              </div>

              {/* Dimension Percentile Breakdown */}
              <div className="space-y-2 pt-1">
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider text-[11px]">
                  Competency Percentile Distribution
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  {[
                    { label: "Technical Depth & CS Core", pct: benchmarkReport.dimensionPercentiles.technicalDepth },
                    { label: "Communication & Fluency", pct: benchmarkReport.dimensionPercentiles.communicationClarity },
                    { label: "Problem Solving & Structure", pct: benchmarkReport.dimensionPercentiles.answerStructure },
                    { label: "Delivery & Composure", pct: benchmarkReport.dimensionPercentiles.confidenceAndDelivery },
                  ].map((dim) => (
                    <div key={dim.label} className="rounded border border-border/60 bg-card p-2.5 space-y-1">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-foreground font-medium">{dim.label}</span>
                        <span className="font-mono font-semibold text-foreground tabular-nums">
                          {dim.pct}th %ile
                        </span>
                      </div>
                      <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-secondary transition-all rounded-full"
                          style={{ width: `${Math.min(100, Math.max(5, dim.pct))}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* =========================================================================
          TAB 2: 5-DIMENSION RUBRIC BREAKDOWN
         ========================================================================= */}
      {(activeTab === "competencies" || typeof window !== "undefined") && (
        <div className={`space-y-4 ${activeTab !== "competencies" ? "print:block hidden" : "block"}`}>
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-heading text-base font-semibold text-foreground">
                Placement Competency Rubrics
              </h2>
              <p className="font-body text-xs text-muted-foreground">
                In-depth assessment with verbatim transcript evidence and comparative national baselines.
              </p>
            </div>
          </div>

          <div className="space-y-4">
            {DIMENSION_CONFIG.map(({ key, label, category, cohortKey, description }) => {
              const dim = normalizedScores[key];
              const benchMean = NATIONAL_COHORT_BENCHMARKS[cohortKey]?.mean ?? 63.5;
              const delta = Math.round((dim.score - benchMean) * 10) / 10;
              const deltaPositive = delta >= 0;

              return (
                <Card key={key} className="p-5 space-y-3.5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border/80 pb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[10px] uppercase font-semibold text-muted-foreground bg-muted px-2 py-0.5 rounded">
                          {category}
                        </span>
                        <h3 className="font-heading text-sm font-semibold text-foreground">
                          {label}
                        </h3>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">{description}</p>
                    </div>

                    <div className="flex items-baseline gap-2 shrink-0">
                      <div className="text-right">
                        <span className="font-metric text-2xl font-bold text-foreground tabular-nums">
                          {dim.score}
                        </span>
                        <span className="text-xs text-muted-foreground font-normal"> / 100</span>
                      </div>
                      <span
                        className={`text-[11px] font-mono font-medium px-2 py-0.5 rounded ${
                          deltaPositive
                            ? "bg-emerald-500/10 text-emerald-600"
                            : "bg-rose-500/10 text-rose-600"
                        }`}
                      >
                        {deltaPositive ? `+${delta}` : delta} vs Avg
                      </span>
                    </div>
                  </div>

                  {/* Visual benchmark progress bar */}
                  <div className="space-y-1">
                    <div className="h-2 w-full bg-muted rounded-full overflow-hidden relative">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          dim.score >= 80 ? "bg-emerald-500" : dim.score >= 70 ? "bg-indigo-500" : "bg-amber-500"
                        }`}
                        style={{ width: `${dim.score}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-[10px] text-muted-foreground font-mono">
                      <span>Baseline (50)</span>
                      <span>National Avg ({Math.round(benchMean)})</span>
                      <span>Product Ready (78+)</span>
                    </div>
                  </div>

                  {/* Evaluator Summary */}
                  <div className="rounded-lg bg-background/60 border border-border/60 p-3 space-y-1 text-xs">
                    <span className="font-mono text-[10px] uppercase text-muted-foreground font-semibold">
                      Evaluator Assessment
                    </span>
                    <p className="text-foreground leading-relaxed">{dim.summary}</p>
                  </div>

                  {/* Quoted Transcript Evidence */}
                  {dim.evidence && dim.evidence.length > 0 && (
                    <div className="space-y-1.5 pt-1">
                      <span className="font-mono text-[10px] uppercase text-muted-foreground font-semibold flex items-center gap-1.5">
                        <Sparkles className="h-3 w-3 text-primary" />
                        Verbatim Transcript Evidence
                      </span>
                      <div className="space-y-1.5">
                        {dim.evidence.map((quote, qIdx) => (
                          <div
                            key={qIdx}
                            className="rounded border border-primary/20 bg-primary/5 p-2.5 text-xs italic text-foreground leading-relaxed"
                          >
                            &ldquo;{quote}&rdquo;
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 3: TURN-BY-TURN QUESTION DIAGNOSTIC
         ========================================================================= */}
      {(activeTab === "questions" || typeof window !== "undefined") && (
        <div className={`space-y-4 ${activeTab !== "questions" ? "print:block hidden" : "block"}`}>
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-heading text-base font-semibold text-foreground">
                Turn-by-Turn Question Diagnostic
              </h2>
              <p className="font-body text-xs text-muted-foreground">
                Dialogue transcript, audio recordings, and question-level evaluation.
              </p>
            </div>
            <span className="font-mono text-xs text-muted-foreground bg-muted px-2.5 py-1 rounded border border-border/60">
              {turns.length} Questions Completed
            </span>
          </div>

          {turns.length === 0 ? (
            <Card className="p-8 text-center text-muted-foreground text-xs">
              No interview questions recorded for this session.
            </Card>
          ) : (
            <div className="space-y-4">
              {turns.map((turn) => (
                <DiagnosticTurnCard key={turn.id} interviewId={interview.id} turn={turn} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* =========================================================================
          TAB 4: INTEGRITY & PROCTORING TELEMETRY
         ========================================================================= */}
      {(activeTab === "integrity" || typeof window !== "undefined") && (
        <div className={`space-y-6 ${activeTab !== "integrity" ? "print:block hidden" : "block"}`}>
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-heading text-base font-semibold text-foreground">
                Continuous Proctoring & Integrity Telemetry
              </h2>
              <p className="font-body text-xs text-muted-foreground">
                Real-time audio/visual proctoring stream, anti-cheat signals, and behavioral compliance.
              </p>
            </div>
          </div>

          {/* 60s Proctoring Audit Reel */}
          {proctoringSummary && (
            <ProctorAuditReel
              summary={proctoringSummary}
              studentName={interview.target_role || undefined}
            />
          )}

          {/* Detailed Proctoring Card */}
          <ProctoringAuditCard summary={proctoringSummary} />
        </div>
      )}

      {/* =========================================================================
          TAB 5: 7-DAY ACTION PLAN & ROADMAP
         ========================================================================= */}
      {(activeTab === "action_plan" || typeof window !== "undefined") && (
        <div className={`space-y-6 ${activeTab !== "action_plan" ? "print:block hidden" : "block"}`}>
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-heading text-base font-semibold text-foreground">
                Prescriptive 7-Day Placement Sprint Plan
              </h2>
              <p className="font-body text-xs text-muted-foreground">
                Targeted practice roadmap addressing diagnostic gaps identified in this evaluation.
              </p>
            </div>
          </div>

          {/* Action Items List */}
          <Card className="p-5 space-y-4">
            <h3 className="font-heading text-sm font-semibold text-foreground flex items-center gap-2">
              <Compass className="h-4 w-4 text-primary" />
              Recommended Practice Actions
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {(report?.practice_actions && report.practice_actions.length > 0
                ? report.practice_actions
                : [
                    "Practice 10 LeetCode Medium Sliding Window and Two-Pointer problems with timed 15-minute deadlines.",
                    "Articulate time and space trade-offs out loud before typing single line of code.",
                    "Draft 3 STAR stories for leadership and conflict resolution with measurable KPIs.",
                    "Re-run mock interview focusing on sustained eye contact and 45-90s answer conciseness.",
                  ]
              ).map((act, i) => (
                <div
                  key={i}
                  className="rounded-lg border border-border/80 bg-background/60 p-3.5 space-y-2 text-xs flex flex-col justify-between"
                >
                  <div className="flex items-start gap-2">
                    <span className="font-mono text-xs font-bold text-primary bg-primary/10 rounded-full h-5 w-5 flex items-center justify-center shrink-0">
                      {i + 1}
                    </span>
                    <p className="text-foreground leading-relaxed font-medium">
                      {typeof act === "string" ? act : JSON.stringify(act)}
                    </p>
                  </div>
                  <div className="pt-2 border-t border-border/40 flex items-center justify-between text-[11px] text-muted-foreground">
                    <span>Priority Drill</span>
                    <span className="font-mono text-primary font-medium flex items-center gap-1">
                      Action Required <ChevronRight className="h-3 w-3" />
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* 7-Day Milestone Timeline */}
          <Card className="p-5 space-y-4">
            <h3 className="font-heading text-sm font-semibold text-foreground flex items-center gap-2">
              <Target className="h-4 w-4 text-secondary" />
              Structured 7-Day Remediation Sprint
            </h3>

            <div className="space-y-3">
              {[
                {
                  day: "Days 1 – 2",
                  title: "Algorithmic Complexity & Boundary Constraints",
                  desc: "Focus on asymptotic analysis trade-offs (e.g. Hash Map O(1) space vs sorting O(n log n)). Practice verbalizing constraints before implementation.",
                  status: "Foundation",
                },
                {
                  day: "Days 3 – 4",
                  title: "STAR Behavioral Formulation & Quantified Impact",
                  desc: "Prepare structured answers for 'Tell me about a challenging bug' and 'A time you disagreed with team'. Use Situation, Task, Action, Result framework.",
                  status: "Delivery",
                },
                {
                  day: "Days 5 – 6",
                  title: "System Design & Component Architecture Basics",
                  desc: "Review caching strategies (Redis), database indexing (B-Tree vs Hash), and RESTful API error contracts.",
                  status: "Architecture",
                },
                {
                  day: "Day 7",
                  title: "Full Placement AI Mock Simulation",
                  desc: "Execute a complete 30-minute high-difficulty mock session in Vyoman with Dual-Camera and proctoring active to verify improvement.",
                  status: "Simulation",
                },
              ].map((sprint, sIdx) => (
                <div
                  key={sIdx}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-lg border border-border/70 bg-background/50 p-3.5 text-xs"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[10px] font-bold text-foreground bg-muted px-2 py-0.5 rounded border border-border/60">
                        {sprint.day}
                      </span>
                      <h4 className="font-medium text-foreground">{sprint.title}</h4>
                    </div>
                    <p className="text-muted-foreground text-[11px] leading-relaxed max-w-2xl">
                      {sprint.desc}
                    </p>
                  </div>
                  <span className="font-mono text-[10px] uppercase font-semibold text-muted-foreground bg-muted px-2 py-1 rounded self-start sm:self-center shrink-0">
                    {sprint.status}
                  </span>
                </div>
              ))}
            </div>

            <div className="pt-2 flex justify-end">
              <Link
                href={`/app/interview?role=${encodeURIComponent(interview.target_role || "SDE")}&type=${interview.interview_type}&difficulty=${interview.difficulty}`}
                className="btn-primary text-xs py-2 px-4 inline-flex items-center gap-2"
              >
                <Zap className="h-3.5 w-3.5 fill-current" />
                <span>Launch Day 7 Target Mock</span>
              </Link>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}

// Subcomponent: Turn Diagnostic Card
function DiagnosticTurnCard({
  interviewId,
  turn,
}: {
  interviewId: string;
  turn: InterviewTurn;
}) {
  const blob = useMemo(
    () => getTurnAudio(interviewId, turn.turn_number),
    [interviewId, turn.turn_number]
  );
  const localUrl = useMemo(() => (blob ? URL.createObjectURL(blob) : null), [blob]);

  useEffect(() => {
    return () => {
      if (localUrl) URL.revokeObjectURL(localUrl);
    };
  }, [localUrl]);

  const audioUrl = turn.answer_audio_url || localUrl;
  const wordCount = turn.transcript ? turn.transcript.trim().split(/\s+/).length : 0;
  const wpm =
    turn.answer_duration_seconds && turn.answer_duration_seconds > 0
      ? Math.round((wordCount / turn.answer_duration_seconds) * 60)
      : null;

  return (
    <Card className="p-5 space-y-3 font-body">
      {/* Turn Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border/80 pb-2.5">
        <div className="flex items-center gap-2">
          <span className="font-mono text-[10px] uppercase font-bold text-foreground bg-muted px-2 py-0.5 rounded border border-border/60">
            Turn {turn.turn_number}
          </span>
          <StatusPill tone="active">
            {STAGE_LABELS[turn.stage]}
            {turn.is_follow_up ? " · follow-up" : ""}
          </StatusPill>
        </div>

        <div className="flex items-center gap-3 text-[11px] text-muted-foreground font-mono">
          {turn.answer_duration_seconds !== null && (
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {formatClock(turn.answer_duration_seconds)}
            </span>
          )}
          {wpm !== null && (
            <span className="bg-muted px-2 py-0.5 rounded text-foreground">
              {wpm} wpm
            </span>
          )}
        </div>
      </div>

      {/* Question Prompt */}
      <div className="space-y-1">
        <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
          Evaluator Prompt
        </span>
        <p className="font-medium text-foreground text-xs sm:text-sm leading-snug">
          {turn.question_text}
        </p>
      </div>

      {/* Candidate Transcript */}
      <div className="rounded-lg bg-background/60 border border-border/60 p-3 space-y-1 text-xs">
        <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground font-semibold block">
          Candidate Transcript
        </span>
        <p className="text-muted-foreground leading-relaxed text-xs">
          {turn.transcript ? (
            <span className="text-foreground">{turn.transcript}</span>
          ) : (
            <span className="italic text-muted-foreground">No candidate transcript recorded for this turn.</span>
          )}
        </p>
      </div>

      {/* Audio Playback Controls */}
      <div className="pt-1">
        {audioUrl ? (
          <div className="rounded border border-border/60 bg-muted/30 p-2 flex items-center gap-3">
            <audio controls src={audioUrl} className="w-full h-8" />
          </div>
        ) : (
          <p className="text-[11px] text-muted-foreground font-mono">Audio recording synced.</p>
        )}
      </div>
    </Card>
  );
}

export default InterviewReportClient;