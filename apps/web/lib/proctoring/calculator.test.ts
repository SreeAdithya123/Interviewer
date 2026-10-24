import { describe, it, expect } from "vitest";
import { calculateProctoringSummary, getTrustBand } from "./calculator";
import type { ProctoringEvent } from "./types";

describe("Proctoring Integrity Calculator", () => {
  it("computes 100% clean score for an event-free session", () => {
    const summary = calculateProctoringSummary([], "2026-10-24T10:00:00Z", "2026-10-24T10:15:00Z", 900);

    expect(summary.integrityScore).toBe(100);
    expect(summary.trustBand).toBe("clean");
    expect(summary.totalInfractions).toBe(0);
    expect(summary.tabSwitchesCount).toBe(0);
    expect(summary.categoryBreakdown.screenFocusScore).toBe(100);
    expect(summary.categoryBreakdown.codeIntegrityScore).toBe(100);
    expect(summary.categoryBreakdown.visualFocusScore).toBe(100);
  });

  it("deducts points for tab switches and flags session appropriately", () => {
    const events: ProctoringEvent[] = [
      {
        id: "evt-1",
        timestampSeconds: 120,
        isoTimestamp: new Date().toISOString(),
        type: "tab_switched",
        severity: "medium",
        label: "Tab Switched",
        description: "User switched to another tab",
      },
      {
        id: "evt-2",
        timestampSeconds: 140,
        isoTimestamp: new Date().toISOString(),
        type: "fullscreen_exit",
        severity: "high",
        label: "Fullscreen Exited",
        description: "User exited fullscreen mode",
      },
    ];

    const summary = calculateProctoringSummary(events, "2026-10-24T10:00:00Z", undefined, 300);

    expect(summary.tabSwitchesCount).toBe(1);
    expect(summary.fullscreenExitsCount).toBe(1);
    expect(summary.integrityScore).toBe(85);
    expect(summary.categoryBreakdown.screenFocusScore).toBe(82); // 100 - (8 + 10)
    expect(summary.trustBand).toBe("suspicious");
  });

  it("marks session as flagged or critical when severe violations accumulate", () => {
    const severeEvents: ProctoringEvent[] = [
      {
        id: "evt-1",
        timestampSeconds: 30,
        isoTimestamp: new Date().toISOString(),
        type: "multiple_faces_detected",
        severity: "high",
        label: "Multiple Faces",
        description: "Two individuals detected in frame",
      },
      {
        id: "evt-2",
        timestampSeconds: 60,
        isoTimestamp: new Date().toISOString(),
        type: "code_pasted",
        severity: "high",
        label: "Code Block Pasted",
        description: "Large 1500 char snippet pasted",
      },
      {
        id: "evt-3",
        timestampSeconds: 90,
        isoTimestamp: new Date().toISOString(),
        type: "tab_switched",
        severity: "medium",
        label: "Tab Switched",
        description: "Left assessment screen",
      },
      {
        id: "evt-4",
        timestampSeconds: 110,
        isoTimestamp: new Date().toISOString(),
        type: "devtools_opened",
        severity: "high",
        label: "DevTools Opened",
        description: "F12 inspect activated",
      },
    ];

    const summary = calculateProctoringSummary(severeEvents, "2026-10-24T10:00:00Z", undefined, 600);

    expect(summary.integrityScore).toBeLessThan(50);
    expect(summary.trustBand).toBe("critical");
  });

  it("properly maps trust bands", () => {
    expect(getTrustBand(95)).toBe("clean");
    expect(getTrustBand(85)).toBe("suspicious");
    expect(getTrustBand(60)).toBe("flagged");
    expect(getTrustBand(40)).toBe("critical");
  });
});
