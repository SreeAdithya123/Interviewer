import {
  CandidateConsentNotice,
  CandidateConsentRecord,
  ConsentStatus,
} from "./types";

export const DEFAULT_DPDP_CONSENT_NOTICE: CandidateConsentNotice = {
  noticeVersion: "v2.1-dpdp-2023",
  purposeSummary:
    "Your audio speech, video proctoring snapshots, and resume are collected solely for automated placement evaluation and test integrity. In strict compliance with India's Digital Personal Data Protection Act (2023), your data is never sold, shared with unapproved third parties, or used for public AI model training.",
  dataCollected: [
    "Microphone audio recording for speech-to-text interview transcription",
    "Webcam snapshots for continuous proctor presence and posture verification",
    "Screen focus telemetry (tab switching and full-screen compliance)",
    "Uploaded resume text for personalized technical questions",
  ],
  retentionDays: 90,
  dataResidencyRegion: "ap-south-1 (Mumbai, India)",
  dpoContactEmail: "privacy@vyoman.ai",
};

/**
 * Creates a compliant consent record timestamped with an anonymized IP hash.
 */
export function createConsentRecord(
  candidateId: string,
  candidateEmail: string,
  consentItems: CandidateConsentRecord["consentItems"],
  ipAddress: string = "127.0.0.1",
  userAgent: string = "Mozilla/5.0"
): CandidateConsentRecord {
  // Simple deterministic hash of IP address for privacy-preserving audit logs
  let hash = 0;
  for (let i = 0; i < ipAddress.length; i++) {
    hash = (hash << 5) - hash + ipAddress.charCodeAt(i);
    hash |= 0;
  }
  const ipAddressHash = `ip_${Math.abs(hash).toString(16)}`;

  return {
    id: `consent_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    candidateId,
    candidateEmail,
    noticeVersion: DEFAULT_DPDP_CONSENT_NOTICE.noticeVersion,
    status: "granted",
    grantedAt: new Date().toISOString(),
    ipAddressHash,
    userAgent,
    consentItems,
  };
}

/**
 * Handles withdrawal of candidate consent under DPDP Act Chapter III (Data Principal Rights).
 */
export function withdrawConsent(record: CandidateConsentRecord): CandidateConsentRecord {
  return {
    ...record,
    status: "withdrawn",
    withdrawnAt: new Date().toISOString(),
  };
}

/**
 * Validates if candidate consent is currently active and covers all essential requirements.
 */
export function isConsentActiveAndValid(record?: CandidateConsentRecord | null): boolean {
  if (!record) return false;
  if (record.status !== "granted") return false;
  // All core consent items must be true for assessment to proceed
  return (
    record.consentItems.audioRecording &&
    record.consentItems.webcamProctoring &&
    record.consentItems.screenFocusTelemetry
  );
}
