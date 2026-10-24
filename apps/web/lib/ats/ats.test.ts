import { describe, expect, it } from "vitest";
import {
  buildAtsScoreSyncNote,
  formatAtsOutboundRequest,
  parseAtsWebhookPayload,
  verifyAtsWebhookSignature,
} from "./connector";

describe("Universal ATS Integration Suite", () => {
  it("verifies webhook signature properly", () => {
    expect(verifyAtsWebhookSignature("greenhouse", "my_secret", "{}", "my_secret")).toBe(true);
    expect(verifyAtsWebhookSignature("greenhouse", "my_secret", "{}", "wrong_secret")).toBe(false);
  });

  it("parses Greenhouse stage change webhook payload", () => {
    const ghPayload = {
      action: "stage_change",
      payload: {
        candidate: {
          id: 50123,
          first_name: "Sneha",
          last_name: "Reddy",
          email_addresses: [{ value: "sneha.reddy@sasi.ac.in" }],
        },
        application: {
          current_stage: "AI Assessment Round",
          jobs: [{ id: 88, name: "Graduate Software Trainee" }],
        },
      },
    };

    const parsed = parseAtsWebhookPayload("greenhouse", ghPayload);
    expect(parsed).toBeDefined();
    expect(parsed?.firstName).toBe("Sneha");
    expect(parsed?.lastName).toBe("Reddy");
    expect(parsed?.email).toBe("sneha.reddy@sasi.ac.in");
    expect(parsed?.jobTitle).toBe("Graduate Software Trainee");
    expect(parsed?.atsCandidateId).toBe("50123");
  });

  it("parses Lever candidate stage change payload", () => {
    const leverPayload = {
      action: "candidateStageChange",
      data: {
        candidateId: "lev_7749",
        contact: {
          name: "Rohan Varma",
          email: "rohan.v@example.com",
        },
        opportunity: {
          headline: "Full-Stack Developer",
        },
        stage: "Technical Assessment",
      },
    };

    const parsed = parseAtsWebhookPayload("lever", leverPayload);
    expect(parsed?.firstName).toBe("Rohan");
    expect(parsed?.lastName).toBe("Varma");
    expect(parsed?.email).toBe("rohan.v@example.com");
    expect(parsed?.jobTitle).toBe("Full-Stack Developer");
  });

  it("parses Darwinbox candidate shortlist payload", () => {
    const dbPayload = {
      event: "candidate_shortlisted",
      candidate_details: {
        candidate_id: "db_9918",
        full_name: "Adithya Kandikonda",
        email: "adithya@sasi.ac.in",
        mobile_no: "+919876543210",
        position_applied: "Associate Systems Engineer",
        status: "Interview Round 1",
      },
    };

    const parsed = parseAtsWebhookPayload("darwinbox", dbPayload);
    expect(parsed?.firstName).toBe("Adithya");
    expect(parsed?.email).toBe("adithya@sasi.ac.in");
    expect(parsed?.jobTitle).toBe("Associate Systems Engineer");
  });

  it("generates markdown scorecard note and formatted outbound REST request", () => {
    const scorePayload = {
      candidateEmail: "ananya@example.com",
      atsCandidateId: "gh_123",
      interviewId: "int_456",
      overallScore: 92,
      integrityTrustBand: "clean" as const,
      integrityScore: 98,
      reportUrl: "https://vyoman.ai/app/interview/int_456/report",
      strengths: ["Strong problem decomposition", "Clean Java concurrency"],
      weakAreas: ["Minor syntax typo in binary search edge case"],
      recommendation: "strong_hire" as const,
    };

    const note = buildAtsScoreSyncNote(scorePayload);
    expect(note).toContain("STRONG HIRE");
    expect(note).toContain("92/100");
    expect(note).toContain("98% (CLEAN)");
    expect(note).toContain("Strong problem decomposition");

    const ghRequest = formatAtsOutboundRequest("greenhouse", "fake_key", scorePayload);
    expect(ghRequest.url).toContain("/v1/candidates/gh_123/activity_feed/notes");
    expect(ghRequest.headers.Authorization).toContain("Basic");
  });
});
