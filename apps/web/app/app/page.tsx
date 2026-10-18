import type { Metadata } from "next";
import { getCurrentProfile } from "@/lib/auth/current-profile";
import CollegeAdminOverview from "./CollegeAdminOverview";

export const metadata: Metadata = {
  title: "Dashboard",
};

// Home screen for the /app shell (app/app/layout.tsx already guarantees a
// non-null, onboarded profile by the time this renders). A college_admin
// gets their real Overview dashboard (BUILD_SPEC Part 4.7) here — there is
// no separate "/app/overview" nav link, so /app itself (already the
// sidebar logo's link, for every role) doubles as it, the same way a
// student's home screen would. Student and platform_admin still see the
// placeholder below; the real per-role dashboard for those is later work.
export default async function AppHomePage() {
  const profile = await getCurrentProfile();

  if (profile?.role === "college_admin") {
    return <CollegeAdminOverview profile={profile} />;
  }

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-semibold text-foreground">
        Welcome{profile?.full_name ? `, ${profile.full_name}` : ""}
      </h1>
      <p className="mt-2 font-body text-sm text-muted-foreground">
        Use the sidebar to get started. This is a placeholder home screen &mdash; the real
        dashboard for your role lands in a later phase.
      </p>
    </div>
  );
}
