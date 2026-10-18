import type { ResumeData } from "./types";

let idCounter = 0;

/**
 * Local-only id for a list row inside resumes.data (education[], work[],
 * ...). Never sent anywhere as a real identifier — it only keys React lists
 * and lets "remove this row" find the right entry. Monotonic counter (not
 * crypto.randomUUID()) is fine here: it only needs to be unique within one
 * browser session's in-memory edit, and never has to run on the server.
 */
export function makeLocalId(): string {
  idCounter += 1;
  return `local-${Date.now()}-${idCounter}`;
}

export function emptyResumeData(): ResumeData {
  return {
    basics: {
      name: "",
      label: "",
      email: "",
      phone: "",
      location: "",
      summary: "",
      profiles: [],
    },
    education: [],
    work: [],
    projects: [],
    skills: [],
    certificates: [],
    awards: [],
  };
}

/**
 * Normalizes a resumes.data jsonb value that may be `{}` (the column's
 * default) or missing newer fields (an older row saved before a field was
 * added) into a complete ResumeData — so every form section always has an
 * array to map over instead of needing optional-chaining everywhere.
 */
export function normalizeResumeData(data: unknown): ResumeData {
  const empty = emptyResumeData();
  if (typeof data !== "object" || data === null) {
    return empty;
  }
  const d = data as Partial<ResumeData>;
  return {
    basics: { ...empty.basics, ...d.basics },
    education: Array.isArray(d.education) ? d.education : [],
    work: Array.isArray(d.work) ? d.work : [],
    projects: Array.isArray(d.projects) ? d.projects : [],
    skills: Array.isArray(d.skills) ? d.skills : [],
    certificates: Array.isArray(d.certificates) ? d.certificates : [],
    awards: Array.isArray(d.awards) ? d.awards : [],
  };
}
