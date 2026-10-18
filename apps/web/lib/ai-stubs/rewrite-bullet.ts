// TODO(phase-1): replace with a real Gemini call once GEMINI_API_KEY exists
// (docs/BUILD_SPEC.md Part 2 model table + Part 4.3). This stub exists so
// the "AI bullet rewriting" UI (components/resume/BulletField.tsx) can be
// built and exercised end to end before the provider key is available.
//
// Structural rule this stub already enforces, and the real Gemini prompt
// must keep enforcing: NEVER invent a number. If the input bullet has no
// digit, this returns a `needsMetric` result asking a specific follow-up
// question instead of fabricating one — the real integration slots in here
// without any change to the UI contract (RewriteResult's shape is final).

export type RewriteResult =
  | { kind: "rewritten"; text: string }
  | { kind: "needs_metric"; question: string };

const ACTION_VERBS = [
  "Drove",
  "Led",
  "Built",
  "Delivered",
  "Improved",
  "Streamlined",
  "Shipped",
];

function hasNumber(text: string): boolean {
  return /\d/.test(text);
}

function pickActionVerb(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) % ACTION_VERBS.length;
  }
  return ACTION_VERBS[Math.abs(hash) % ACTION_VERBS.length];
}

/**
 * MOCK bullet rewrite — returns a realistic-shaped but fake "action + result"
 * rewrite of a resume bullet. Never calls a network provider.
 *
 * - If `bullet` already contains a number (a metric), returns a rewritten
 *   version that keeps that exact number (never changes or adds digits).
 * - If `bullet` has no number, returns `needs_metric` with a specific
 *   question — the caller should show that question, collect the answer,
 *   and call `applyMetricAnswer` to fold it in, mirroring exactly how the
 *   real Gemini-backed version must behave per the spec's "never invent a
 *   number" rule.
 */
export async function rewriteBullet(bullet: string): Promise<RewriteResult> {
  // Simulated latency so the UI's loading state is exercised realistically.
  await new Promise((resolve) => setTimeout(resolve, 600));

  const trimmed = bullet.trim();
  if (!trimmed) {
    return { kind: "needs_metric", question: "What did you work on? Add a few words first." };
  }

  if (!hasNumber(trimmed)) {
    return {
      kind: "needs_metric",
      question:
        "This bullet has no number yet — what's one measurable result? (e.g. users reached, time saved, % improvement)",
    };
  }

  const verb = pickActionVerb(trimmed);
  const body = trimmed.replace(/^(i|we)\s+/i, "").replace(/^[a-z]/, (c) => c.toLowerCase());
  return {
    kind: "rewritten",
    text: `${verb} ${body}${body.endsWith(".") ? "" : "."} [Preview rewrite — not yet connected to the real engine]`,
  };
}

/**
 * Folds a student's answer to a `needs_metric` follow-up question back into
 * the original bullet, then runs the (still mock) rewrite again. The metric
 * always comes from the student's own words, never invented here.
 */
export async function applyMetricAnswer(bullet: string, metricAnswer: string): Promise<RewriteResult> {
  const combined = `${bullet.trim()} (${metricAnswer.trim()})`;
  return rewriteBullet(combined);
}
