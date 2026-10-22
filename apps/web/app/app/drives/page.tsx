import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth/current-profile";
import { createClient } from "@/lib/supabase/server";
import { checkStudentEligibility, getPlacementDrives } from "@/lib/drives/store";
import type { EligibilityResult } from "@/lib/drives/types";
import DrivesClient from "./DrivesClient";

export const metadata: Metadata = {
  title: "Campus Placement Drives",
};

export const dynamic = "force-dynamic";

export default async function PlacementDrivesPage() {
  const profile = await getCurrentProfile();
  if (!profile) {
    redirect("/login");
  }

  const supabase = await createClient();
  const isManager = profile.role === "college_admin" || profile.role === "platform_admin";

  // Fetch all placement drives for this college
  const drives = await getPlacementDrives(profile.college_id);

  // If student, compute real-time eligibility based on their latest completed interview report
  let studentReadinessScore: number | null = null;
  const eligibilityMap: Record<string, EligibilityResult> = {};

  if (!isManager) {
    const { data: latestReport } = await supabase
      .from("interview_reports")
      .select("overall_score")
      .eq("user_id", profile.id)
      .eq("status", "completed")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (latestReport && latestReport.overall_score !== null) {
      studentReadinessScore = Math.round(Number(latestReport.overall_score));
    }

    // Check student's batch name if batch_id exists
    let batchName: string | null = null;
    if (profile.batch_id) {
      const { data: batch } = await supabase
        .from("batches")
        .select("name")
        .eq("id", profile.batch_id)
        .maybeSingle();
      batchName = batch?.name ?? null;
    }

    const studentInfo = {
      department: profile.department,
      batchName,
      graduationYear: profile.graduation_year,
    };

    for (const drive of drives) {
      eligibilityMap[drive.id] = checkStudentEligibility(drive, studentInfo, studentReadinessScore);
    }
  }

  return (
    <div className="max-w-6xl">
      <DrivesClient
        drives={drives}
        isManager={isManager}
        studentProfile={{
          department: profile.department,
          graduationYear: profile.graduation_year,
        }}
        studentReadinessScore={studentReadinessScore}
        eligibilityMap={eligibilityMap}
      />
    </div>
  );
}
