import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth/current-profile";
import { ProfileEditorClient } from "./ProfileEditorClient";

export const metadata: Metadata = {
  title: "Profile & Identity Verification | Vyoman",
  description: "Manage your personal profile, academic information, career targets, and anti-impersonation biometric verification.",
};

export default async function ProfilePage() {
  const profile = await getCurrentProfile();
  if (!profile) {
    redirect("/login");
  }

  return <ProfileEditorClient profile={profile} />;
}
