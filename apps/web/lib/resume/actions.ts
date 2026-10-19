"use server";

/**
 * Server Actions for resume AI features. Runs server-side only so it can
 * read the signed-in user via getCurrentProfile() before calling the
 * engine (which trusts its caller, same reasoning as lib/interview/actions.ts).
 *
 * Replaces apps/web/lib/ai-stubs/rewrite-bullet.ts now that the real
 * engine route exists (POST /resume/bullet/rewrite). Returns the exact
 * same RewriteResult-shaped discriminated union the stub did, so
 * components/resume/BulletField.tsx needed only its import line changed.
 */

import { getCurrentProfile } from "@/lib/auth/current-profile";
import { engineRewriteBullet } from "@/lib/resume/engine-client";

export type RewriteResult =
  | { kind: "rewritten"; text: string }
  | { kind: "needs_metric"; question: string };

async function requireSignedInProfile() {
  const profile = await getCurrentProfile();
  if (!profile) {
    throw new Error("You must be signed in to do this.");
  }
  return profile;
}

export async function rewriteBullet(bullet: string): Promise<RewriteResult> {
  const profile = await requireSignedInProfile();
  const result = await engineRewriteBullet(bullet, profile.id, profile.college_id);
  if (result.kind === "rewritten" && result.text) {
    return { kind: "rewritten", text: result.text };
  }
  if (result.kind === "needs_metric" && result.question) {
    return { kind: "needs_metric", question: result.question };
  }
  throw new Error("The engine returned an unexpected bullet-rewrite response.");
}

/** Folds a student's answer to a `needs_metric` follow-up question back
 * into the original bullet, then asks for a rewrite again — same call,
 * no separate engine endpoint, matching the stub's own behavior. */
export async function applyMetricAnswer(bullet: string, metricAnswer: string): Promise<RewriteResult> {
  return rewriteBullet(`${bullet.trim()} (${metricAnswer.trim()})`);
}
