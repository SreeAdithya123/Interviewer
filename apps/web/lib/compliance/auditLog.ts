import { ComplianceAuditLogEntry } from "./types";

export const SAMPLE_COMPLIANCE_AUDIT_LOGS: ComplianceAuditLogEntry[] = [
  {
    id: "aud_01",
    timestamp: "2026-10-24T09:15:22Z",
    actorId: "usr_student_810",
    actorRole: "student",
    action: "consent_granted",
    targetCandidateId: "usr_student_810",
    details: "Granted DPDP v2.1 consent for voice, video, and screen telemetry.",
    ipHash: "ip_8a91b2c",
  },
  {
    id: "aud_02",
    timestamp: "2026-10-24T10:45:10Z",
    actorId: "usr_recruiter_tcs",
    actorRole: "recruiter",
    action: "candidate_data_viewed",
    targetCandidateId: "usr_student_810",
    details: "Viewed interview report scorecards and dimension analytics for TCS Digital drive.",
    ipHash: "ip_7c11f4d",
  },
  {
    id: "aud_03",
    timestamp: "2026-10-24T14:30:00Z",
    actorId: "sys_cron_retention",
    actorRole: "system",
    action: "data_purged_retention",
    details: "Automated 90-day retention purge executed. 48 raw audio wav records purged.",
    ipHash: "ip_internal_cron",
  },
];

export function logComplianceAction(
  entry: Omit<ComplianceAuditLogEntry, "id" | "timestamp">
): ComplianceAuditLogEntry {
  return {
    ...entry,
    id: `aud_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    timestamp: new Date().toISOString(),
  };
}
