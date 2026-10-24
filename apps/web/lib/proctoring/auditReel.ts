import {
  EventSeverity,
  ProctoringEvent,
  ProctoringEventType,
  ProctoringSummary,
  TrustBand,
} from "./types";

export interface AuditReelMarker {
  id: string;
  secondInReel: number; // 0 to 60 seconds
  realInterviewSecond: number; // Actual interview elapsed second
  type: ProctoringEventType;
  severity: EventSeverity;
  title: string;
  description: string;
  category: "screen" | "visual" | "audio" | "code";
}

export interface FlaggedAuditClip {
  clipNumber: number;
  label: string;
  startSecond: number;
  endSecond: number;
  severity: EventSeverity;
  reason: string;
}

export type ProctorRiskRecommendation =
  | "approve"
  | "manual_review_required"
  | "reject_integrity_violation";

export interface ProctorAuditReel {
  totalInterviewDurationSeconds: number;
  reelDurationSeconds: number; // 60 seconds fixed
  integrityScore: number;
  trustBand: TrustBand;
  recommendation: ProctorRiskRecommendation;
  aiProctorVerdict: string;
  markers: AuditReelMarker[];
  flaggedClips: FlaggedAuditClip[];
  metrics: {
    tabSwitches: number;
    visualViolations: number;
    audioAnomalies: number;
    codePastes: number;
    screenFocusPct: number;
    faceConfidencePct: number;
  };
}

/**
 * Maps proctoring event type to broad category.
 */
function getEventCategory(type: ProctoringEventType): "screen" | "visual" | "audio" | "code" {
  switch (type) {
    case "tab_switched":
    case "window_blur":
    case "fullscreen_exit":
    case "devtools_opened":
      return "screen";
    case "code_pasted":
    case "copy_attempt":
    case "context_menu_blocked":
      return "code";
    case "face_not_visible":
    case "multiple_faces_detected":
    case "looking_away":
      return "visual";
    case "audio_anomaly":
      return "audio";
  }
}

/**
 * Builds an automated 60-second condensed proctoring audit reel from an interview summary.
 */
export function buildProctorAuditReel(summary: ProctoringSummary): ProctorAuditReel {
  const duration = Math.max(summary.durationSeconds || 60, 60);
  const events = summary.events || [];

  // Sort events chronologically
  const sorted = [...events].sort((a, b) => a.timestampSeconds - b.timestampSeconds);

  // Map events onto the 60-second reel timeline
  const markers: AuditReelMarker[] = sorted.map((evt) => {
    // Map elapsed second onto 0-60 second scale
    const secondInReel = Math.min(59, Math.max(1, Math.round((evt.timestampSeconds / duration) * 60)));
    return {
      id: evt.id,
      secondInReel,
      realInterviewSecond: evt.timestampSeconds,
      type: evt.type,
      severity: evt.severity,
      title: evt.label,
      description: evt.description,
      category: getEventCategory(evt.type),
    };
  });

  // Cluster nearby events into flagged clips (10-second padded review windows)
  const highSev = sorted.filter((e) => e.severity === "high" || e.severity === "medium");
  const flaggedClips: FlaggedAuditClip[] = [];

  highSev.forEach((evt, idx) => {
    const start = Math.max(0, evt.timestampSeconds - 5);
    const end = Math.min(duration, evt.timestampSeconds + 15);

    // Merge with previous clip if overlapping
    const prev = flaggedClips[flaggedClips.length - 1];
    if (prev && start <= prev.endSecond + 5) {
      prev.endSecond = Math.max(prev.endSecond, end);
      prev.reason += `; ${evt.label}: ${evt.description}`;
      if (evt.severity === "high") prev.severity = "high";
    } else {
      flaggedClips.push({
        clipNumber: flaggedClips.length + 1,
        label: `Incident ${idx + 1}: ${evt.label}`,
        startSecond: start,
        endSecond: end,
        severity: evt.severity,
        reason: `${evt.label}: ${evt.description}`,
      });
    }
  });

  // Determine overall recommendation
  let recommendation: ProctorRiskRecommendation = "approve";
  if (summary.integrityScore < 60 || summary.trustBand === "critical") {
    recommendation = "reject_integrity_violation";
  } else if (summary.integrityScore < 85 || summary.trustBand === "suspicious" || summary.trustBand === "flagged") {
    recommendation = "manual_review_required";
  }

  // Generate automated AI Proctor Verdict text
  const parts: string[] = [];
  if (summary.integrityScore >= 90) {
    parts.push(`Candidate maintained exemplary session integrity (${summary.integrityScore}% score).`);
  } else if (summary.integrityScore >= 75) {
    parts.push(`Candidate demonstrated acceptable session integrity (${summary.integrityScore}% score) with minor telemetry alerts.`);
  } else {
    parts.push(`High integrity risk detected (${summary.integrityScore}% score). Significant non-compliance flags observed.`);
  }

  if (summary.tabSwitchesCount > 0) {
    parts.push(`${summary.tabSwitchesCount} tab switch${summary.tabSwitchesCount > 1 ? "es" : ""} recorded during assessment.`);
  }

  if (summary.pasteEventsCount > 0) {
    parts.push(`${summary.pasteEventsCount} external clipboard paste event${summary.pasteEventsCount > 1 ? "s" : ""} flagged in coding editor.`);
  }

  if (summary.faceViolationsCount > 0) {
    parts.push(`${summary.faceViolationsCount} visual posture/presence violation${summary.faceViolationsCount > 1 ? "s" : ""}.`);
  }

  if (summary.audioAnomaliesCount > 0) {
    parts.push(`${summary.audioAnomaliesCount} secondary audio spike${summary.audioAnomaliesCount > 1 ? "s" : ""} detected.`);
  }

  if (flaggedClips.length > 0) {
    parts.push(`Automated reel highlighted ${flaggedClips.length} review clip${flaggedClips.length > 1 ? "s" : ""} totaling ${flaggedClips.reduce((acc, c) => acc + (c.endSecond - c.startSecond), 0)}s for TPO inspection.`);
  } else {
    parts.push("No severe integrity anomalies required video review.");
  }

  return {
    totalInterviewDurationSeconds: duration,
    reelDurationSeconds: 60,
    integrityScore: summary.integrityScore,
    trustBand: summary.trustBand,
    recommendation,
    aiProctorVerdict: parts.join(" "),
    markers,
    flaggedClips,
    metrics: {
      tabSwitches: summary.tabSwitchesCount,
      visualViolations: summary.faceViolationsCount,
      audioAnomalies: summary.audioAnomaliesCount,
      codePastes: summary.pasteEventsCount,
      screenFocusPct: summary.categoryBreakdown.screenFocusScore,
      faceConfidencePct: summary.categoryBreakdown.visualFocusScore,
    },
  };
}
