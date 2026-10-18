// Resume data shape, stored verbatim in resumes.data (jsonb).
//
// Per docs/BUILD_SPEC.md Part 4.3 ("Resumes are stored as JSON (JSON Resume
// schema)"), this is a trimmed-down JSON Resume (https://jsonresume.org/schema/)
// subset — field names match the real spec (basics/work/education/projects/
// skills/certificates/awards) instead of the reference Lovable site's
// bespoke personalInfo/careerInfo/experience/achievements shape, so a future
// import/export against other JSON Resume tooling needs no translation
// layer. Dates are kept as free-text strings ("Aug 2023", "2021 - 2023",
// "Present") rather than JSON Resume's strict ISO dates — good enough for a
// form a student fills in by hand, and simpler than a date-picker for a
// field that's often deliberately vague ("Present", "Expected 2026").

export interface ResumeBasics {
  name: string;
  label: string; // target role / headline, e.g. "Final-year CS student"
  email: string;
  phone: string;
  location: string; // free text, e.g. "Hyderabad, India"
  summary: string;
  profiles: ResumeProfileLink[]; // LinkedIn, GitHub, portfolio, ...
}

export interface ResumeProfileLink {
  id: string;
  network: string; // "LinkedIn", "GitHub", "Portfolio", ...
  url: string;
}

export interface ResumeEducation {
  id: string;
  institution: string;
  area: string; // field of study, e.g. "Computer Science"
  studyType: string; // "B.Tech", "M.Sc", ...
  startDate: string;
  endDate: string;
  score: string; // CGPA / percentage, free text
}

export interface ResumeWork {
  id: string;
  name: string; // company / organization
  position: string;
  startDate: string;
  endDate: string;
  summary: string;
  highlights: string[]; // bullet points — action + result
}

export interface ResumeProject {
  id: string;
  name: string;
  description: string;
  url: string;
  keywords: string[]; // technologies used
  highlights: string[]; // bullet points — action + result
}

export interface ResumeSkillGroup {
  id: string;
  name: string; // category, e.g. "Languages", "Tools"
  keywords: string[]; // individual skills in that category
}

export interface ResumeCertificate {
  id: string;
  name: string;
  issuer: string;
  date: string;
  url: string;
}

export interface ResumeAward {
  id: string;
  title: string;
  date: string;
  awarder: string;
  summary: string;
}

export interface ResumeData {
  basics: ResumeBasics;
  education: ResumeEducation[];
  work: ResumeWork[];
  projects: ResumeProject[];
  skills: ResumeSkillGroup[];
  certificates: ResumeCertificate[];
  awards: ResumeAward[];
}

/** Mirrors the `resumes` table (supabase/migrations/20261015120002_resume.sql). */
export interface ResumeRow {
  id: string;
  user_id: string;
  title: string;
  template: string;
  data: ResumeData;
  version: number;
  is_primary: boolean;
  created_at: string;
  updated_at: string;
}

export type ResumeTemplateId = "minimal-professional" | "modern-corporate";

export const RESUME_TEMPLATES: { id: ResumeTemplateId; label: string; description: string }[] = [
  {
    id: "minimal-professional",
    label: "Minimal Professional",
    description: "Single column, generous whitespace, serif headings. Safe default for most roles.",
  },
  {
    id: "modern-corporate",
    label: "Modern Corporate",
    description: "Single column, bold section headers, compact skills grid. Good for tech/corporate roles.",
  },
];

export function isResumeTemplateId(value: string): value is ResumeTemplateId {
  return value === "minimal-professional" || value === "modern-corporate";
}
