"use client";

/**
 * In-memory, per-tab store for recorded answer clips. There is no R2 (or
 * any other) upload wired up yet, so `interview_turns.answer_audio_key`
 * stays null for every stub turn (see
 * supabase/migrations/20261017180000_interview_stub_bridge.sql) — the
 * actual audio blobs never leave the browser. This module just lets the
 * interview room hand its recordings to the report page without a real
 * backing store, by keeping them in memory for the lifetime of this
 * browser tab's JS runtime (survives the client-side navigation from the
 * room to its report page; lost on a full page reload — the report page
 * falls back to "recording unavailable" per turn when that happens).
 *
 * TODO(phase-1): once R2 upload exists, replace this with a real upload
 * in the room and a real fetch-by-key in the report page.
 */

const store = new Map<string, Map<number, Blob>>();

export function saveTurnAudio(interviewId: string, turnNumber: number, blob: Blob) {
  if (!store.has(interviewId)) store.set(interviewId, new Map());
  store.get(interviewId)!.set(turnNumber, blob);
}

export function getTurnAudio(interviewId: string, turnNumber: number): Blob | null {
  return store.get(interviewId)?.get(turnNumber) ?? null;
}
