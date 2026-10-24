/**
 * Company Hiring Blueprint Schema & Types.
 * Calibrated against tier-1 Indian engineering campus placement patterns
 * (TCS NQT, Infosys DSE/Specialist, Accenture ASE, Cognizant GenC, Amazon SDE-1).
 */

export type BlueprintCategory =
  | "mass_recruiter"
  | "product_firm"
  | "gcc"
  | "consulting";

export type BlueprintDifficulty = "foundational" | "intermediate" | "advanced" | "rigorous";

export interface BlueprintSampleQuestion {
  id: string;
  title: string;
  topic: string;
  type: "coding" | "technical" | "aptitude" | "behavioral";
  difficulty: BlueprintDifficulty;
  prompt: string;
  expectedConcepts: string[];
}

export interface BlueprintRound {
  roundNumber: number;
  name: string;
  type: "aptitude" | "coding" | "technical" | "hr" | "behavioral";
  durationMinutes: number;
  cutoffScore: number;
  questionCount: number;
  description: string;
  syllabus: string[];
  sampleQuestions: BlueprintSampleQuestion[];
}

export interface CompanyBlueprint {
  id: string;
  companyName: string;
  shortCode: string;
  slug: string;
  category: BlueprintCategory;
  brandColor: string;
  logoText: string;
  typicalPackageCtc: string; // e.g. "3.5 - 9.0 LPA"
  hiringTiers: Array<{
    name: string;
    ctc: string;
    minScore: number;
  }>;
  overview: string;
  selectionRatioEst: string; // e.g. "Top 12% across national pool"
  keyCompetencies: string[];
  rounds: BlueprintRound[];
  systemPromptModifier: string; // Tailors the Gemini interviewer persona
  codingLanguagesSupported: string[];
  interviewTips: string[];
}
