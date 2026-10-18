import { redirect } from "next/navigation";
import { getCurrentProfile, type Profile } from "@/lib/auth/current-profile";

/**
 * Guards a college-admin-only page under app/app/<segment>/page.tsx.
 *
 * app/app/layout.tsx's own guard only checks "signed in" + "onboarded" — it
 * does not gate by role, because most pages under /app are open to every
 * role. The college admin dashboard (docs/BUILD_SPEC.md Part 4.7) is the
 * first role-restricted slice of /app, so each of its pages calls this at
 * the top instead of re-deriving the same role check inline, and a student
 * who navigates straight to e.g. /app/students is bounced back to /app.
 *
 * Deliberately `college_admin` only, not "college_admin or
 * platform_admin": every query on these pages leans on RLS scoping rows to
 * `current_user_college_id()`, which is null for a platform_admin by design
 * (they have no single college). Cross-college tooling for platform_admin
 * is separate, later work (Part 4.8), not this slice — see docs/DECISIONS.md.
 */
export async function requireCollegeAdmin(): Promise<Profile> {
  const profile = await getCurrentProfile();

  if (!profile || profile.role !== "college_admin") {
    redirect("/app");
  }

  return profile;
}
