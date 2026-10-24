import {
  AtsCandidate,
  AtsProvider,
  AtsScoreExportPayload,
  AtsWebhookEvent,
} from "./types";

/**
 * Validates incoming webhook signature or authentication token.
 */
export function verifyAtsWebhookSignature(
  provider: AtsProvider,
  secret: string,
  payloadRaw: string,
  signatureHeader?: string | null
): boolean {
  if (!secret) return true; // If no secret configured, allow in dev/simulation
  if (!signatureHeader) return false;

  // Simple token or signature match
  if (signatureHeader === secret) return true;
  if (signatureHeader.includes(secret)) return true;

  return false;
}

/**
 * Normalizes vendor-specific ATS webhook payloads into a unified AtsCandidate record.
 */
export function parseAtsWebhookPayload(
  provider: AtsProvider,
  raw: Record<string, unknown>
): AtsCandidate | null {
  try {
    if (provider === "greenhouse") {
      const p = (raw.payload as Record<string, unknown>) || raw;
      const cand = (p.candidate as Record<string, unknown>) || {};
      const emails = (cand.email_addresses as Array<{ value: string }>) || [];
      const primaryEmail = emails[0]?.value || (cand.email as string) || "";
      const app = (p.application as Record<string, unknown>) || {};
      const jobs = (app.jobs as Array<{ id: number; name: string }>) || [];

      return {
        atsCandidateId: String(cand.id || p.id || "gh_cand"),
        firstName: String(cand.first_name || "Candidate"),
        lastName: String(cand.last_name || ""),
        email: primaryEmail.toLowerCase(),
        phone: String(cand.phone_numbers || ""),
        jobId: jobs[0]?.id ? String(jobs[0].id) : undefined,
        jobTitle: jobs[0]?.name || "Software Engineer",
        stageName: String(app.current_stage || "AI Assessment"),
      };
    }

    if (provider === "lever") {
      const data = (raw.data as Record<string, unknown>) || raw;
      const contact = (data.contact as Record<string, unknown>) || {};
      const opp = (data.opportunity as Record<string, unknown>) || {};
      const fullName = String(contact.name || data.name || "Candidate");
      const nameParts = fullName.split(" ");
      const firstName = nameParts[0] || "Candidate";
      const lastName = nameParts.slice(1).join(" ");

      return {
        atsCandidateId: String(data.candidateId || data.id || "lever_cand"),
        firstName,
        lastName,
        email: String(contact.email || data.email || "").toLowerCase(),
        jobTitle: String(opp.headline || "Software Engineer"),
        stageName: String(data.stage || "AI Assessment"),
      };
    }

    if (provider === "darwinbox") {
      const cand =
        (raw.candidate_details as Record<string, unknown>) ||
        (raw.data as Record<string, unknown>) ||
        raw;
      const fullName = String(cand.full_name || cand.name || "Candidate");
      const nameParts = fullName.split(" ");
      const firstName = nameParts[0] || "Candidate";
      const lastName = nameParts.slice(1).join(" ");

      return {
        atsCandidateId: String(cand.candidate_id || cand.id || "db_cand"),
        firstName,
        lastName,
        email: String(cand.email || "").toLowerCase(),
        phone: String(cand.mobile_no || cand.phone || ""),
        jobTitle: String(cand.position_applied || "Graduate Trainee"),
        stageName: String(cand.status || "Shortlisted"),
      };
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Renders an executive markdown summary of the candidate's interview performance
 * to be saved as an internal recruiter note in Greenhouse/Lever/Darwinbox.
 */
export function buildAtsScoreSyncNote(payload: AtsScoreExportPayload): string {
  const recBadge =
    payload.recommendation === "strong_hire"
      ? "⭐️ STRONG HIRE"
      : payload.recommendation === "hire"
      ? "✅ HIRE"
      : payload.recommendation === "borderline"
      ? "⚠️ BORDERLINE"
      : "❌ NO HIRE";

  return [
    `### Vyoman AI Interview Assessment Results`,
    ``,
    `**Recommendation:** ${recBadge}`,
    `**Overall Readiness Score:** ${payload.overallScore}/100`,
    `**Integrity Index:** ${payload.integrityScore}% (${payload.integrityTrustBand.toUpperCase()})`,
    ``,
    `#### Key Observed Strengths:`,
    ...payload.strengths.slice(0, 3).map((s) => `• ${s}`),
    ``,
    `#### Diagnostic Weak Areas:`,
    ...payload.weakAreas.slice(0, 3).map((w) => `• ${w}`),
    ``,
    `🔗 [View Full Interactive Video, Rubrics & Transcript](${payload.reportUrl})`,
  ].join("\n");
}

/**
 * Builds the outbound REST API request configuration for pushing scores back into the ATS.
 */
export function formatAtsOutboundRequest(
  provider: AtsProvider,
  apiKey: string,
  payload: AtsScoreExportPayload
): {
  url: string;
  method: string;
  headers: Record<string, string>;
  body: Record<string, unknown>;
} {
  const noteBody = buildAtsScoreSyncNote(payload);

  if (provider === "greenhouse") {
    return {
      url: `https://harvest.greenhouse.io/v1/candidates/${payload.atsCandidateId}/activity_feed/notes`,
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`${apiKey}:`).toString("base64")}`,
        "Content-Type": "application/json",
      },
      body: {
        user_id: 1, // Standard system bot user ID in Greenhouse
        body: noteBody,
        visibility: "admin_only",
      },
    };
  }

  if (provider === "lever") {
    return {
      url: `https://api.lever.co/v1/opportunities/${payload.atsCandidateId}/notes`,
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: {
        value: noteBody,
      },
    };
  }

  // Darwinbox API v2 endpoint
  return {
    url: `https://api.darwinbox.in/recruitment/v2/candidate/${payload.atsCandidateId}/status-feedback`,
    method: "POST",
    headers: {
      "X-Darwinbox-ApiKey": apiKey,
      "Content-Type": "application/json",
    },
    body: {
      score: payload.overallScore,
      integrity_status: payload.integrityTrustBand,
      feedback: noteBody,
      assessment_link: payload.reportUrl,
    },
  };
}
