import { describe, expect, it } from "vitest";
import { buildProctorAuditReel } from "./auditReel";
import { ProctoringSummary } from "./types";

describe("60-Second Automated Proctoring Audit Reel", () => {
  const baseSummary: ProctoringSummary = {
    integrityScore: 92,
    trustBand: "clean",
    tabSwitchesCount: 0,
    fullscreenExitsCount: 0,
    windowBlursCount: 0,
    pasteEventsCount: 0,
    faceViolationsCount: 0,
    audioAnomaliesCount: 0,
    totalInfractions: 0,
    eyeContactPct: 95,
    postureStabilityPct: 98,
    categoryBreakdown: {
      screenFocusScore: 100,
      codeIntegrityScore: 100,
      visualFocusScore: 95,
      audioIntegrityScore: 98,
    },
    events: [],
    startedAt: "2026-10-24T10:00:00Z",
    durationSeconds: 1800, // 30 minutes
  };

  it("builds a 60-second condensed audit reel for a clean session", () => {
    const reel = buildProctorAuditReel(baseSummary);

    expect(reel.reelDurationSeconds).toBe(60);
    expect(reel.totalInterviewDurationSeconds).toBe(1800);
    expect(reel.recommendation).toBe("approve");
    expect(reel.aiProctorVerdict).toContain("exemplary session integrity");
    expect(reel.flaggedClips.length).toBe(0);
    expect(reel.markers.length).toBe(0);
  });

  it("identifies high-severity incidents, clusters clips, and maps 0-60s markers", () => {
    const suspiciousSummary: ProctoringSummary = {
      ...baseSummary,
      integrityScore: 68,
      trustBand: "suspicious",
      tabSwitchesCount: 2,
      pasteEventsCount: 1,
      totalInfractions: 3,
      events: [
        {
          id: "evt_1",
          timestampSeconds: 300, // 5th minute (out of 30) -> ~10s in reel
          isoTimestamp: "2026-10-24T10:05:00Z",
          type: "tab_switched",
          severity: "high",
          label: "Tab Switch Detected",
          description: "Candidate switched to external browser tab",
        },
        {
          id: "evt_2",
          timestampSeconds: 308, // 8 seconds later -> should merge into same clip!
          isoTimestamp: "2026-10-24T10:05:08Z",
          type: "code_pasted",
          severity: "high",
          label: "Large Code Paste",
          description: "240 characters pasted into Monaco editor",
        },
        {
          id: "evt_3",
          timestampSeconds: 1200, // 20th minute -> ~40s in reel
          isoTimestamp: "2026-10-24T10:20:00Z",
          type: "tab_switched",
          severity: "medium",
          label: "Tab Switched",
          description: "Candidate blurred browser focus",
        },
      ],
    };

    const reel = buildProctorAuditReel(suspiciousSummary);

    expect(reel.recommendation).toBe("manual_review_required");
    expect(reel.markers.length).toBe(3);
    // Events at 300s and 308s should map to ~10s in the 60s reel
    expect(reel.markers[0].secondInReel).toBe(10);
    expect(reel.markers[1].secondInReel).toBe(10);
    expect(reel.markers[2].secondInReel).toBe(40);

    // High severity events close together should be clustered into flagged clips
    expect(reel.flaggedClips.length).toBe(2);
    expect(reel.flaggedClips[0].reason).toContain("Tab Switch Detected");
    expect(reel.flaggedClips[0].reason).toContain("Large Code Paste");
    expect(reel.aiProctorVerdict).toContain("2 tab switches");
    expect(reel.aiProctorVerdict).toContain("1 external clipboard paste event");
  });

  it("recommends rejection when score drops below 60", () => {
    const criticalSummary: ProctoringSummary = {
      ...baseSummary,
      integrityScore: 45,
      trustBand: "critical",
      totalInfractions: 9,
    };

    const reel = buildProctorAuditReel(criticalSummary);
    expect(reel.recommendation).toBe("reject_integrity_violation");
  });
});
