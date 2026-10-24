/**
 * India DPDP Act (2023) & SOC 2 Type II Compliance Suite Types.
 * Defines candidate consent records, data retention policies,
 * Mumbai data residency assertions, and tamper-evident audit logs.
 */

export type ConsentStatus = "granted" | "withdrawn" | "expired";

export interface CandidateConsentNotice {
  noticeVersion: string; // e.g. "v2.1-dpdp-2023"
  purposeSummary: string;
  dataCollected: string[];
  retentionDays: number;
  dataResidencyRegion: string; // "ap-south-1" (AWS Mumbai)
  dpoContactEmail: string; // Data Protection Officer
}

export interface CandidateConsentRecord {
  id: string;
  candidateId: string;
  candidateEmail: string;
  noticeVersion: string;
  status: ConsentStatus;
  grantedAt: string;
  withdrawnAt?: string;
  ipAddressHash: string;
  userAgent: string;
  consentItems: {
    audioRecording: boolean;
    webcamProctoring: boolean;
    screenFocusTelemetry: boolean;
    resumeStorageAndAnalysis: boolean;
    scoreSharingWithCollegeAndRecruiters: boolean;
  };
}

export type RetentionDurationDays = 30 | 90 | 180 | 365;

export interface DataRetentionPolicy {
  collegeId?: string;
  policyName: string;
  audioRetentionDays: RetentionDurationDays;
  videoSnapshotRetentionDays: RetentionDurationDays;
  scorecardRetentionDays: RetentionDurationDays;
  autoPurgeEnabled: boolean;
  lastPurgeRunAt?: string;
  recordsPurgedTotal: number;
}

export interface ComplianceAuditLogEntry {
  id: string;
  timestamp: string;
  actorId: string;
  actorRole: "student" | "college_admin" | "recruiter" | "platform_admin" | "system";
  action:
    | "consent_granted"
    | "consent_withdrawn"
    | "candidate_data_viewed"
    | "scorecard_exported"
    | "proctor_recording_accessed"
    | "data_erasure_requested"
    | "data_purged_retention";
  targetCandidateId?: string;
  details: string;
  ipHash: string;
}
