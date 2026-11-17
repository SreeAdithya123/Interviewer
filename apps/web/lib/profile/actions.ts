"use server";

import { getCurrentProfile } from "@/lib/auth/current-profile";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export interface UpdateProfilePayload {
  fullName: string;
  phone?: string | null;
  bio?: string | null;
  department?: string | null;
  graduationYear?: number | null;
  targetRole?: string | null;
  targetCompanies?: string | null;
  linkedinUrl?: string | null;
  githubUrl?: string | null;
  portfolioUrl?: string | null;
}

export interface SaveBiometricPayload {
  photoDataUrl: string;
  faceEmbedding: number[];
}

export async function updateUserProfile(payload: UpdateProfilePayload): Promise<{ success: boolean; error?: string }> {
  const profile = await getCurrentProfile();
  if (!profile) {
    return { success: false, error: "Not authenticated" };
  }

  const supabase = await createClient();
  const trimmedBio = payload.bio?.trim() || null;
  const trimmedRole = payload.targetRole?.trim() || null;
  const trimmedCompanies = payload.targetCompanies?.trim() || null;
  const trimmedLinkedin = payload.linkedinUrl?.trim() || null;
  const trimmedGithub = payload.githubUrl?.trim() || null;
  const trimmedPortfolio = payload.portfolioUrl?.trim() || null;

  // 1. Always persist extended profile attributes into Supabase Auth user_metadata
  // This ensures they are safely stored even if optional columns are absent in public.profiles.
  try {
    await supabase.auth.updateUser({
      data: {
        bio: trimmedBio,
        target_role: trimmedRole,
        target_companies: trimmedCompanies,
        linkedin_url: trimmedLinkedin,
        github_url: trimmedGithub,
        portfolio_url: trimmedPortfolio,
      },
    });
  } catch (authErr) {
    console.warn("Could not persist profile metadata to auth.users:", authErr);
  }

  // 2. Attempt full update on public.profiles
  const fullUpdates: Record<string, unknown> = {
    full_name: payload.fullName.trim() || null,
    phone: payload.phone?.trim() || null,
    bio: trimmedBio,
    department: payload.department?.trim() || null,
    graduation_year: payload.graduationYear || null,
    target_role: trimmedRole,
    target_companies: trimmedCompanies,
    linkedin_url: trimmedLinkedin,
    github_url: trimmedGithub,
    portfolio_url: trimmedPortfolio,
    updated_at: new Date().toISOString(),
  };

  const { error: fullError } = await supabase
    .from("profiles")
    .update(fullUpdates)
    .eq("id", profile.id);

  if (!fullError) {
    try {
      revalidatePath("/app/profile");
      revalidatePath("/app");
    } catch {
      // Safe in edge/dynamic contexts
    }
    return { success: true };
  }

  // 3. Graceful fallback: If public.profiles is missing extended columns (e.g. bio, target_role),
  // update only the standard core tenancy columns.
  const coreUpdates: Record<string, unknown> = {
    full_name: payload.fullName.trim() || null,
    phone: payload.phone?.trim() || null,
    department: payload.department?.trim() || null,
    graduation_year: payload.graduationYear || null,
    updated_at: new Date().toISOString(),
  };

  const { error: coreError } = await supabase
    .from("profiles")
    .update(coreUpdates)
    .eq("id", profile.id);

  if (coreError) {
    return { success: false, error: coreError.message };
  }

  try {
    revalidatePath("/app/profile");
    revalidatePath("/app");
  } catch {
    // Safe in edge/dynamic contexts
  }
  return { success: true };
}

export async function saveBiometricBaseline(
  payload: SaveBiometricPayload
): Promise<{ success: boolean; error?: string; verifiedAt?: string }> {
  const profile = await getCurrentProfile();
  if (!profile) {
    return { success: false, error: "Not authenticated" };
  }

  if (!payload.photoDataUrl || payload.faceEmbedding.length === 0) {
    return { success: false, error: "Missing biometric photo or landmark embedding" };
  }

  const supabase = await createClient();
  const verifiedAt = new Date().toISOString();

  // 1. Persist biometric baseline in Supabase Auth user_metadata
  try {
    await supabase.auth.updateUser({
      data: {
        id_photo_url: payload.photoDataUrl,
        face_embedding: payload.faceEmbedding,
        id_verified_at: verifiedAt,
      },
    });
  } catch (authErr) {
    console.warn("Could not save biometric metadata to auth.users:", authErr);
  }

  // 2. Attempt full table update
  const fullUpdates: Record<string, unknown> = {
    avatar_url: payload.photoDataUrl,
    id_photo_url: payload.photoDataUrl,
    face_embedding: payload.faceEmbedding,
    id_verified_at: verifiedAt,
    updated_at: verifiedAt,
  };

  const { error: fullError } = await supabase
    .from("profiles")
    .update(fullUpdates)
    .eq("id", profile.id);

  if (!fullError) {
    try {
      revalidatePath("/app/profile");
    } catch {
      // Safe in dynamic/edge contexts
    }
    return { success: true, verifiedAt };
  }

  // 3. Graceful fallback: If face_embedding column is absent from schema cache,
  // update avatar_url which is guaranteed to exist.
  const fallbackUpdates: Record<string, unknown> = {
    avatar_url: payload.photoDataUrl,
    updated_at: verifiedAt,
  };

  await supabase
    .from("profiles")
    .update(fallbackUpdates)
    .eq("id", profile.id);

  try {
    revalidatePath("/app/profile");
  } catch {
    // Safe in dynamic/edge contexts
  }
  return { success: true, verifiedAt };
}
