"use server";

import { revalidatePath } from "next/cache";
import { getCurrentProfile } from "@/lib/auth/current-profile";
import { requireRole } from "@/lib/auth/require-role";
import { createInterview } from "@/lib/interview/actions";
import {
  createPlacementDrive,
  getPlacementDriveById,
  updateCandidateStatus,
} from "@/lib/drives/store";
import type { CandidateStatus, DriveStatus } from "@/lib/drives/types";

export async function createDriveAction(formData: FormData) {
  const profile = await getCurrentProfile();
  requireRole(profile, ["college_admin", "platform_admin"]);

  const companyName = String(formData.get("companyName") ?? "").trim();
  const targetRole = String(formData.get("targetRole") ?? "").trim();
  const packageCtc = String(formData.get("packageCtc") ?? "").trim();
  const location = String(formData.get("location") ?? "").trim();
  const applicationDeadline = String(formData.get("applicationDeadline") ?? "").trim();
  const driveDate = String(formData.get("driveDate") ?? "").trim();
  const jobDescription = String(formData.get("jobDescription") ?? "").trim();
  const minReadinessScore = Number(formData.get("minReadinessScore") ?? 70);

  const departmentsStr = String(formData.get("allowedDepartments") ?? "");
  const allowedDepartments = departmentsStr
    .split(",")
    .map((d) => d.trim())
    .filter(Boolean);

  const batchesStr = String(formData.get("targetBatches") ?? "");
  const targetBatches = batchesStr
    .split(",")
    .map((b) => b.trim())
    .filter(Boolean);

  if (!companyName || !targetRole) {
    throw new Error("Company name and target role are required.");
  }

  const logoText = companyName.slice(0, 4).toUpperCase();
  const colors = ["#0070BA", "#FF9900", "#86BC25", "#EA4335", "#6366F1", "#0284C7"];
  const color = colors[Math.floor(Math.random() * colors.length)];

  await createPlacementDrive({
    collegeId: profile?.college_id ?? null,
    companyName,
    companyLogoText: logoText,
    companyColor: color,
    targetRole,
    jobDescription: jobDescription || `Campus placement drive for ${targetRole} at ${companyName}.`,
    packageCtc: packageCtc || "Competitive",
    location: location || "Campus Placement / Hybrid",
    applicationDeadline: applicationDeadline || new Date(Date.now() + 14 * 86400000).toISOString(),
    driveDate: driveDate || new Date(Date.now() + 21 * 86400000).toISOString(),
    status: "active" as DriveStatus,
    eligibility: {
      minReadinessScore: Number.isNaN(minReadinessScore) ? 70 : minReadinessScore,
      targetBatches: targetBatches.length > 0 ? targetBatches : ["2026 Batch", "2025 Batch"],
      allowedDepartments:
        allowedDepartments.length > 0
          ? allowedDepartments
          : ["Computer Science", "Information Technology", "Electronics"],
      maxActiveBacklogs: 0,
    },
    rounds: [
      {
        roundNumber: 1,
        name: "Technical Coding Assessment",
        type: "coding",
        description: "Live coding evaluation in the interactive sandbox.",
        durationMinutes: 45,
        cutoffScore: minReadinessScore,
      },
      {
        roundNumber: 2,
        name: "Technical & System Architecture",
        type: "technical",
        description: "Technical deep-dive into complexities and database design.",
        durationMinutes: 35,
        cutoffScore: minReadinessScore,
      },
      {
        roundNumber: 3,
        name: "Managerial & HR Round",
        type: "hr",
        description: "Cultural fit and behavioral assessment.",
        durationMinutes: 30,
        cutoffScore: 65,
      },
    ],
  });

  revalidatePath("/app/drives");
}

export async function updateCandidateStatusAction(
  candidateId: string,
  newStatus: CandidateStatus,
  notes?: string,
) {
  const profile = await getCurrentProfile();
  requireRole(profile, ["college_admin", "platform_admin"]);

  const updated = await updateCandidateStatus(candidateId, newStatus, notes);
  if (!updated) {
    throw new Error("Candidate could not be found.");
  }

  revalidatePath(`/app/drives/${updated.driveId}`);
  revalidatePath("/app/drives");
  return updated;
}

export async function startDriveInterviewAction(driveId: string) {
  const drive = await getPlacementDriveById(driveId);
  if (!drive) {
    throw new Error("Placement drive not found.");
  }

  // Creates interview customized for this company and role
  const interview = await createInterview({
    interviewType: "technical",
    targetRole: drive.targetRole,
    companyType: drive.companyName,
    difficulty: drive.eligibility.minReadinessScore >= 75 ? "hard" : "medium",
  });

  return interview.id;
}
