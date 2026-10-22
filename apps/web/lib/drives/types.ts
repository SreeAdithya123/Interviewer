/**
 * Type definitions for the Placement Drive Management Operating System.
 * Tailored for Indian engineering college campus placement cells (TPOs)
 * and student placement preparation.
 */

export type DriveStatus = "upcoming" | "active" | "completed";

export type CandidateStatus =
  | "eligible"
  | "applied"
  | "round_1_cleared"
  | "round_2_cleared"
  | "shortlisted"
  | "selected"
  | "not_qualified";

export interface DriveRound {
  roundNumber: number;
  name: string;
  type: "coding" | "technical" | "hr" | "aptitude" | "behavioral";
  description: string;
  durationMinutes: number;
  cutoffScore: number;
}

export interface EligibilityCriteria {
  minReadinessScore: number; // e.g. 70 means >= 70%
  targetBatches: string[]; // e.g. ["2026 Batch", "2025 Batch"]
  allowedDepartments: string[]; // e.g. ["Computer Science", "Information Technology", "Electronics"]
  maxActiveBacklogs: number; // e.g. 0
}

export interface PlacementDrive {
  id: string;
  collegeId: string | null;
  companyName: string;
  companyLogoText: string;
  companyColor: string;
  targetRole: string;
  jobDescription: string;
  packageCtc: string; // e.g. "12.0 LPA", "9.0 LPA"
  location: string;
  applicationDeadline: string;
  driveDate: string;
  status: DriveStatus;
  eligibility: EligibilityCriteria;
  rounds: DriveRound[];
  totalApplicants: number;
  shortlistedCount: number;
  createdAt: string;
}

export interface DriveCandidate {
  id: string;
  driveId: string;
  studentId: string;
  studentName: string;
  studentEmail: string;
  department: string;
  batchName: string;
  status: CandidateStatus;
  overallScore: number | null;
  codingScore: number | null;
  communicationScore: number | null;
  integrityIndex: number; // e.g. 98%
  currentRound: number;
  interviewId?: string;
  appliedAt: string;
  notes?: string;
}

export interface EligibilityResult {
  isEligible: boolean;
  reasons: string[];
  currentScore: number | null;
  requiredScore: number;
}
