"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { AlertTriangle, CheckCircle2, FileText, ScanLine, Upload, X } from "lucide-react";
import { scanResume, type ScanResumeResult } from "@/lib/resume/actions";
import type { ResumeRow } from "@/lib/resume/types";

async function fileToBase64(file: File): Promise<string> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  let binary = "";
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

type Source = "upload" | "saved";

const SEVERITY_STYLES: Record<string, string> = {
  high: "border-rose-200/60 bg-rose-50 text-rose-900 dark:border-rose-900/40 dark:bg-rose-950/30 dark:text-rose-300",
  medium: "border-amber-200/60 bg-amber-50 text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-300",
  low: "border-border/80 bg-muted/40 text-muted-foreground",
};

export function ScannerClient({ resumes }: { resumes: ResumeRow[] }) {
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
      const selectedResume = source === "saved" ? resumes.find((r) => r.id === selectedResumeId) ?? null : null;
      const pdfBase64 = source === "upload" && file ? await fileToBase64(file) : null;

      const scanResult = await scanResume({
        resumeId: selectedResume?.id ?? null,
        pdfBase64,
        jobDescriptionText: jdText.trim() || null,
      });

      setResult(scanResult);
      setStatus("idle");
    } catch (e) {
      setStatus("error");
      setError(e instanceof Error ? e.message : "Something went wrong while scanning.");
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <Link href="/app/resume" className="font-body text-xs text-muted-foreground hover:text-foreground">
          &larr; Back to resumes
        </Link>
        <h1 className="mt-1 font-headline text-2xl font-semibold tracking-tight text-foreground">
          Resume Scanner
        </h1>
        <p className="mt-0.5 font-body text-sm text-muted-foreground">
          Four honest ATS checks: section health, job description keyword coverage, action-metric quality, and PDF formatting risks.
        </p>
      </div>

      {/* Input Configuration Card */}
      <div className="rounded-lg border border-border/80 bg-card p-5 space-y-4">
        {/* Source Toggle */}
        <div className="inline-flex h-8 items-center rounded border border-border/80 bg-muted/40 p-0.5 text-xs font-body">
          <button
            type="button"
            onClick={() => setSource("saved")}
            disabled={resumes.length === 0}
            className={`rounded px-3 py-1 font-medium transition-colors ${
              source === "saved"
                ? "bg-background text-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Use saved profile
          </button>
          <button
            type="button"
            onClick={() => setSource("upload")}
            className={`rounded px-3 py-1 font-medium transition-colors ${
              source === "upload"
                ? "bg-background text-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Upload a PDF
          </button>
        </div>

        {/* Selected File / Profile */}
        <div>
          {source === "saved" ? (
            resumes.length === 0 ? (
              <p className="font-body text-xs text-muted-foreground">
                You have no saved resumes.{" "}
                <Link href="/app/resume/builder" className="font-medium text-foreground underline">
                  Build one first
                </Link>
                , or upload a PDF.
              </p>
            ) : (
              <div>
                <label className="block font-body text-xs font-medium text-muted-foreground mb-1">
                  Saved resume profile
                </label>
                <select
                  value={selectedResumeId}
                  onChange={(e) => setSelectedResumeId(e.target.value)}
                  className="h-8 w-full max-w-sm rounded border border-border/80 bg-background px-2.5 font-body text-xs text-foreground outline-none focus:border-foreground/40"
                >
                  {resumes.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.title}
                      {r.is_primary ? " (primary)" : ""}
                    </option>
                  ))}
                </select>
              </div>
            )
          ) : (
            <div>
              {file ? (
                <div className="flex items-center gap-3 rounded border border-border/80 bg-background px-3 py-2">
                  <FileText className="h-4 w-4 text-muted-foreground shrink-0" strokeWidth={1.5} />
                  <div className="flex-1 min-w-0">
                    <p className="font-body text-xs font-medium text-foreground truncate">{file.name}</p>
                    <p className="font-body text-[11px] text-muted-foreground">{(file.size / 1024).toFixed(1)} KB</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setFile(null)}
                    className="rounded p-1 text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex w-full flex-col items-center gap-1.5 rounded border border-dashed border-border/80 bg-background/50 p-6 text-center transition-colors hover:bg-muted/30"
                >
                  <Upload className="h-5 w-5 text-muted-foreground" strokeWidth={1.5} />
                  <span className="font-body text-xs font-medium text-foreground">Click to upload resume PDF</span>
                  <span className="font-body text-[11px] text-muted-foreground">Parsed directly by the engine for diagnostic analysis</span>
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

        {/* Optional Job Description */}
        <div>
          <label className="block font-body text-xs font-medium text-muted-foreground mb-1">
            Job description (optional &mdash; tests specific keyword coverage)
          </label>
          <textarea
            value={jdText}
            onChange={(e) => setJdText(e.target.value)}
            rows={3}
            placeholder="Paste the target job description or requirements here..."
            className="w-full resize-none rounded border border-border/80 bg-background p-2.5 font-body text-xs text-foreground outline-none focus:border-foreground/40 placeholder:text-muted-foreground/60"
          />
        </div>

        {/* Scan Trigger */}
        <div className="pt-1">
          <button
            type="button"
            onClick={handleScan}
            disabled={!canScan || status === "scanning"}
            className="inline-flex h-8 items-center gap-1.5 rounded bg-foreground px-4 font-body text-xs font-medium text-background transition-colors hover:bg-foreground/90 disabled:opacity-60"
          >
            {status === "scanning" ? (
              <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-background border-t-transparent" />
            ) : (
              <ScanLine className="h-3.5 w-3.5" />
            )}
            <span>{status === "scanning" ? "Analyzing resume..." : "Scan resume"}</span>
          </button>
        </div>

        {status === "error" && error && (
          <p className="rounded border border-rose-200 bg-rose-50 px-3 py-2 font-body text-xs text-rose-900 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300">
            {error}
          </p>
        )}
      </div>

      {/* Results Section */}
      {result && (
        <div className="space-y-4">
          <ResultCard title="1. Section parsing health" icon={<FileText className="h-4 w-4" />}>
            <p className="font-body text-xs text-foreground">
              Status: <span className="font-semibold capitalize">{result.parse_health.status}</span>
            </p>
            {result.parse_health.sections_detected.length > 0 && (
              <p className="mt-1 font-body text-xs text-muted-foreground">
                Detected sections: {result.parse_health.sections_detected.join(", ")}
              </p>
            )}
            {result.parse_health.sections_missing.length > 0 && (
              <p className="mt-1 font-body text-xs text-rose-700 dark:text-rose-400">
                Missing sections: {result.parse_health.sections_missing.join(", ")}
              </p>
            )}
            <ul className="mt-2 space-y-0.5 border-t border-border/60 pt-2 font-body text-xs text-muted-foreground">
              {result.parse_health.notes.map((n, i) => (
                <li key={i}>• {n}</li>
              ))}
            </ul>
          </ResultCard>

          <ResultCard title="2. Job description alignment" icon={<CheckCircle2 className="h-4 w-4" />}>
            {result.jd_match ? (
              <div className="space-y-3 font-body text-xs">
                <div>
                  <p className="font-medium text-foreground">Matching skills detected</p>
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {result.jd_match.skills_present.length === 0 && (
                      <span className="text-muted-foreground">None identified.</span>
                    )}
                    {result.jd_match.skills_present.map((s) => (
                      <span key={s} className="rounded border border-emerald-200/60 bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-900 dark:border-emerald-800/40 dark:bg-emerald-950/40 dark:text-emerald-300">
                        {s}
                      </span>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="font-medium text-foreground">Missing requirements to incorporate</p>
                  <ul className="mt-1 space-y-1">
                    {result.jd_match.skills_missing.length === 0 && (
                      <li className="text-muted-foreground">All key requirements present.</li>
                    )}
                    {result.jd_match.skills_missing.map((m) => (
                      <li key={m.skill} className="text-muted-foreground">
                        <span className="font-medium text-foreground">{m.skill}</span> &mdash; add to {m.suggested_section}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ) : (
              <p className="font-body text-xs text-muted-foreground">
                No job description was provided. Paste a JD above to evaluate keyword overlap.
              </p>
            )}
          </ResultCard>

          <ResultCard title="3. Bullet point metric quality" icon={<AlertTriangle className="h-4 w-4" />}>
            {result.bullet_quality.bullets.length === 0 ? (
              <p className="font-body text-xs text-muted-foreground">{result.bullet_quality.overall_notes[0]}</p>
            ) : (
              <div className="space-y-2.5">
                {result.bullet_quality.bullets.map((b, i) => (
                  <div key={i} className="rounded border border-border/80 bg-background p-3 font-body text-xs space-y-1">
                    <p className="text-[11px] font-medium text-muted-foreground">{b.section}</p>
                    <p className="font-medium text-foreground leading-relaxed">{b.text}</p>
                    {b.issues.map((issue, j) => (
                      <p key={j} className="text-[11px] text-amber-800 dark:text-amber-300">
                        ⚠ {issue}
                      </p>
                    ))}
                    {b.suggestion && <p className="text-[11px] text-muted-foreground italic">Suggestion: {b.suggestion}</p>}
                  </div>
                ))}
              </div>
            )}
          </ResultCard>

          <ResultCard title="4. ATS formatting & syntax risks" icon={<AlertTriangle className="h-4 w-4" />}>
            <div className="space-y-1.5 font-body text-xs">
              {result.formatting_risks.risks.map((risk, i) => (
                <div key={i} className={`rounded border px-2.5 py-1.5 ${SEVERITY_STYLES[risk.severity]}`}>
                  <span className="font-medium uppercase">{risk.severity}</span>: {risk.message}
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
    <div className="rounded-lg border border-border/80 bg-card p-5">
      <h3 className="flex items-center gap-2 font-body text-sm font-semibold text-foreground">
        <span className="text-muted-foreground">{icon}</span>
        {title}
      </h3>
      <div className="mt-3">{children}</div>
    </div>
  );
}

export default ScannerClient;
