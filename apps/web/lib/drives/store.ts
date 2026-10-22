/**
 * Placement Drive Data Store & Service.
 * Manages campus placement drives, student eligibility checks,
 * candidate leaderboards, and shortlisting pipelines.
 */

import type {
  CandidateStatus,
  DriveCandidate,
  DriveStatus,
  EligibilityResult,
  PlacementDrive,
} from "./types";

export const DEFAULT_CAMPUS_DRIVES: PlacementDrive[] = [
  {
    id: "drive-amazon-sde-2026",
    collegeId: null, // Open to all college batches
    companyName: "Amazon",
    companyLogoText: "AMZN",
    companyColor: "#FF9900",
    targetRole: "Software Development Engineer (SDE-1)",
    jobDescription:
      "Join Amazon as an SDE-1 working on high-scale distributed systems, AWS cloud infrastructure, and customer-facing algorithms. Requires strong problem-solving in Data Structures, Algorithms (Arrays, Hash Maps, Trees, DP), and clean code execution.",
    packageCtc: "16.5 - 28.0 LPA",
    location: "Hyderabad / Bangalore / Chennai",
    applicationDeadline: "2026-11-15T23:59:59Z",
    driveDate: "2026-11-20T09:00:00Z",
    status: "active",
    eligibility: {
      minReadinessScore: 75,
      targetBatches: ["2026 Batch", "2025 Batch", "Class of 2026"],
      allowedDepartments: [
        "Computer Science",
        "Information Technology",
        "Electronics & Communication",
        "Data Science",
        "Artificial Intelligence",
      ],
      maxActiveBacklogs: 0,
    },
    rounds: [
      {
        roundNumber: 1,
        name: "Online Technical Coding Assessment",
        type: "coding",
        description: "Hands-on algorithmic coding challenge (2 DSA questions) in the live sandbox.",
        durationMinutes: 45,
        cutoffScore: 75,
      },
      {
        roundNumber: 2,
        name: "Technical Architecture & System Design",
        type: "technical",
        description: "Deep dive into time/space complexities, caching patterns, and database trade-offs.",
        durationMinutes: 40,
        cutoffScore: 70,
      },
      {
        roundNumber: 3,
        name: "Leadership Principles & Bar Raiser HR",
        type: "hr",
        description: "Evaluation against Amazon Leadership Principles (Customer Obsession, Ownership, Bias for Action).",
        durationMinutes: 30,
        cutoffScore: 70,
      },
    ],
    totalApplicants: 142,
    shortlistedCount: 28,
    createdAt: "2026-10-18T10:00:00Z",
  },
  {
    id: "drive-tcs-digital-2026",
    collegeId: null,
    companyName: "Tata Consultancy Services (TCS Digital)",
    companyLogoText: "TCS",
    companyColor: "#0070BA",
    targetRole: "Digital Innovator / Software Engineer",
    jobDescription:
      "TCS Digital is the premium engineering cadre at TCS focusing on Next-Gen technologies: Cloud, AI/ML, Cybersecurity, and Full-Stack Engineering. High-emphasis on coding accuracy, programming logic, and communication skills.",
    packageCtc: "7.5 - 9.0 LPA",
    location: "Pan India (Bangalore, Pune, Hyderabad)",
    applicationDeadline: "2026-11-10T18:00:00Z",
    driveDate: "2026-11-12T10:00:00Z",
    status: "active",
    eligibility: {
      minReadinessScore: 65,
      targetBatches: ["2026 Batch", "2025 Batch", "Class of 2026"],
      allowedDepartments: [
        "Computer Science",
        "Information Technology",
        "Electronics & Communication",
        "Electrical Engineering",
        "Mechanical Engineering",
      ],
      maxActiveBacklogs: 0,
    },
    rounds: [
      {
        roundNumber: 1,
        name: "Advanced Coding & Problem Solving",
        type: "coding",
        description: "Multi-language programming evaluation and array manipulation.",
        durationMinutes: 40,
        cutoffScore: 65,
      },
      {
        roundNumber: 2,
        name: "Technical & Core Engineering Interview",
        type: "technical",
        description: "OOP concepts, DBMS, OS fundamentals, and resume project review.",
        durationMinutes: 35,
        cutoffScore: 60,
      },
      {
        roundNumber: 3,
        name: "Managerial & HR Round",
        type: "hr",
        description: "Workplace culture fit, teamwork scenarios, and relocation flexibility.",
        durationMinutes: 25,
        cutoffScore: 60,
      },
    ],
    totalApplicants: 236,
    shortlistedCount: 54,
    createdAt: "2026-10-15T08:30:00Z",
  },
  {
    id: "drive-deloitte-usi-2026",
    collegeId: null,
    companyName: "Deloitte USI",
    companyLogoText: "DEL",
    companyColor: "#86BC25",
    targetRole: "Technology Analyst / Consultant",
    jobDescription:
      "Join Deloitte's Technology & Analytics practice delivering enterprise solutions to Fortune 500 clients. We seek well-rounded candidates with sharp analytical reasoning, SQL/data querying fundamentals, and professional communication.",
    packageCtc: "8.0 - 11.5 LPA",
    location: "Hyderabad / Gurgaon / Mumbai",
    applicationDeadline: "2026-11-25T20:00:00Z",
    driveDate: "2026-11-28T09:30:00Z",
    status: "upcoming",
    eligibility: {
      minReadinessScore: 70,
      targetBatches: ["2026 Batch", "Class of 2026"],
      allowedDepartments: [
        "Computer Science",
        "Information Technology",
        "Electronics & Communication",
        "Data Science",
      ],
      maxActiveBacklogs: 0,
    },
    rounds: [
      {
        roundNumber: 1,
        name: "Analytical & SQL Query Assessment",
        type: "coding",
        description: "SQL query formulation and logical problem-solving scenarios.",
        durationMinutes: 40,
        cutoffScore: 70,
      },
      {
        roundNumber: 2,
        name: "Client Case Study & Technical Interview",
        type: "technical",
        description: "Structured problem breakdown and tech stack decision making.",
        durationMinutes: 35,
        cutoffScore: 70,
      },
      {
        roundNumber: 3,
        name: "Behavioral & Fitment Round",
        type: "behavioral",
        description: "Consulting soft skills, client stakeholder interaction, and ethics.",
        durationMinutes: 30,
        cutoffScore: 65,
      },
    ],
    totalApplicants: 98,
    shortlistedCount: 16,
    createdAt: "2026-10-19T14:00:00Z",
  },
];

