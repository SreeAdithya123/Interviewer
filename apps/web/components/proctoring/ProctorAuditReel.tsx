"use client";

import { useMemo, useState } from "react";
import { buildProctorAuditReel, type AuditReelMarker } from "@/lib/proctoring/auditReel";
import type { ProctoringSummary } from "@/lib/proctoring/types";

function formatSeconds(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

export function ProctorAuditReel({
  summary,
  studentName,
}: {
  summary: ProctoringSummary;
  studentName?: string;
}) {
  const reel = useMemo(() => buildProctorAuditReel(summary), [summary]);

  const [currentReelSecond, setCurrentReelSecond] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [selectedMarker, setSelectedMarker] = useState<AuditReelMarker | null>(
    reel.markers[0] || null
  );
  const [tpoDecision, setTpoDecision] = useState<"pending" | "verified" | "disqualified">(
    "pending"
  );

  const realCurrentSecond = Math.round(
    (currentReelSecond / 60) * reel.totalInterviewDurationSeconds
  );

  const handleSeek = (reelSec: number) => {
    setCurrentReelSecond(reelSec);
    // Find closest marker
    const closest = reel.markers.reduce<AuditReelMarker | null>((prev, curr) => {
      if (!prev) return curr;
      return Math.abs(curr.secondInReel - reelSec) < Math.abs(prev.secondInReel - reelSec)
        ? curr
        : prev;
    }, null);
    setSelectedMarker(closest);
  };

  return (
    <div className="rounded-lg border border-border/80 bg-card p-5 space-y-4">
      {/* Header & Risk Recommendation */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-border/80 pb-3">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-heading text-sm font-semibold text-foreground">
              Automated 60s Proctoring Audit Reel
            </h3>
            <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground">
              {reel.markers.length} incident{reel.markers.length === 1 ? "" : "s"}
            </span>
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Condensed playback of candidate telemetry, tab events, and posture flags.
          </p>
        </div>

        {/* Status Pill */}
        <div className="flex items-center gap-2">
          {reel.recommendation === "approve" && (
            <span className="inline-flex items-center rounded-full border border-emerald-200/80 bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-900 dark:border-emerald-800/40 dark:bg-emerald-950/40 dark:text-emerald-300">
              Integrity Verified · Clean
            </span>
          )}
          {reel.recommendation === "manual_review_required" && (
            <span className="inline-flex items-center rounded-full border border-amber-200/80 bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-900 dark:border-amber-800/40 dark:bg-amber-950/40 dark:text-amber-300">
              Suspicious Telemetry · Review Required
            </span>
          )}
          {reel.recommendation === "reject_integrity_violation" && (
            <span className="inline-flex items-center rounded-full border border-rose-200/80 bg-rose-50 px-2.5 py-0.5 text-xs font-medium text-rose-900 dark:border-rose-800/40 dark:bg-rose-950/40 dark:text-rose-300">
              Integrity Violation Flagged
            </span>
          )}
        </div>
      </div>

      {/* AI Proctor Objective Statement */}
      <div className="rounded border border-border/80 bg-muted/20 p-3 text-xs leading-relaxed text-foreground font-body">
        <span className="font-medium text-foreground">AI Proctor Verdict: </span>
        <span className="text-muted-foreground">{reel.aiProctorVerdict}</span>
      </div>

      {/* Interactive 60s Reel Scrubber Track */}
      <div className="space-y-2 rounded border border-border/80 bg-background/50 p-4">
        <div className="flex items-center justify-between text-xs font-mono text-muted-foreground">
          <span>Reel Time: 00:{currentReelSecond.toString().padStart(2, "0")} / 01:00</span>
          <span>Actual Session Time: {formatSeconds(realCurrentSecond)} / {formatSeconds(reel.totalInterviewDurationSeconds)}</span>
        </div>

        {/* Scrubber Bar */}
        <div className="relative h-6 w-full cursor-pointer flex items-center" onClick={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          const clickX = e.clientX - rect.left;
          const pct = Math.max(0, Math.min(1, clickX / rect.width));
          handleSeek(Math.round(pct * 60));
        }}>
          {/* Base track */}
          <div className="h-2 w-full rounded-full bg-muted overflow-hidden relative">
            <div
              className="h-full bg-foreground/30 transition-all"
              style={{ width: `${(currentReelSecond / 60) * 100}%` }}
            />
          </div>

          {/* Incident Markers */}
          {reel.markers.map((marker) => (
            <button
              key={marker.id}
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleSeek(marker.secondInReel);
                setSelectedMarker(marker);
              }}
              title={`${marker.title} at ${formatSeconds(marker.realInterviewSecond)}`}
              className={`absolute h-3.5 w-3.5 -translate-x-1/2 rounded-full border-2 border-background transition-transform hover:scale-125 ${
                marker.severity === "high"
                  ? "bg-rose-500"
                  : marker.severity === "medium"
                  ? "bg-amber-500"
                  : "bg-slate-400"
              }`}
              style={{ left: `${(marker.secondInReel / 60) * 100}%` }}
            />
          ))}

          {/* Current playhead indicator */}
          <div
            className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 h-5 w-2 rounded bg-foreground pointer-events-none transition-all shadow-sm"
            style={{ left: `${(currentReelSecond / 60) * 100}%` }}
          />
        </div>

        {/* Selected Incident Inspector */}
        {selectedMarker ? (
          <div className="mt-3 flex items-start justify-between rounded border border-border/80 bg-card p-3 text-xs">
            <div>
              <div className="flex items-center gap-2">
                <span
                  className={`h-2 w-2 rounded-full ${
                    selectedMarker.severity === "high"
                      ? "bg-rose-500"
                      : selectedMarker.severity === "medium"
                      ? "bg-amber-500"
                      : "bg-slate-400"
                  }`}
                />
                <span className="font-medium text-foreground">{selectedMarker.title}</span>
                <span className="font-mono text-[11px] text-muted-foreground">
                  at {formatSeconds(selectedMarker.realInterviewSecond)}
                </span>
                <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground uppercase">
                  {selectedMarker.category}
                </span>
              </div>
              <p className="mt-1 text-muted-foreground">{selectedMarker.description}</p>
            </div>
            <button
              type="button"
              onClick={() => handleSeek(selectedMarker.secondInReel)}
              className="rounded border border-border/80 px-2 py-1 text-[11px] text-foreground hover:bg-muted"
            >
              Replay Moment
            </button>
          </div>
        ) : (
          <p className="text-center text-xs text-muted-foreground py-1">
            Click any incident marker above to inspect telemetry details.
          </p>
        )}
      </div>

      {/* Flagged Audit Clips List */}
      {reel.flaggedClips.length > 0 && (
        <div>
          <h4 className="text-xs font-medium text-muted-foreground">High-Priority Incident Clips</h4>
          <div className="mt-2 space-y-2">
            {reel.flaggedClips.map((clip) => (
              <div
                key={clip.clipNumber}
                className="flex items-center justify-between rounded border border-border/80 bg-background/40 px-3 py-2 text-xs"
              >
                <div className="flex items-center gap-2.5">
                  <span className="font-mono text-muted-foreground tabular-nums">
                    Clip {clip.clipNumber}: {formatSeconds(clip.startSecond)} – {formatSeconds(clip.endSecond)}
                  </span>
                  <span className="text-foreground">{clip.label}</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const reelSec = Math.round((clip.startSecond / reel.totalInterviewDurationSeconds) * 60);
                    handleSeek(reelSec);
                  }}
                  className="rounded border border-border/80 px-2 py-0.5 text-[11px] font-medium text-foreground hover:bg-muted"
                >
                  Jump
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TPO / Recruiter Audit Sign-Off */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-t border-border/80 pt-3">
        <span className="text-xs text-muted-foreground">
          {studentName ? `${studentName}'s` : "Candidate"} Session Audit Action:
        </span>
        <div className="flex items-center gap-2">
          {tpoDecision === "verified" ? (
            <span className="rounded bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
              ✓ Verified & Overridden Clean by TPO
            </span>
          ) : tpoDecision === "disqualified" ? (
            <span className="rounded bg-rose-50 px-3 py-1 text-xs font-medium text-rose-800 dark:bg-rose-950/40 dark:text-rose-300">
              ✕ Candidate Disqualified for Malpractice
            </span>
          ) : (
            <>
              <button
                type="button"
                onClick={() => setTpoDecision("verified")}
                className="rounded border border-border/80 bg-background px-3 py-1 text-xs font-medium text-foreground hover:bg-muted"
              >
                Approve & Mark Clean
              </button>
              <button
                type="button"
                onClick={() => setTpoDecision("disqualified")}
                className="rounded border border-rose-200 bg-rose-50 px-3 py-1 text-xs font-medium text-rose-800 hover:bg-rose-100 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-300"
              >
                Flag as Disqualified
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default ProctorAuditReel;
