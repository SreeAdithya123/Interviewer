// Shared readiness-band classification for the college admin dashboard
// (BUILD_SPEC Part 4.7's Overview and Students table both bucket a
// student by their latest completed interview_reports.overall_score), so
// the two pages can't quietly drift on what "Ready" means.
//
// BUILD_SPEC never defines what readiness means numerically, and
// interview_reports.overall_score has no documented scale yet — the
// evaluation harness that actually produces it is Phase 1/4 work, still
// blocked on provider keys. Assuming a 0-100 scale here, matching
// eye_contact_pct/posture_stability_pct's own numeric(5,2) "pct" columns on
// the same table. Recorded in docs/DECISIONS.md; revisit once the real
// evaluation prompt fixes overall_score's actual scale.
export type ReadinessBand = "ready" | "developing" | "needs_practice" | "not_yet_assessed";

export const READINESS_BANDS: ReadinessBand[] = ["ready", "developing", "needs_practice", "not_yet_assessed"];

export const READINESS_LABEL: Record<ReadinessBand, string> = {
  ready: "Ready",
  developing: "Developing",
  needs_practice: "Needs practice",
  not_yet_assessed: "Not yet assessed",
};

export function readinessBand(score: number | null): ReadinessBand {
  if (score === null) return "not_yet_assessed";
  if (score >= 75) return "ready";
  if (score >= 50) return "developing";
  return "needs_practice";
}
