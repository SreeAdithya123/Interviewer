import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth/current-profile";
import type { ResumeRow } from "@/lib/resume/types";
import ResumeBuilderClient from "@/components/resume/ResumeBuilderClient";

export const metadata: Metadata = {
  title: "Resume builder",
};

// /app/resume/builder            -> new resume
// /app/resume/builder?id=<uuid>  -> edit an existing one (ResumeBuilderClient
// sends you back here with ?id=... right after the first save, see its
// handleSave).
export default async function ResumeBuilderPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string }>;
}) {
  const { id } = await searchParams;
  const profile = await getCurrentProfile();
  if (!profile) {
    // app/app/layout.tsx already guarantees this; defensive only, per its
    // own documented note about not re-deriving every ancestor guard.
    redirect("/login");
  }

  let initialResume: ResumeRow | null = null;
  if (id) {
    const supabase = await createClient();
    const { data } = await supabase.from("resumes").select("*").eq("id", id).single();
    initialResume = (data as ResumeRow) ?? null;
    if (!initialResume) {
      // Row doesn't exist, isn't this user's (RLS hides it), or was deleted
      // — fall back to "new resume" instead of rendering a broken edit form.
      redirect("/app/resume/builder");
    }
  }

  return <ResumeBuilderClient userId={profile.id} initialResume={initialResume} />;
}