// Sample candidates for demonstration and recruitment pipeline testing
export const INITIAL_DRIVE_CANDIDATES: DriveCandidate[] = [
  {
    id: "cand-1",
    driveId: "drive-amazon-sde-2026",
    studentId: "stu-1",
    studentName: "Aarav Sharma",
    studentEmail: "aarav.sharma@sasi.ac.in",
    department: "Computer Science",
    batchName: "2026 Batch",
    status: "shortlisted",
    overallScore: 88,
    codingScore: 92,
    communicationScore: 84,
    integrityIndex: 99,
    currentRound: 3,
    appliedAt: "2026-10-19T11:20:00Z",
    notes: "Flawless O(N) hash map solution on Two Sum. Solid STAR breakdown.",
  },
  {
    id: "cand-2",
    driveId: "drive-amazon-sde-2026",
    studentId: "stu-2",
    studentName: "Sneha Reddy",
    studentEmail: "sneha.reddy@sasi.ac.in",
    department: "Information Technology",
    batchName: "2026 Batch",
    status: "round_2_cleared",
    overallScore: 84,
    codingScore: 85,
    communicationScore: 83,
    integrityIndex: 98,
    currentRound: 2,
    appliedAt: "2026-10-19T12:05:00Z",
    notes: "Demonstrated strong Kadane's algorithm application. Move to HR.",
  },
  {
    id: "cand-3",
    driveId: "drive-amazon-sde-2026",
    studentId: "stu-3",
    studentName: "Rohan Patel",
    studentEmail: "rohan.patel@sasi.ac.in",
    department: "Electronics & Communication",
    batchName: "2026 Batch",
    status: "applied",
    overallScore: 78,
    codingScore: 74,
    communicationScore: 82,
    integrityIndex: 96,
    currentRound: 1,
    appliedAt: "2026-10-20T09:15:00Z",
  },
  {
    id: "cand-4",
    driveId: "drive-amazon-sde-2026",
    studentId: "stu-4",
    studentName: "Kavya Nair",
    studentEmail: "kavya.nair@sasi.ac.in",
    department: "Computer Science",
    batchName: "2026 Batch",
    status: "shortlisted",
    overallScore: 91,
    codingScore: 95,
    communicationScore: 88,
    integrityIndex: 100,
    currentRound: 3,
    appliedAt: "2026-10-19T14:40:00Z",
    notes: "Top performer in batch. Clean two-pointer string reversal and caching explanation.",
  },
  {
    id: "cand-5",
    driveId: "drive-amazon-sde-2026",
    studentId: "stu-5",
    studentName: "Vikram Varma",
    studentEmail: "vikram.varma@sasi.ac.in",
    department: "Data Science",
    batchName: "2026 Batch",
    status: "not_qualified",
    overallScore: 58,
    codingScore: 52,
    communicationScore: 64,
    integrityIndex: 92,
    currentRound: 1,
    appliedAt: "2026-10-20T16:00:00Z",
    notes: "Did not meet Round 1 cutoff (75%). Recommended additional practice.",
  },
];

