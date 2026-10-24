"use client";

import { ShieldAlert, AlertTriangle, Maximize2, ArrowRight } from "lucide-react";
import type { ProctoringEvent } from "@/lib/proctoring/types";

interface ProctoringWarningModalProps {
  warning: ProctoringEvent | null;
  warningCount: number;
  maxWarnings: number;
  onDismiss: () => void;
  onRequestFullscreen: () => void;
  isFullscreen: boolean;
}

export function ProctoringWarningModal({
  warning,
  warningCount,
  maxWarnings,
  onDismiss,
  onRequestFullscreen,
  isFullscreen,
}: ProctoringWarningModalProps) {
  if (!warning) return null;

  const isSevere = warningCount >= maxWarnings;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-md rounded-3xl border border-destructive/40 bg-card p-6 shadow-2xl space-y-5">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
            <ShieldAlert className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-destructive/20 px-2.5 py-0.5 font-body text-[11px] font-bold text-destructive">
                Warning {warningCount} of {maxWarnings}
              </span>
              <span className="font-mono text-xs text-muted-foreground">
                {warning.timestampSeconds}s
              </span>
            </div>
            <h3 className="mt-1 font-headline text-lg font-bold text-foreground">
              {warning.label}
            </h3>
          </div>
        </div>

        <div className="rounded-2xl border border-border/80 bg-muted/40 p-4 font-body text-xs text-muted-foreground space-y-2">
          <p className="text-foreground font-medium">{warning.description}</p>
          <p>
            Vyoman Placement Proctored Environment actively monitors browser focus, window state,
            and external clipboard interactions. All infractions are logged in your final{" "}
            <strong>Candidate Integrity Audit</strong> for campus placement evaluation.
          </p>
          {isSevere && (
            <p className="text-destructive font-semibold">
              Notice: Reaching repeated warnings will mark your interview as &quot;Flagged for Review&quot; on the recruiter leaderboard.
            </p>
          )}
        </div>

        <div className="flex flex-col gap-2 pt-1 sm:flex-row">
          {!isFullscreen && (
            <button
              type="button"
              onClick={() => {
                onRequestFullscreen();
                onDismiss();
              }}
              className="btn-primary flex-1 py-2.5 flex items-center justify-center gap-2"
            >
              <Maximize2 className="h-4 w-4" />
              <span>Enter Fullscreen & Resume</span>
            </button>
          )}

          <button
            type="button"
            onClick={onDismiss}
            className={`${
              isFullscreen ? "btn-primary w-full" : "btn-secondary"
            } py-2.5 flex items-center justify-center gap-2 text-xs font-semibold`}
          >
            <span>Return to Assessment</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

export default ProctoringWarningModal;
