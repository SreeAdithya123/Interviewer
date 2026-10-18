import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth/current-profile";
import type { ResumeRow } from "@/lib/resume/types";
import ScannerClient from "@/components/resume/ScannerClient";

export const metadata: Metadata = {
  title: "Resume scanner",
};

export default async function ResumeScannerPage() {
  const profile = await getCurrentProfile();
  if (!profile) {
    redirect("/login");
  }

  const supabase = await createClient();
  const { data } = await supabase
    .from("resumes")
    .select("*")
    .order("updated_at", { ascending: false });

  return <ScannerClient userId={profile.id} resumes={(data ?? []) as ResumeRow[]} />;
}
