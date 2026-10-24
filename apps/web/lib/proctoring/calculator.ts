/**
 * Proctoring Integrity Score Calculator.
 * Evaluates session telemetry and computes the overall Integrity Index (0-100),
 * category subscores, and trust band classification.
 */

import type {
  IntegrityCategoryBreakdown,
  ProctoringEvent,
  ProctoringEventType,
  ProctoringSummary,
  TrustBand,
} from "./types";

const EVENT_PENALTIES: Record<ProctoringEventType, number> = {
  tab_switched: 8,
  fullscreen_exit: 10,
  window_blur: 4,
  devtools_opened: 22,
  code_pasted: 15,
  copy_attempt: 4,
  context_menu_blocked: 3,
  face_not_visible: 8,
  multiple_faces_detected: 25,
  looking_away: 5,
  audio_anomaly: 6,
};

export function getTrustBand(score: number): TrustBand {
  if (score >= 90) return "clean";
  if (score >= 75) return "suspicious";
  if (score >= 50) return "flagged";
  return "critical";
}

export function calculateProctoringSummary(
  events: ProctoringEvent[],
  startedAt: string,
  endedAt?: string,
  durationSeconds: number = 0,
): ProctoringSummary {
  let tabSwitchesCount = 0;
  let fullscreenExitsCount = 0;
  let windowBlursCount = 0;
  let pasteEventsCount = 0;
  let faceViolationsCount = 0;
  let audioAnomaliesCount = 0;

  let screenPenalty = 0;
  let codePenalty = 0;
  let visualPenalty = 0;
  let audioPenalty = 0;

  for (const event of events) {
    const penalty = EVENT_PENALTIES[event.type] ?? 5;

    switch (event.type) {
      case "tab_switched":
        tabSwitchesCount++;
        screenPenalty += penalty;
        break;
      case "fullscreen_exit":
        fullscreenExitsCount++;
        screenPenalty += penalty;
        break;
      case "window_blur":
        windowBlursCount++;
        screenPenalty += penalty;
        break;
      case "devtools_opened":
        screenPenalty += penalty;
        break;
      case "code_pasted":
        pasteEventsCount++;
        codePenalty += penalty;
        break;
      case "copy_attempt":
      case "context_menu_blocked":
        codePenalty += penalty;
        break;
      case "face_not_visible":
      case "multiple_faces_detected":
      case "looking_away":
        faceViolationsCount++;
        visualPenalty += penalty;
        break;
      case "audio_anomaly":
        audioAnomaliesCount++;
        audioPenalty += penalty;
        break;
    }
  }

  // Calculate category subscores (0-100)
  const screenFocusScore = Math.max(0, Math.min(100, 100 - screenPenalty));
  const codeIntegrityScore = Math.max(0, Math.min(100, 100 - codePenalty));
  const visualFocusScore = Math.max(0, Math.min(100, 100 - visualPenalty));
  const audioIntegrityScore = Math.max(0, Math.min(100, 100 - audioPenalty));

  // Overall Integrity Index:
  // Starts at 100, directly deducting infraction severity with floor at 0.
  const directDeductions = Math.round(
    screenPenalty * 0.85 + codePenalty * 1.1 + visualPenalty * 0.9 + audioPenalty * 0.75,
  );
  const integrityScore = Math.max(0, Math.min(100, 100 - directDeductions));
  const trustBand = getTrustBand(integrityScore);

  // Derived eye contact and posture stability metrics
  const eyeContactPct = Math.max(10, Math.min(100, Math.round(visualFocusScore * 0.95)));
  const postureStabilityPct = Math.max(15, Math.min(100, Math.round(visualFocusScore * 0.9 + 10)));

  const categoryBreakdown: IntegrityCategoryBreakdown = {
    screenFocusScore,
    codeIntegrityScore,
    visualFocusScore,
    audioIntegrityScore,
  };

  return {
    integrityScore,
    trustBand,
    tabSwitchesCount,
    fullscreenExitsCount,
    windowBlursCount,
    pasteEventsCount,
    faceViolationsCount,
    audioAnomaliesCount,
    totalInfractions: events.length,
    eyeContactPct,
    postureStabilityPct,
    categoryBreakdown,
    events,
    startedAt,
    endedAt,
    durationSeconds,
  };
}
