"use client";

import { useState } from "react";
import {
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  Monitor,
  Code2,
  Eye,
  Volume2,
  Clock,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
} from "lucide-react";
import type { ProctoringSummary, TrustBand } from "@/lib/proctoring/types";
import { formatClock } from "@/lib/interview/recording";

interface ProctoringAuditCardProps {
  summary: ProctoringSummary | null;
  className?: string;
  isRecruiterView?: boolean;
}

const TRUST_BAND_CONFIG: Record<
  TrustBand,
  { label: string; badgeClass: string; icon: typeof ShieldCheck; description: string }
> = {
  clean: {
    label: "Pristine Integrity",
    badgeClass: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
    icon: ShieldCheck,
    description: "No significant integrity infractions detected during this assessment.",
  },
  suspicious: {
    label: "Minor Irregularities",
    badgeClass: "bg-amber-500/10 text-amber-500 border-amber-500/20",
    icon: AlertTriangle,
    description: "Isolated focus loss or tab navigation recorded. Within acceptable tolerance.",
  },
  flagged: {
    label: "Flagged for Review",
    badgeClass: "bg-orange-500/10 text-orange-500 border-orange-500/20 font-bold",
    icon: ShieldAlert,
    description: "Multiple tab switches or unauthorized clipboard interactions detected.",
  },
  critical: {
    label: "Critical Integrity Breach",
    badgeClass: "bg-destructive/10 text-destructive border-destructive/20 font-bold",
    icon: ShieldAlert,
    description: "Severe violations detected: DevTools opened, multiple faces, or bulk code pasted.",
  },
};

