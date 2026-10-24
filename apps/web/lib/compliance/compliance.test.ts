import { describe, expect, it } from "vitest";
import {
  createConsentRecord,
  isConsentActiveAndValid,
  withdrawConsent,
} from "./consent";
import { evaluatePurgeCandidates } from "./retention";

describe("India DPDP Act (2023) & SOC 2 Compliance Suite", () => {
  it("creates compliant candidate consent record with anonymized IP hash", () => {
    const record = createConsentRecord(
      "cand_101",
      "student@sasi.ac.in",
      {
        audioRecording: true,
        webcamProctoring: true,
        screenFocusTelemetry: true,
        resumeStorageAndAnalysis: true,
        scoreSharingWithCollegeAndRecruiters: true,
      },
      "103.21.124.50"
    );

    expect(record.status).toBe("granted");
    expect(record.noticeVersion).toBe("v2.1-dpdp-2023");
    expect(record.ipAddressHash).toContain("ip_");
    expect(isConsentActiveAndValid(record)).toBe(true);
  });

  it("handles candidate right to withdraw consent", () => {
    const record = createConsentRecord("cand_102", "user@college.edu", {
      audioRecording: true,
      webcamProctoring: true,
      screenFocusTelemetry: true,
      resumeStorageAndAnalysis: false,
      scoreSharingWithCollegeAndRecruiters: false,
    });

    const withdrawn = withdrawConsent(record);
    expect(withdrawn.status).toBe("withdrawn");
    expect(withdrawn.withdrawnAt).toBeDefined();
    expect(isConsentActiveAndValid(withdrawn)).toBe(false);
  });

  it("evaluates expired records for automated retention purge", () => {
    const now = Date.now();
    const ninetyOneDaysAgo = new Date(now - 91 * 24 * 60 * 60 * 1000).toISOString();
    const tenDaysAgo = new Date(now - 10 * 24 * 60 * 60 * 1000).toISOString();

    const items = [
      { id: "audio_old", createdAt: ninetyOneDaysAgo, type: "audio" as const },
      { id: "audio_recent", createdAt: tenDaysAgo, type: "audio" as const },
      { id: "score_old", createdAt: ninetyOneDaysAgo, type: "scorecard" as const }, // Scorecards retained for 180 days
    ];

    const result = evaluatePurgeCandidates(items, undefined, now);
    expect(result.itemsToPurge.length).toBe(1);
    expect(result.itemsToPurge[0].id).toBe("audio_old");
    expect(result.itemsRetained.length).toBe(2);
  });
});
