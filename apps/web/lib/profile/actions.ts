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

  const updates: Record<string, unknown> = {
    full_name: payload.fullName.trim() || null,
    phone: payload.phone?.trim() || null,
    bio: payload.bio?.trim() || null,
    department: payload.department?.trim() || null,
    graduation_year: payload.graduationYear || null,
    target_role: payload.targetRole?.trim() || null,
    target_companies: payload.targetCompanies?.trim() || null,
    linkedin_url: payload.linkedinUrl?.trim() || null,
    github_url: payload.githubUrl?.trim() || null,
    portfolio_url: payload.portfolioUrl?.trim() || null,
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabase
    .from("profiles")
    .update(updates)
    .eq("id", profile.id);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/app/profile");
  revalidatePath("/app");
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

  const updates: Record<string, unknown> = {
    id_photo_url: payload.photoDataUrl,
    face_embedding: payload.faceEmbedding,
    id_verified_at: verifiedAt,
    updated_at: verifiedAt,
  };

  // If user doesn't have an avatar set, use their baseline photo as avatar
  if (!profile.avatar_url) {
    updates.avatar_url = payload.photoDataUrl;
  }

  const { error } = await supabase
    .from("profiles")
    .update(updates)
    .eq("id", profile.id);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/app/profile");
  revalidatePath("/app");
  revalidatePath("/app/interview");
  return { success: true, verifiedAt };
}