// In-memory state caches to persist across fast interactions
const drivesCache: PlacementDrive[] = [...DEFAULT_CAMPUS_DRIVES];
const candidatesCache: DriveCandidate[] = [...INITIAL_DRIVE_CANDIDATES];

export async function getPlacementDrives(collegeId?: string | null): Promise<PlacementDrive[]> {
  if (!collegeId) return [...drivesCache];
  return drivesCache.filter((d) => d.collegeId === null || d.collegeId === collegeId);
}

export async function getPlacementDriveById(id: string): Promise<PlacementDrive | null> {
  return drivesCache.find((d) => d.id === id) ?? null;
}

export async function createPlacementDrive(
  drive: Omit<PlacementDrive, "id" | "totalApplicants" | "shortlistedCount" | "createdAt">,
): Promise<PlacementDrive> {
  const newDrive: PlacementDrive = {
    ...drive,
    id: `drive-${Date.now()}`,
    totalApplicants: 0,
    shortlistedCount: 0,
    createdAt: new Date().toISOString(),
  };
  drivesCache.unshift(newDrive);
  return newDrive;
}

export async function updatePlacementDriveStatus(
  driveId: string,
  status: DriveStatus,
): Promise<boolean> {
  const drive = drivesCache.find((d) => d.id === driveId);
  if (!drive) return false;
  drive.status = status;
  return true;
}

export async function getDriveCandidates(driveId: string): Promise<DriveCandidate[]> {
  return candidatesCache.filter((c) => c.driveId === driveId);
}

export async function updateCandidateStatus(
  candidateId: string,
  newStatus: CandidateStatus,
  notes?: string,
): Promise<DriveCandidate | null> {
  const candidate = candidatesCache.find((c) => c.id === candidateId);
  if (!candidate) return null;
  candidate.status = newStatus;
  if (notes) candidate.notes = notes;

  // Update drive shortlisted counts
  const drive = drivesCache.find((d) => d.id === candidate.driveId);
  if (drive) {
    drive.shortlistedCount = candidatesCache.filter(
      (c) => c.driveId === drive.id && (c.status === "shortlisted" || c.status === "selected"),
    ).length;
  }

  return candidate;
}

export function checkStudentEligibility(
  drive: PlacementDrive,
  student: {
    department?: string | null;
    batchName?: string | null;
    graduationYear?: number | null;
  },
  readinessScore: number | null,
): EligibilityResult {
  const reasons: string[] = [];
  const requiredScore = drive.eligibility.minReadinessScore;

  // 1. Check score cutoff
  const hasScore = readinessScore !== null && readinessScore >= requiredScore;
  if (!hasScore) {
    if (readinessScore === null) {
      reasons.push(`Complete at least 1 mock interview to establish your readiness score (Cutoff: ${requiredScore}%).`);
    } else {
      reasons.push(`Current readiness score (${readinessScore}%) is below the drive cutoff of ${requiredScore}%.`);
    }
  }

  // 2. Check department
  if (student.department && drive.eligibility.allowedDepartments.length > 0) {
    const matchedDept = drive.eligibility.allowedDepartments.some(
      (allowed) =>
        allowed.toLowerCase().includes(student.department!.toLowerCase()) ||
        student.department!.toLowerCase().includes(allowed.toLowerCase()),
    );
    if (!matchedDept) {
      reasons.push(
        `Department "${student.department}" is not included in eligible departments (${drive.eligibility.allowedDepartments.slice(0, 3).join(", ")}...).`,
      );
    }
  }

  // 3. Check batch / graduation year
  if (student.batchName && drive.eligibility.targetBatches.length > 0) {
    const matchedBatch = drive.eligibility.targetBatches.some((b) =>
      student.batchName!.toLowerCase().includes(b.toLowerCase()) ||
      b.toLowerCase().includes(student.batchName!.toLowerCase()),
    );
    if (!matchedBatch) {
      reasons.push(`Batch "${student.batchName}" is not eligible for this drive (${drive.eligibility.targetBatches.join(", ")}).`);
    }
  }

  return {
    isEligible: reasons.length === 0,
    reasons,
    currentScore: readinessScore,
    requiredScore,
  };
}