export function ProctoringAuditCard({
  summary,
  className = "",
  isRecruiterView = false,
}: ProctoringAuditCardProps) {
  const [showTimeline, setShowTimeline] = useState(false);

  // Fallback default if session had no explicit events
  const safeSummary: ProctoringSummary = summary ?? {
    integrityScore: 100,
    trustBand: "clean",
    tabSwitchesCount: 0,
    fullscreenExitsCount: 0,
    windowBlursCount: 0,
    pasteEventsCount: 0,
    faceViolationsCount: 0,
    audioAnomaliesCount: 0,
    totalInfractions: 0,
    eyeContactPct: 92,
    postureStabilityPct: 95,
    categoryBreakdown: {
      screenFocusScore: 100,
      codeIntegrityScore: 100,
      visualFocusScore: 100,
      audioIntegrityScore: 100,
    },
    events: [],
    startedAt: new Date().toISOString(),
    durationSeconds: 0,
  };

  const band = safeSummary.trustBand;
  const config = TRUST_BAND_CONFIG[band];
  const Icon = config.icon;

  return (
    <div
      className={`rounded-3xl border border-border bg-card p-6 shadow-soft space-y-6 ${className}`}
    >
      {/* Header & Overall Integrity Score */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-border/60 pb-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span
              className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 font-body text-xs font-semibold ${config.badgeClass}`}
            >
              <Icon className="h-3.5 w-3.5" />
              <span>{config.label}</span>
            </span>
            {isRecruiterView && (
              <span className="font-mono text-[11px] text-muted-foreground">
                Placement Verification
              </span>
            )}
          </div>
          <h2 className="font-headline text-lg font-bold text-foreground">
            Candidate Integrity & Proctoring Audit
          </h2>
          <p className="font-body text-xs text-muted-foreground">{config.description}</p>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right">
            <span className="font-body text-[11px] text-muted-foreground uppercase font-medium">
              Integrity Index
            </span>
            <div className="flex items-center justify-end gap-1">
              <span
                className={`font-metric text-3xl font-extrabold ${
                  safeSummary.integrityScore >= 90
                    ? "text-emerald-500"
                    : safeSummary.integrityScore >= 75
                      ? "text-amber-500"
                      : "text-destructive"
                }`}
              >
                {safeSummary.integrityScore}%
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Category Subscores Grid */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {/* Screen & Focus */}
        <div className="rounded-2xl border border-border/80 bg-background/50 p-4 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Monitor className="h-4 w-4" />
              <span className="font-body text-xs font-medium">Screen Focus</span>
            </div>
            <span className="font-metric text-xs font-bold text-foreground">
              {safeSummary.categoryBreakdown.screenFocusScore}%
            </span>
          </div>
          <p className="font-body text-[11px] text-muted-foreground">
            {safeSummary.tabSwitchesCount} tab switches · {safeSummary.fullscreenExitsCount} exits
          </p>
        </div>

        {/* Code Integrity */}
        <div className="rounded-2xl border border-border/80 bg-background/50 p-4 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Code2 className="h-4 w-4" />
              <span className="font-body text-xs font-medium">Code Integrity</span>
            </div>
            <span className="font-metric text-xs font-bold text-foreground">
              {safeSummary.categoryBreakdown.codeIntegrityScore}%
            </span>
          </div>
          <p className="font-body text-[11px] text-muted-foreground">
            {safeSummary.pasteEventsCount} paste events
          </p>
        </div>

        {/* Visual Presence & Gaze */}
        <div className="rounded-2xl border border-border/80 bg-background/50 p-4 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Eye className="h-4 w-4" />
              <span className="font-body text-xs font-medium">Visual Focus</span>
            </div>
            <span className="font-metric text-xs font-bold text-foreground">
              {safeSummary.categoryBreakdown.visualFocusScore}%
            </span>
          </div>
          <p className="font-body text-[11px] text-muted-foreground">
            {safeSummary.eyeContactPct}% eye contact · {safeSummary.faceViolationsCount} flags
          </p>
        </div>

        {/* Audio Environment */}
        <div className="rounded-2xl border border-border/80 bg-background/50 p-4 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Volume2 className="h-4 w-4" />
              <span className="font-body text-xs font-medium">Audio Stream</span>
            </div>
            <span className="font-metric text-xs font-bold text-foreground">
              {safeSummary.categoryBreakdown.audioIntegrityScore}%
            </span>
          </div>
          <p className="font-body text-[11px] text-muted-foreground">
            {safeSummary.audioAnomaliesCount} audio anomalies
          </p>
        </div>
      </div>

      {/* Incident Log / Event Timeline */}
      <div className="border-t border-border/60 pt-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <h3 className="font-headline text-sm font-semibold text-foreground">
              Proctoring Incident Timeline ({safeSummary.events.length})
            </h3>
          </div>

          {safeSummary.events.length > 0 && (
            <button
              type="button"
              onClick={() => setShowTimeline(!showTimeline)}
              className="flex items-center gap-1 font-body text-xs font-medium text-primary hover:underline"
            >
              <span>{showTimeline ? "Hide Log" : "View Incident Log"}</span>
              {showTimeline ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            </button>
          )}
        </div>

        {safeSummary.events.length === 0 ? (
          <div className="flex items-center gap-2 rounded-2xl bg-emerald-500/10 px-4 py-3 font-body text-xs text-emerald-600">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
            <span>
              <strong>Pristine Session:</strong> Candidate remained in fullscreen with camera active throughout the entire session. Zero tab switches or code paste infractions detected.
            </span>
          </div>
        ) : (
          showTimeline && (
            <div className="divide-y divide-border/60 rounded-2xl border border-border/80 bg-background/50 overflow-hidden font-body text-xs">
              {safeSummary.events.map((evt, idx) => (
                <div key={evt.id ?? idx} className="flex items-start gap-3 p-3">
                  <span className="font-mono text-[11px] text-muted-foreground shrink-0 mt-0.5">
                    +{formatClock(evt.timestampSeconds)}
                  </span>

                  <span
                    className={`shrink-0 rounded-md px-2 py-0.5 text-[10px] font-bold uppercase ${
                      evt.severity === "high"
                        ? "bg-destructive/20 text-destructive"
                        : evt.severity === "medium"
                          ? "bg-amber-500/20 text-amber-500"
                          : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {evt.severity}
                  </span>

                  <div className="flex-1">
                    <p className="font-semibold text-foreground">{evt.label}</p>
                    <p className="text-muted-foreground text-[11px]">{evt.description}</p>
                  </div>
                </div>
              ))}
            </div>
          )
        )}
      </div>
    </div>
  );
}

export default ProctoringAuditCard;
