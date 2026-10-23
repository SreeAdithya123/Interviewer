import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

export type ProfileRole = "student" | "college_admin" | "platform_admin";

/** Mirrors the `profiles` table (see supabase/migrations/20261015120001_core_tenancy.sql). */
export interface Profile {
  id: string;
  role: ProfileRole;
  college_id: string | null;
  batch_id: string | null;
  department: string | null;
  graduation_year: number | null;
  full_name: string | null;
  email: string;
  phone: string | null;
  avatar_url: string | null;
  onboarded_at: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Returns the full `profiles` row for the signed-in user, or `null` if
 * nobody is signed in (or, in principle, if the `handle_new_user` trigger
 * row hasn't landed yet).
 *
 * Usable from Server Components and Route Handlers only — it awaits the
 * async server Supabase client (lib/supabase/server.ts), which reads the
 * session from the request's cookies. Do not call this from a Client
 * Component; use lib/supabase/client.ts + supabase.auth.getUser() there
 * instead.
 *
 * RLS already scopes `profiles` SELECT to "your own row, or your college's
 * rows if you're a college_admin, or every row if you're a platform_admin"
 * (see migration 20261015120007_row_level_security.sql), so this always
 * filters by the caller's own id explicitly — without that filter a
 * college_admin/platform_admin's query could return more than one row.
 */
export const getCurrentProfile = cache(async (): Promise<Profile | null> => {
  const supabase = await createClient();

  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) {
    return null;
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userData.user.id)
    .single();

  if (error || !data) {
    return null;
  }

  return data as Profile;
});

/**
 * True when a profile still needs to go through /onboarding before using
 * the app: any student whose onboarded_at is null. A college_admin or
 * platform_admin is never sent to onboarding — a platform_admin has no
 * college at all, by design, and a college_admin is provisioned with one
 * directly (not via the self-serve invitation-token flow).
 *
 * Shared by app/auth/callback/route.ts (post-magic-link redirect) and
 * app/app/layout.tsx (route guard) so the two checks can't drift.
 */
export function profileNeedsOnboarding(
  profile: Pick<Profile, "role" | "college_id" | "onboarded_at"> | null,
): boolean {
  return profile !== null && profile.role === "student" && profile.onboarded_at === null;
}
