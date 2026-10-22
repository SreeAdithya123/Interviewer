import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth/current-profile";
import { getDriveCandidates, getPlacementDriveById } from "@/lib/drives/store";
import DriveDetailClient from "./DriveDetailClient";

export const metadata: Metadata = {
  title: "Placement Drive Details & Leaderboard",
};

export const dynamic = "force-dynamic";

interface DrivePageProps {
  params: Promise<{ id: string }>;
}

export default async function DriveDetailPage({ params }: DrivePageProps) {
  const { id } = await params;
  const profile = await getCurrentProfile();
  if (!profile) {
    redirect("/login");
  }

  const drive = await getPlacementDriveById(id);
  if (!drive) {
    notFound();
  }

  const candidates = await getDriveCandidates(id);
  const isManager = profile.role === "college_admin" || profile.role === "platform_admin";

  return (
    <div className="max-w-6xl">
      <DriveDetailClient drive={drive} candidates={candidates} isManager={isManager} />
    </div>
  );
}
