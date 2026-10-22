import type { Metadata } from "next";
import { getCurrentProfile } from "@/lib/auth/current-profile";
import CollegeAdminOverview from "./CollegeAdminOverview";
import StudentDashboard from "./StudentDashboard";
import PlatformAdminOverview from "./PlatformAdminOverview";

export const metadata: Metadata = {
  title: "Dashboard",
};

export default async function AppHomePage() {
  const profile = await getCurrentProfile();

  if (!profile) {
    return null;
  }

  if (profile.role === "college_admin") {
    return <CollegeAdminOverview profile={profile} />;
  }

  if (profile.role === "platform_admin") {
    return <PlatformAdminOverview profile={profile} />;
  }

  return <StudentDashboard profile={profile} />;
}
