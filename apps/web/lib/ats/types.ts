/**
 * Universal ATS Integration Suite.
 * Connectors for Enterprise ATS platforms: Greenhouse, Lever, and Darwinbox.
 */

export type AtsProvider = "greenhouse" | "lever" | "darwinbox";

export interface AtsCandidate {
  atsCandidateId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  jobId?: string;
  jobTitle?: string;
  stageName?: string;
  resumeUrl?: string;
  appliedAt?: string;
}

export interface AtsWebhookEvent {
  provider: AtsProvider;
  eventType: string; // e.g. "candidate_stage_change", "application_created"
  candidate: AtsCandidate;
  rawPayload: Record<string, unknown>;
  timestamp: string;
}

export interface AtsScoreExportPayload {
  candidateEmail: string;
  atsCandidateId: string;
  interviewId: string;
  overallScore: number; // 0-100
  integrityTrustBand: "clean" | "suspicious" | "flagged" | "critical";
  integrityScore: number;
  reportUrl: string;
  strengths: string[];
  weakAreas: string[];
  recommendation: "strong_hire" | "hire" | "borderline" | "no_hire";
}

export interface AtsIntegrationConfig {
  provider: AtsProvider;
  enabled: boolean;
  apiKey?: string;
  webhookSecret?: string;
  targetStageTrigger: string; // Stage that triggers Vyoman interview (e.g. "AI Assessment")
  autoExportScores: boolean;
  webhookEndpointUrl: string;
}
