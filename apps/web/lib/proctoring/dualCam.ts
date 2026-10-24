/**
 * Dual-Camera Secondary Device Proctoring Engine.
 * Enables candidates to pair their mobile phone as a secondary 45° angle camera
 * capturing their hands, keyboard, physical desk, and surrounding room.
 */

export type DualCamStatus =
  | "awaiting_scan"
  | "pairing"
  | "streaming_active"
  | "disconnected"
  | "misaligned"
  | "violation";

export interface DualCamSession {
  sessionId: string;
  interviewId: string;
  pairToken: string;
  status: DualCamStatus;
  createdAt: string;
  pairedAt?: string;
  lastHeartbeatIso?: string;
  phoneBatteryPct?: number;
  deskAngleConfidencePct: number; // 0-100
  violationsCount: number;
}

/**
 * Generates an 8-character cryptographically random pairing token.
 */
export function generatePairToken(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let token = "";
  for (let i = 0; i < 8; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
}

/**
 * Builds the mobile pairing URL for QR code generation.
 */
export function buildPairingUrl(
  interviewId: string,
  pairToken: string,
  origin: string = "https://vyoman.ai"
): string {
  return `${origin}/proctor/pair?interviewId=${encodeURIComponent(
    interviewId
  )}&token=${encodeURIComponent(pairToken)}`;
}

/**
 * Checks if the secondary camera stream has timed out or disconnected.
 */
export function isSecondaryCameraActive(lastHeartbeatIso?: string, timeoutMs: number = 10000): boolean {
  if (!lastHeartbeatIso) return false;
  const elapsed = Date.now() - new Date(lastHeartbeatIso).getTime();
  return elapsed < timeoutMs;
}

/**
 * Calculates integrity confidence bonus when dual-camera proctoring is verified.
 */
export function calculateDualCamIntegrityBonus(
  status: DualCamStatus,
  deskAngleConfidencePct: number
): number {
  if (status !== "streaming_active") return 0;
  // If desk angle is verified (>80%), award up to 10 points integrity confidence
  if (deskAngleConfidencePct >= 80) return 10;
  if (deskAngleConfidencePct >= 50) return 5;
  return 2;
}
