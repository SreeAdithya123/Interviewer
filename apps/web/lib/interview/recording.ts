/**
 * Small browser-recording helpers shared by the interview room. These are
 * real browser APIs (MediaRecorder, getUserMedia) — nothing here is
 * stubbed; only the question/transcript/scoring content elsewhere is.
 */

/** Opus/WebM per BUILD_SPEC Part 4.5 step 3, with graceful fallbacks for
 * browsers that don't support that exact codec string. */
export function pickSupportedMimeType(): string | undefined {
  if (typeof MediaRecorder === "undefined") return undefined;
  const candidates = ["audio/webm;codecs=opus", "audio/webm", "audio/ogg;codecs=opus"];
  for (const type of candidates) {
    if (MediaRecorder.isTypeSupported(type)) return type;
  }
  return undefined;
}

export function formatClock(totalSeconds: number): string {
  const safe = Math.max(0, Math.round(totalSeconds));
  const minutes = Math.floor(safe / 60);
  const seconds = safe % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}
