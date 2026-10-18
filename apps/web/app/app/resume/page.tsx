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

// Resume hub: list of saved resumes + past scans, per docs/BUILD_SPEC.md
// Part 4.3/4.4 ("A resume history/list view showing saved resumes and past
// scans"). Builder and scanner are reached from here rather than getting
// their own nav-config.ts entries — /app/resume is the one nav link
// (lib/auth/nav-config.ts), and these are sub-pages of it.
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
    <div className="max-w-5xl space-y-10">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-headline text-2xl text-foreground">Resume</h1>
          <p className="mt-1 font-body text-sm text-muted-foreground">
            Build and manage your resumes, then check one against a job description.
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/app/resume/scanner" className="btn-secondary flex items-center gap-1.5 text-sm">
            <ScanLine className="h-4 w-4" strokeWidth={1.75} /> Scan a resume
          </Link>
          <Link href="/app/resume/builder" className="btn-primary flex items-center gap-1.5 text-sm">
            <Plus className="h-4 w-4" strokeWidth={1.75} /> New resume
          </Link>
        </div>
      </div>

      <section>
        <h2 className="font-headline text-lg text-foreground">Your resumes</h2>
        {resumes.length === 0 ? (
          <div className="mt-3 rounded-3xl border border-dashed border-border px-6 py-10 text-center">
            <FileText className="mx-auto h-8 w-8 text-muted-foreground" strokeWidth={1.5} />
            <p className="mt-3 font-body text-sm text-muted-foreground">
              You haven&apos;t built a resume yet.
            </p>
            <Link href="/app/resume/builder" className="btn-primary mt-4 inline-flex text-sm">
              Start your first resume
            </Link>
          </div>
        ) : (
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {resumes.map((resume) => (
              <div key={resume.id} className="flex flex-col justify-between rounded-2xl border border-border bg-card p-5 shadow-soft">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-body text-sm font-semibold text-foreground">{resume.title}</h3>
                    {resume.is_primary && (
                      <span className="flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 font-body text-[10px] font-semibold uppercase tracking-wide text-primary">
                        <Star className="h-3 w-3" strokeWidth={2} /> Primary
                      </span>
                    )}
                  </div>
                  <p className="mt-1 font-body text-xs text-muted-foreground">
                    {resume.template === "modern-corporate" ? "Modern Corporate" : "Minimal Professional"} &middot; updated{" "}
                    {formatDate(resume.updated_at)}
                  </p>
                </div>
                <div className="mt-4 flex items-center justify-between">
                  <Link
                    href={`/app/resume/builder?id=${resume.id}`}
                    className="rounded-full border border-primary/30 px-3 py-1.5 font-body text-xs font-medium text-primary transition-colors hover:bg-primary/10"
                  >
                    Edit
                  </Link>
                  <div className="flex items-center gap-1">
                    {!resume.is_primary && profile && <SetPrimaryButton userId={profile.id} resumeId={resume.id} />}
                    <DeleteRowButton table="resumes" id={resume.id} confirmText={`Delete "${resume.title}"? This can't be undone.`} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="font-headline text-lg text-foreground">Past scans</h2>
        {scans.length === 0 ? (
          <p className="mt-3 rounded-3xl border border-dashed border-border px-6 py-8 text-center font-body text-sm text-muted-foreground">
            No scans yet &mdash; run one from the resume scanner.
          </p>
        ) : (
          <div className="mt-3 overflow-hidden rounded-2xl border border-border bg-card shadow-soft">
            <table className="w-full text-left">
              <thead className="border-b border-border bg-muted/40">
                <tr>
                  <th className="px-4 py-2.5 font-body text-xs font-medium text-muted-foreground">Resume</th>
                  <th className="px-4 py-2.5 font-body text-xs font-medium text-muted-foreground">Parse health</th>
                  <th className="px-4 py-2.5 font-body text-xs font-medium text-muted-foreground">Job description</th>
                  <th className="px-4 py-2.5 font-body text-xs font-medium text-muted-foreground">Date</th>
                  <th className="px-4 py-2.5" />
                </tr>
              </thead>
              <tbody>
                {scans.map((scan) => (
                  <tr key={scan.id} className="border-b border-border last:border-0">
                    <td className="px-4 py-2.5 font-body text-sm text-foreground">
                      {scan.resume_id ? resumeTitleById.get(scan.resume_id) ?? "Uploaded PDF" : "Uploaded PDF"}
                    </td>
                    <td className="px-4 py-2.5 font-body text-sm capitalize text-muted-foreground">{scan.parse_health?.status ?? "—"}</td>
                    <td className="px-4 py-2.5 font-body text-sm text-muted-foreground">{scan.job_description_id ? "Yes" : "—"}</td>
                    <td className="px-4 py-2.5 font-body text-xs text-muted-foreground">{formatDate(scan.created_at)}</td>
                    <td className="px-4 py-2.5 text-right">
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
