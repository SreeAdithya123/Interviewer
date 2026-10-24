/**
 * Proctoring & Placement Integrity Suite Types.
 * Defines integrity events, scoring penalties, proctoring timeline entries,
 * and comprehensive audit telemetry.
 */

export type ProctoringEventType =
  | "tab_switched"
  | "window_blur"
  | "fullscreen_exit"
  | "devtools_opened"
  | "code_pasted"
  | "copy_attempt"
  | "context_menu_blocked"
  | "face_not_visible"
  | "multiple_faces_detected"
  | "looking_away"
  | "audio_anomaly";

export type EventSeverity = "low" | "medium" | "high";

export type TrustBand = "clean" | "suspicious" | "flagged" | "critical";

export interface ProctoringEvent {
  id: string;
  timestampSeconds: number; // Seconds elapsed since interview started
  isoTimestamp: string;
  type: ProctoringEventType;
  severity: EventSeverity;
  label: string;
  description: string;
  metadata?: Record<string, unknown>;
}

export interface IntegrityCategoryBreakdown {
  screenFocusScore: number; // 0-100
  codeIntegrityScore: number; // 0-100
  visualFocusScore: number; // 0-100
  audioIntegrityScore: number; // 0-100
}

export interface ProctoringSummary {
  integrityScore: number; // Overall composite score (0-100)
  trustBand: TrustBand;
  tabSwitchesCount: number;
  fullscreenExitsCount: number;
  windowBlursCount: number;
  pasteEventsCount: number;
  faceViolationsCount: number;
  audioAnomaliesCount: number;
  totalInfractions: number;
  eyeContactPct: number;
  postureStabilityPct: number;
  categoryBreakdown: IntegrityCategoryBreakdown;
  events: ProctoringEvent[];
  startedAt: string;
  endedAt?: string;
  durationSeconds: number;
}
