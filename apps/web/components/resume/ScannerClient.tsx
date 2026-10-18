"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { AlertTriangle, CheckCircle2, FileText, Info, ScanLine, Upload, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { scanResume, type ScanResumeResult } from "@/lib/ai-stubs/scan-resume";
import type { ResumeRow } from "@/lib/resume/types";

type Source = "upload" | "saved";

const SEVERITY_STYLES: Record<string, string> = {
  high: "border-destructive/30 bg-destructive/5 text-destructive",
  medium: "border-accent/30 bg-accent/10 text-accent",
  low: "border-border bg-muted/40 text-muted-foreground",
};

export function ScannerClient({ userId, resumes }: { userId: string; resumes: ResumeRow[] }) {
  const [source, setSource] = useState<Source>(resumes.length > 0 ? "saved" : "upload");
  const [selectedResumeId, setSelectedResumeId] = useState<string>(resumes[0]?.id ?? "");
  const [file, setFile] = useState<File | null>(null);
  const [jdText, setJdText] = useState("");
  const [status, setStatus] = useState<"idle" | "scanning" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ScanResumeResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const canScan = source === "saved" ? Boolean(selectedResumeId) : Boolean(file);

  async function handleScan() {
    setStatus("scanning");
    setError(null);
    setResult(null);

    try {
      const supabase = createClient();
      const selectedResume = source === "saved" ? resumes.find((r) => r.id === selectedResumeId) ?? null : null;

      let jobDescriptionId: string | null = null;
      if (jdText.trim().length > 0) {
        const { data: jd, error: jdError } = await supabase
          .from("job_descriptions")
          .insert({ user_id: userId, raw_text: jdText.trim() })
          .select("id")
          .single();
        if (jdError) throw jdError;
        jobDescriptionId = jd.id as string;
      }

      const scanResult = await scanResume({
        resumeData: selectedResume?.data ?? null,
        uploadedFileName: file?.name ?? null,
        uploadedFileSizeBytes: file?.size ?? null,
        jobDescriptionText: jdText.trim() || null,
      });

      const { error: rpcError } = await supabase.rpc("create_stub_resume_scan", {
        p_resume_id: selectedResume?.id ?? null,
        p_job_description_id: jobDescriptionId,
        p_parsed_resume: scanResult.parsed_resume,
        p_parse_health: scanResult.parse_health,
        p_jd_match: scanResult.jd_match,
        p_bullet_quality: scanResult.bullet_quality,
        p_formatting_risks: scanResult.formatting_risks,
      });
      if (rpcError) throw rpcError;

      setResult(scanResult);
      setStatus("idle");
    } catch (e) {
      setStatus("error");
      setError(e instanceof Error ? e.message : "Something went wrong while scanning.");
    }
  }

  return (
    <div className="max-w-4xl space-y-8">
      <div>
        <Link href="/app/resume" className="font-body text-xs font-medium text-muted-foreground hover:text-foreground">
          &larr; Back to resumes
        </Link>
        <h1 className="mt-1 font-headline text-2xl text-foreground">Resume scanner</h1>
        <p className="mt-1 font-body text-sm text-muted-foreground">
          Four honest checks on your resume &mdash; no single &ldquo;ATS score,&rdquo; because no universal one exists.
        </p>
      </div>

      <div className="rounded-3xl border border-border bg-card p-6 shadow-soft">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setSource("saved")}
            disabled={resumes.length === 0}
            className={`rounded-full border px-4 py-2 font-body text-sm font-medium transition-colors disabled:opacity-40 ${
              source === "saved" ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:bg-muted"
            }`}
          >
            Use a saved resume
          </button>
          <button
            type="button"
            onClick={() => setSource("upload")}
            className={`rounded-full border px-4 py-2 font-body text-sm font-medium transition-colors ${
              source === "upload" ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:bg-muted"
            }`}
          >
            Upload a PDF
          </button>
        </div>

        <div className="mt-4">
          {source === "saved" ? (
            resumes.length === 0 ? (
              <p className="font-body text-sm text-muted-foreground">
                You have no saved resumes yet.{" "}
                <Link href="/app/resume/builder" className="font-medium text-primary underline">
                  Build one first
                </Link>
                , or upload a PDF instead.
              </p>
            ) : (
              <select
                value={selectedResumeId}
                onChange={(e) => setSelectedResumeId(e.target.value)}
                className="w-full max-w-sm rounded-xl border border-input bg-background px-3 py-2 font-body text-sm text-foreground outline-none focus:border-primary"
              >
                {resumes.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.title}
                    {r.is_primary ? " (primary)" : ""}
                  </option>
                ))}
              </select>
            )
          ) : (
            <div>
              {file ? (
                <div className="flex items-center gap-3 rounded-2xl border border-border bg-background/60 px-4 py-3">
                  <FileText className="h-5 w-5 text-primary" strokeWidth={1.75} />
                  <div className="flex-1">
                    <p className="font-body text-sm text-foreground">{file.name}</p>
                    <p className="font-body text-xs text-muted-foreground">{(file.size / 1024).toFixed(1)} KB</p>
                  </div>
                  <button type="button" onClick={() => setFile(null)} className="rounded-full p-1.5 hover:bg-muted">
                    <X className="h-4 w-4 text-muted-foreground" strokeWidth={1.75} />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex w-full flex-col items-center gap-2 rounded-2xl border-2 border-dashed border-border px-6 py-8 text-center transition-colors hover:border-primary/40 hover:bg-primary/5"
                >
                  <Upload className="h-7 w-7 text-muted-foreground" strokeWidth={1.5} />
                  <span className="font-body text-sm font-medium text-foreground">Click to choose a PDF</span>
                  <span className="font-body text-xs text-muted-foreground">We only read the filename and size for now &mdash; full parsing needs the real engine.</span>
                </button>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="application/pdf"
                className="hidden"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
            </div>
          )}
        </div>

        <div className="mt-5">
          <label className="font-body text-xs font-medium text-muted-foreground">Job description (optional)</label>
          <textarea
            value={jdText}
            onChange={(e) => setJdText(e.target.value)}
            rows={4}
            placeholder="Paste a job description to check your resume against it."
            className="mt-1 w-full resize-none rounded-xl border border-input bg-background px-3 py-2 font-body text-sm text-foreground outline-none focus:border-primary"
          />
        </div>

        <button
          type="button"
          onClick={handleScan}
          disabled={!canScan || status === "scanning"}
          className="btn-primary mt-5 flex items-center gap-2 text-sm disabled:opacity-60"
        >
          <ScanLine className="h-4 w-4" strokeWidth={1.75} />
          {status === "scanning" ? "Scanning..." : "Scan resume"}
        </button>
        {status === "error" && error && <p className="mt-3 font-body text-sm text-destructive">{error}</p>}
      </div>

      {result && (
        <div className="space-y-5">
          <div className="flex items-center gap-2 rounded-2xl border border-dashed border-accent/40 bg-accent/5 px-4 py-2.5">
            <Info className="h-4 w-4 text-accent" strokeWidth={1.75} />
            <p className="font-body text-xs font-medium text-accent">
              Preview &mdash; these checks use mock analysis until the real engine (Gemini) is connected. Saved to your history as-is.
            </p>
          </div>

          <ResultCard title="1. Parse health" icon={<FileText className="h-4 w-4" strokeWidth={1.75} />}>
            <p className="font-body text-sm capitalize text-foreground">
              Status: <span className="font-semibold">{result.parse_health.status}</span>
            </p>
            {result.parse_health.sections_detected.length > 0 && (
              <p className="mt-2 font-body text-xs text-muted-foreground">
                Detected: {result.parse_health.sections_detected.join(", ")}
              </p>
            )}
            {result.parse_health.sections_missing.length > 0 && (
              <p className="mt-1 font-body text-xs text-destructive">Missing: {result.parse_health.sections_missing.join(", ")}</p>
            )}
            <ul className="mt-2 space-y-1">
              {result.parse_health.notes.map((n, i) => (
                <li key={i} className="font-body text-xs text-muted-foreground">
                  &bull; {n}
                </li>
              ))}
            </ul>
          </ResultCard>

          <ResultCard title="2. Job description match" icon={<CheckCircle2 className="h-4 w-4" strokeWidth={1.75} />}>
            {result.jd_match ? (
              <div className="space-y-3">
                <div>
                  <p className="font-body text-xs font-medium text-foreground">Present</p>
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    {result.jd_match.skills_present.length === 0 && <span className="font-body text-xs text-muted-foreground">None detected.</span>}
                    {result.jd_match.skills_present.map((s) => (
                      <span key={s} className="rounded-full bg-primary/10 px-2 py-0.5 font-body text-xs text-primary">
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="font-body text-xs font-medium text-foreground">Missing &mdash; where to add them</p>
                  <ul className="mt-1 space-y-1">
                    {result.jd_match.skills_missing.length === 0 && <li className="font-body text-xs text-muted-foreground">Nothing obviously missing.</li>}
                    {result.jd_match.skills_missing.map((m) => (
                      <li key={m.skill} className="font-body text-xs text-muted-foreground">
                        <span className="font-medium text-foreground">{m.skill}</span> &mdash; {m.suggested_section}
                      </li>
                    ))}
                  </ul>
                </div>
                {result.jd_match.notes.map((n, i) => (
                  <p key={i} className="font-body text-xs text-muted-foreground">
                    {n}
                  </p>
                ))}
              </div>
            ) : (
              <p className="font-body text-sm text-muted-foreground">No job description was pasted, so this check was skipped.</p>
            )}
          </ResultCard>

          <ResultCard title="3. Bullet quality" icon={<AlertTriangle className="h-4 w-4" strokeWidth={1.75} />}>
            {result.bullet_quality.bullets.length === 0 ? (
              <p className="font-body text-sm text-muted-foreground">{result.bullet_quality.overall_notes[0]}</p>
            ) : (
              <div className="space-y-3">
                {result.bullet_quality.bullets.map((b, i) => (
                  <div key={i} className="rounded-xl border border-border bg-background/60 p-3">
                    <p className="font-body text-xs font-medium text-muted-foreground">{b.section}</p>
                    <p className="mt-1 font-body text-sm text-foreground">{b.text}</p>
                    {b.issues.map((issue, j) => (
                      <p key={j} className="mt-1 font-body text-xs text-accent">
                        &#9888; {issue}
                      </p>
                    ))}
                    {b.suggestion && <p className="mt-1 font-body text-xs text-muted-foreground">{b.suggestion}</p>}
                  </div>
                ))}
                {result.bullet_quality.overall_notes.map((n, i) => (
                  <p key={i} className="font-body text-xs text-muted-foreground">
                    {n}
                  </p>
                ))}
              </div>
            )}
          </ResultCard>

          <ResultCard title="4. Formatting risks" icon={<AlertTriangle className="h-4 w-4" strokeWidth={1.75} />}>
            <div className="space-y-2">
              {result.formatting_risks.risks.map((risk, i) => (
                <div key={i} className={`rounded-xl border px-3 py-2 font-body text-xs ${SEVERITY_STYLES[risk.severity]}`}>
                  <span className="font-semibold uppercase">{risk.severity}</span> &mdash; {risk.message}
                </div>
              ))}
            </div>
          </ResultCard>
        </div>
      )}
    </div>
  );
}

function ResultCard({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
      <h3 className="flex items-center gap-2 font-headline text-base text-foreground">
        <span className="text-primary">{icon}</span>
        {title}
      </h3>
      <div className="mt-3">{children}</div>
    </div>
  );
}

export default ScannerClient;
