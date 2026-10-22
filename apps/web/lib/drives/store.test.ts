import { describe, expect, it } from "vitest";
import {
  checkStudentEligibility,
  createPlacementDrive,
  DEFAULT_CAMPUS_DRIVES,
  getDriveCandidates,
  getPlacementDriveById,
  getPlacementDrives,
  updateCandidateStatus,
} from "./store";

describe("Placement Drive Store & Eligibility Engine", () => {
  it("returns default campus drives", async () => {
    const drives = await getPlacementDrives();
    expect(drives.length).toBeGreaterThanOrEqual(3);
    expect(drives.some((d) => d.companyName === "Amazon")).toBe(true);
    expect(drives.some((d) => d.companyName.includes("TCS"))).toBe(true);
  });

  it("retrieves a drive by its id", async () => {
    const drive = await getPlacementDriveById("drive-amazon-sde-2026");
    expect(drive).not.toBeNull();
    expect(drive?.companyName).toBe("Amazon");
    expect(drive?.eligibility.minReadinessScore).toBe(75);
    expect(drive?.rounds.length).toBe(3);
  });

  it("accurately verifies student eligibility", () => {
    const drive = DEFAULT_CAMPUS_DRIVES[0]; // Amazon drive: cutoff 75%, CSE/IT/ECE

    // Eligible student
    const eligibleStudent = {
      department: "Computer Science",
      batchName: "2026 Batch",
      graduationYear: 2026,
    };
    const eligibleResult = checkStudentEligibility(drive, eligibleStudent, 82);
    expect(eligibleResult.isEligible).toBe(true);
    expect(eligibleResult.reasons.length).toBe(0);

    // Ineligible student: below cutoff score
    const lowScoreResult = checkStudentEligibility(drive, eligibleStudent, 68);
    expect(lowScoreResult.isEligible).toBe(false);
    expect(lowScoreResult.reasons.some((r) => r.includes("below the drive cutoff"))).toBe(true);

    // Ineligible student: unassessed (null score)
    const unassessedResult = checkStudentEligibility(drive, eligibleStudent, null);
    expect(unassessedResult.isEligible).toBe(false);
    expect(unassessedResult.reasons.some((r) => r.includes("Complete at least 1 mock interview"))).toBe(true);

    // Ineligible student: non-matching department
    const wrongDeptStudent = {
      department: "Civil Engineering",
      batchName: "2026 Batch",
    };
    const wrongDeptResult = checkStudentEligibility(drive, wrongDeptStudent, 88);
    expect(wrongDeptResult.isEligible).toBe(false);
    expect(wrongDeptResult.reasons.some((r) => r.includes("Civil Engineering"))).toBe(true);
  });

  it("updates candidate shortlisting status and syncs drive shortlist counter", async () => {
    const candidates = await getDriveCandidates("drive-amazon-sde-2026");
    expect(candidates.length).toBeGreaterThan(0);

    const first = candidates[0];
    const updated = await updateCandidateStatus(first.id, "selected", "Outstanding performance");
    expect(updated?.status).toBe("selected");
    expect(updated?.notes).toBe("Outstanding performance");

    const drive = await getPlacementDriveById("drive-amazon-sde-2026");
    expect(drive?.shortlistedCount).toBeGreaterThanOrEqual(1);
  });

  it("creates a new placement drive and adds it to the drive catalog", async () => {
    const newDrive = await createPlacementDrive({
      collegeId: "col-123",
      companyName: "Google",
      companyLogoText: "GOOG",
      companyColor: "#4285F4",
      targetRole: "Software Engineer - Early Career",
      jobDescription: "Join Google engineering working on Search, Android, and Cloud platforms.",
      packageCtc: "32.0 LPA",
      location: "Bangalore",
      applicationDeadline: "2026-12-01T00:00:00Z",
      driveDate: "2026-12-05T09:00:00Z",
      status: "upcoming",
      eligibility: {
        minReadinessScore: 80,
        targetBatches: ["2026 Batch"],
        allowedDepartments: ["Computer Science", "Information Technology"],
        maxActiveBacklogs: 0,
      },
      rounds: [
        {
          roundNumber: 1,
          name: "DSA Coding Challenge",
          type: "coding",
          description: "Online coding test",
          durationMinutes: 60,
          cutoffScore: 80,
        },
      ],
    });

    expect(newDrive.id).toBeDefined();
    expect(newDrive.companyName).toBe("Google");

    const retrieved = await getPlacementDriveById(newDrive.id);
    expect(retrieved?.targetRole).toBe("Software Engineer - Early Career");
  });
});
