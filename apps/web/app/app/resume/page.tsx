import type { Metadata } from "next";
import Link from "next/link";
import { FileText, Plus, ScanLine, Star } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth/current-profile";
import type { ResumeRow } from "@/lib/resume/types";
import DeleteRowButton from "@/components/resume/DeleteRowButton";
import SetPrimaryButton from "@/components/resume/SetPrimaryButton";

export const metadata: Metadata = {
  title: "Resume",
};

interface ResumeScanRow {
  id: string;
  resume_id: string | null;
  job_description_id: string | null;
  parse_health: { status?: string } | null;
  created_at: string;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

export default async function ResumeHubPage() {
  const profile = await getCurrentProfile();
  const supabase = await createClient();

  const [resumesResult, scansResult] = await Promise.all([
    supabase.from("resumes").select("*").order("updated_at", { ascending: false }),
    supabase
      .from("resume_scans")
      .select("id, resume_id, job_description_id, parse_health, created_at")
      .order("created_at", { ascending: false })
      .limit(20),
  ]);

  const resumes = (resumesResult.data ?? []) as ResumeRow[];
  const scans = (scansResult.data ?? []) as ResumeScanRow[];
  const resumeTitleById = new Map(resumes.map((r) => [r.id, r.title]));

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-headline text-2xl font-semibold tracking-tight text-foreground">
            Resume Hub
          </h1>
          <p className="mt-1 font-body text-sm text-muted-foreground">
            Saved ATS resumes and job description alignment scans.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/app/resume/scanner"
            className="inline-flex h-8 items-center gap-1.5 rounded border border-border/80 bg-background px-3 font-body text-xs font-medium text-foreground transition-colors hover:bg-muted"
          >
            <ScanLine className="h-3.5 w-3.5" />
            <span>Scan resume</span>
          </Link>
          <Link
            href="/app/resume/builder"
            className="inline-flex h-8 items-center gap-1.5 rounded bg-foreground px-3.5 font-body text-xs font-medium text-background transition-colors hover:bg-foreground/90"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>New resume</span>
          </Link>
        </div>
      </div>

      {/* Resumes Section */}
      <section className="space-y-3">
        <h2 className="font-body text-sm font-semibold text-foreground">Saved resumes</h2>
        {resumes.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border/80 bg-card p-10 text-center">
            <FileText className="mx-auto h-7 w-7 text-muted-foreground opacity-60" strokeWidth={1.5} />
            <p className="mt-2 font-body text-xs text-muted-foreground">
              You haven&apos;t built a resume profile yet.
            </p>
            <Link
              href="/app/resume/builder"
              className="mt-3 inline-flex h-8 items-center rounded bg-foreground px-3 font-body text-xs font-medium text-background hover:bg-foreground/90"
            >
              Start your first resume
            </Link>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {resumes.map((resume) => (
              <div
                key={resume.id}
                className="flex flex-col justify-between rounded-lg border border-border/80 bg-card p-4 transition-colors hover:border-border"
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="font-body text-sm font-semibold text-foreground truncate">{resume.title}</h3>
                    {resume.is_primary && (
                      <span className="inline-flex items-center gap-1 rounded border border-border/80 bg-muted px-2 py-0.5 font-body text-[10px] font-medium text-foreground leading-none">
                        <Star className="h-3 w-3 fill-current text-foreground" /> Primary
                      </span>
                    )}
                  </div>
                  <p className="mt-1 font-body text-xs text-muted-foreground">
                    {resume.template === "modern-corporate" ? "Modern Corporate" : "Minimal Professional"} · Updated{" "}
                    {formatDate(resume.updated_at)}
                  </p>
                </div>

                <div className="mt-4 flex items-center justify-between border-t border-border/60 pt-3">
                  <Link
                    href={`/app/resume/builder?id=${resume.id}`}
                    className="font-body text-xs font-medium text-foreground underline-offset-4 hover:underline"
                  >
                    Edit draft →
                  </Link>
                  <div className="flex items-center gap-2 text-xs">
                    {!resume.is_primary && profile && <SetPrimaryButton userId={profile.id} resumeId={resume.id} />}
                    <DeleteRowButton table="resumes" id={resume.id} confirmText={`Delete "${resume.title}"?`} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Past Scans Section */}
      <section className="space-y-3">
        <h2 className="font-body text-sm font-semibold text-foreground">Past ATS scans</h2>
        {scans.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border/80 bg-card p-6 text-center font-body text-xs text-muted-foreground">
            No scans recorded yet. Upload a PDF or select a saved resume to run honest ATS analysis.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-border/80 bg-card">
            <table className="w-full text-left font-body text-xs">
              <thead>
                <tr className="border-b border-border/60 text-muted-foreground">
                  <th className="px-4 py-2.5 font-medium">Resume</th>
                  <th className="px-4 py-2.5 font-medium">Parse health</th>
                  <th className="px-4 py-2.5 font-medium">Job description</th>
                  <th className="px-4 py-2.5 font-medium">Date</th>
                  <th className="px-4 py-2.5 text-right font-medium">Action</th>
                </tr>
              </thead>
              <tbody>
                {scans.map((scan) => (
                  <tr
                    key={scan.id}
                    className="border-b border-border/60 transition-colors last:border-0 hover:bg-muted/30"
                  >
                    <td className="px-4 py-3 font-medium text-foreground">
                      {scan.resume_id ? resumeTitleById.get(scan.resume_id) ?? "Uploaded PDF" : "Uploaded PDF"}
                    </td>
                    <td className="px-4 py-3 capitalize text-muted-foreground">{scan.parse_health?.status ?? "—"}</td>
                    <td className="px-4 py-3 text-muted-foreground">{scan.job_description_id ? "Attached" : "General"}</td>
                    <td className="px-4 py-3 text-muted-foreground">{formatDate(scan.created_at)}</td>
                    <td className="px-4 py-3 text-right">
                      <DeleteRowButton table="resume_scans" id={scan.id} confirmText="Delete this scan?" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
