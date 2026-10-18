import { redirect } from "next/navigation";
import type { Profile, ProfileRole } from "./current-profile";

/**
 * Role gate for pages under app/app/* that are restricted beyond the base
 * "signed in and onboarded" guard app/app/layout.tsx already applies (e.g.
 * platform_admin-only tooling). Call this at the top of the page's Server
 * Component with the profile from getCurrentProfile() and the roles
 * allowed to see it.
 *
 * Redirects to /app (never /login — the layout already proved this caller
 * is signed in) when the profile is missing or its role isn't allowed, so
 * a student hitting /app/colleges by URL lands back on their own
 * dashboard instead of seeing a stack trace or someone else's data.
 *
 * Narrows the return type to the non-null `Profile`, since every call site
 * after this either redirected (never returns) or has a real profile.
 */
export function requireRole(profile: Profile | null, allowed: ProfileRole[]): Profile {
  if (!profile || !allowed.includes(profile.role)) {
    redirect("/app");
  }
  return profile;
}
