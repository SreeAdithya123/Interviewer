// TODO(phase-1): replace with real Gemini (native PDF input, OCR fallback
// for scanned PDFs) once GEMINI_API_KEY exists — docs/BUILD_SPEC.md Part
// 4.4. This stub returns realistic-shaped but entirely fake analysis so the
// resume scanner page can be built and exercised end to end. It never
// fabricates resume *content* — when a saved resume's real data is
// available it echoes the student's own bullets/sections back; only the
// judgments about that content (parse health, JD match, bullet quality,
// formatting risk) are mocked.
//
// The four return shapes match resume_scans' jsonb columns exactly
// (parse_health, jd_match, bullet_quality, formatting_risks) — see
// supabase/migrations/20261015120002_resume.sql — so the real engine
// integration can write the same shape without any client-side change.
// Per BUILD_SPEC Part 4.4, there is deliberately no single "ATS score" in
// here or anywhere these results are rendered.

import type { ResumeData } from "@/lib/resume/types";

export interface ParseHealthResult {
  status: "clean" | "partial" | "poor";
  sections_detected: string[];
  sections_missing: string[];
  notes: string[];
}

export interface JdMatchResult {
  skills_present: string[];
  skills_missing: { skill: string; suggested_section: string }[];
  notes: string[];
}

export interface BulletQualityResult {
  bullets: { section: string; text: string; issues: string[]; suggestion: string | null }[];
  overall_notes: string[];
}

export interface FormattingRisksResult {
  risks: { severity: "low" | "medium" | "high"; message: string }[];
}

export interface ScanResumeInput {
  /** A saved resume's real data, when the student picked one instead of uploading a file. */
  resumeData: ResumeData | null;
  /** Filename of an uploaded PDF, when that's the source instead. */
  uploadedFileName: string | null;
  uploadedFileSizeBytes: number | null;
  /** Pasted job description text, if any — drives jd_match. */
  jobDescriptionText: string | null;
}

export interface ScanResumeResult {
  parsed_resume: ResumeData | { note: string };
  parse_health: ParseHealthResult;
  jd_match: JdMatchResult | null;
  bullet_quality: BulletQualityResult;
  formatting_risks: FormattingRisksResult;
}

const COMMON_SKILLS = [
  "python",
  "javascript",
  "typescript",
  "sql",
  "react",
  "node",
  "java",
  "communication",
  "leadership",
  "git",
  "docker",
  "aws",
];

function extractKeywordsFromJd(jd: string): string[] {
  const lower = jd.toLowerCase();
  return COMMON_SKILLS.filter((skill) => lower.includes(skill));
}

function allBulletsFromResume(data: ResumeData): { section: string; text: string }[] {
  const bullets: { section: string; text: string }[] = [];
  for (const job of data.work) {
    for (const h of job.highlights) {
      if (h.trim()) bullets.push({ section: `Experience — ${job.position || job.name || "role"}`, text: h });
    }
  }
  for (const project of data.projects) {
    for (const h of project.highlights) {
      if (h.trim()) bullets.push({ section: `Project — ${project.name || "project"}`, text: h });
    }
  }
  return bullets;
}

/**
 * MOCK resume scan. Simulates provider latency and returns a
 * realistic-shaped, clearly-fake result matching resume_scans' jsonb
 * columns. Never calls a network provider.
 */
export async function scanResume(input: ScanResumeInput): Promise<ScanResumeResult> {
  await new Promise((resolve) => setTimeout(resolve, 900));

  const hasRealData = input.resumeData !== null;
  const bullets = input.resumeData ? allBulletsFromResume(input.resumeData) : [];

  const sectionsDetected: string[] = [];
  const sectionsMissing: string[] = [];
  if (input.resumeData) {
    if (input.resumeData.basics.name) sectionsDetected.push("Contact info");
    else sectionsMissing.push("Contact info");
    if (input.resumeData.education.length > 0) sectionsDetected.push("Education");
    else sectionsMissing.push("Education");
    if (input.resumeData.work.length > 0) sectionsDetected.push("Experience");
    if (input.resumeData.skills.length > 0) sectionsDetected.push("Skills");
    else sectionsMissing.push("Skills");
    if (input.resumeData.projects.length > 0) sectionsDetected.push("Projects");
  } else {
    // Uploaded PDF: no real parse happened yet (that needs Gemini/OCR), so
    // this is deliberately vague rather than inventing section names.
    sectionsDetected.push("Text layer found");
  }

  const parse_health: ParseHealthResult = {
    status: hasRealData ? "clean" : "partial",
    sections_detected: sectionsDetected,
    sections_missing: sectionsMissing,
    notes: hasRealData
      ? ["[Preview] Parsed from your saved resume data directly — no OCR needed."]
      : [
          "[Preview] Full text extraction and section detection need the real engine (Gemini + OCR fallback), not yet connected.",
          input.uploadedFileName ? `Received "${input.uploadedFileName}" (${Math.round((input.uploadedFileSizeBytes ?? 0) / 1024)} KB).` : "",
        ].filter(Boolean),
  };

  let jd_match: JdMatchResult | null = null;
  if (input.jobDescriptionText && input.jobDescriptionText.trim().length > 0) {
    const jdSkills = extractKeywordsFromJd(input.jobDescriptionText);
    const resumeText = (
      (input.resumeData?.skills.flatMap((s) => s.keywords).join(" ") ?? "") +
      " " +
      bullets.map((b) => b.text).join(" ")
    ).toLowerCase();
    const present = jdSkills.filter((s) => resumeText.includes(s));
    const missing = jdSkills.filter((s) => !resumeText.includes(s));
    jd_match = {
      skills_present: present,
      skills_missing: missing.map((skill) => ({
        skill,
        suggested_section: "Skills, or in a relevant project bullet",
      })),
      notes: [
        "[Preview] Keyword overlap only — real semantic matching needs the engine's Gemini integration.",
      ],
    };
  }

  const bulletSample = bullets.slice(0, 5);
  const bullet_quality: BulletQualityResult = {
    bullets: bulletSample.map((b) => ({
      section: b.section,
      text: b.text,
      issues: /\d/.test(b.text) ? [] : ["No measurable result — consider adding a number."],
      suggestion: /\d/.test(b.text) ? null : "[Preview] Rewrite suggestion will appear here once the engine is connected.",
    })),
    overall_notes:
      bulletSample.length > 0
        ? ["[Preview] Full action/result scoring needs the real engine; shown here is a structural check only."]
        : ["No bullets found to review yet — add experience or project highlights in the resume builder."],
  };

  const formatting_risks: FormattingRisksResult = {
    risks: hasRealData
      ? [{ severity: "low", message: "Built from the structured resume builder — single column, no tables or text-in-images risk." }]
      : [
          { severity: "medium", message: "[Preview] Column/table layout risk can't be checked until the real PDF parser runs." },
          { severity: "low", message: "[Preview] Font/image-text risk can't be checked until the real PDF parser runs." },
        ],
  };

  return {
    parsed_resume: input.resumeData ?? { note: "[Preview] Full PDF parsing not yet connected to the real engine." },
    parse_health,
    jd_match,
    bullet_quality,
    formatting_risks,
  };
}
