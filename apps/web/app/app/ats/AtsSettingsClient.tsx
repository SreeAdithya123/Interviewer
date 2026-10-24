"use client";

import { useState } from "react";
import type { AtsProvider } from "@/lib/ats/types";
import { parseAtsWebhookPayload, buildAtsScoreSyncNote } from "@/lib/ats/connector";

interface ProviderCardProps {
  id: AtsProvider;
  name: string;
  tagline: string;
  logo: string;
  brandColor: string;
  docsUrl: string;
}

const PROVIDERS: ProviderCardProps[] = [
  {
    id: "greenhouse",
    name: "Greenhouse",
    tagline: "Harvest API & Webhooks Ingestion",
    logo: "GH",
    brandColor: "#00B259",
    docsUrl: "https://support.greenhouse.io/hc/en-us/articles/202924109-Webhooks",
  },
  {
    id: "lever",
    name: "Lever",
    tagline: "Opportunities & Candidate Notes API",
    logo: "LV",
    brandColor: "#2A75F3",
    docsUrl: "https://hire.lever.co/developer/documentation",
  },
  {
    id: "darwinbox",
    name: "Darwinbox",
    tagline: "India's Enterprise HR & Recruitment Platform",
    logo: "DB",
    brandColor: "#E02636",
    docsUrl: "https://developer.darwinbox.com",
  },
];

export function AtsSettingsClient() {
  const [selectedProvider, setSelectedProvider] = useState<AtsProvider>("greenhouse");
  const [copiedProvider, setCopiedProvider] = useState<string | null>(null);
  const [simulatedCandidate, setSimulatedCandidate] = useState<{
    name: string;
    email: string;
    role: string;
  }>({
    name: "Ananya Sharma",
    email: "ananya.sharma@example.com",
    role: "Backend Engineer (Go/Distributed)",
  });
  const [simulationLogs, setSimulationLogs] = useState<string[]>([]);
  const [isSimulating, setIsSimulating] = useState(false);

  const getWebhookUrl = (provider: AtsProvider) => {
    const origin = typeof window !== "undefined" ? window.location.origin : "https://vyoman.ai";
    return `${origin}/api/ats/webhook/${provider}`;
  };

  const handleCopyWebhook = (provider: AtsProvider) => {
    const url = getWebhookUrl(provider);
    navigator.clipboard.writeText(url);
    setCopiedProvider(provider);
    setTimeout(() => setCopiedProvider(null), 2000);
  };

  const handleRunSimulation = async () => {
    setIsSimulating(true);
    setSimulationLogs([]);

    const pushLog = (msg: string) => setSimulationLogs((prev) => [...prev, msg]);

    pushLog(`[1] Dispatching mock inbound webhook from ${selectedProvider.toUpperCase()}...`);

    let mockPayload: Record<string, unknown> = {};
    if (selectedProvider === "greenhouse") {
      mockPayload = {
        action: "stage_change",
        payload: {
          candidate: {
            id: 849201,
            first_name: simulatedCandidate.name.split(" ")[0],
            last_name: simulatedCandidate.name.split(" ")[1] || "",
            email_addresses: [{ value: simulatedCandidate.email }],
          },
          application: {
            current_stage: "AI Assessment Round",
            jobs: [{ id: 104, name: simulatedCandidate.role }],
          },
        },
      };
    } else if (selectedProvider === "lever") {
      mockPayload = {
        action: "candidateStageChange",
        data: {
          candidateId: "lev_92819",
          contact: { name: simulatedCandidate.name, email: simulatedCandidate.email },
          opportunity: { headline: simulatedCandidate.role },
          stage: "AI Technical Interview",
        },
      };
    } else {
      mockPayload = {
        event: "candidate_shortlisted",
        candidate_details: {
          candidate_id: "db_55102",
          full_name: simulatedCandidate.name,
          email: simulatedCandidate.email,
          position_applied: simulatedCandidate.role,
          status: "Shortlisted for AI Assessment",
        },
      };
    }

    // Call parser
    const parsed = parseAtsWebhookPayload(selectedProvider, mockPayload);
    if (!parsed) {
      pushLog(`[ERROR] Failed to normalize candidate record.`);
      setIsSimulating(false);
      return;
    }

    pushLog(`[2] Candidate parsed: ${parsed.firstName} ${parsed.lastName} <${parsed.email}>`);
    pushLog(`[3] Target Role: ${parsed.jobTitle} | Trigger Stage: ${parsed.stageName}`);
    pushLog(`[4] Generated 1-Click Secure Assessment Magic Link`);

    // Simulate interview completion & score sync note pushback
    const mockScoreSync = buildAtsScoreSyncNote({
      candidateEmail: parsed.email,
      atsCandidateId: parsed.atsCandidateId,
      interviewId: "int_preview_889",
      overallScore: 88,
      integrityTrustBand: "clean",
      integrityScore: 96,
      reportUrl: `https://vyoman.ai/app/interview/int_preview_889/report`,
      strengths: [
        "Exceptional modular decomposition and clean SOLID patterns",
        "Clear algorithmic complexity justification (O(N log K) priority queue)",
      ],
      weakAreas: ["Minor hesitation around distributed database partition tolerance"],
      recommendation: "strong_hire",
    });

    pushLog(`[5] Generated Outbound Recruiter Assessment Note for ${selectedProvider.toUpperCase()}:`);
    pushLog(mockScoreSync);
    setIsSimulating(false);
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div>
        <h1 className="font-heading text-xl font-semibold tracking-tight">
          Enterprise ATS & Recruiter Integrations
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Bi-directional sync with Greenhouse, Lever, and Darwinbox. Automatically trigger AI interviews upon candidate stage changes and push scorecards back to recruiters.
        </p>
      </div>

      {/* Provider Selector Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {PROVIDERS.map((p) => {
          const isSelected = selectedProvider === p.id;
          return (
            <div
              key={p.id}
              onClick={() => setSelectedProvider(p.id)}
              className={`cursor-pointer rounded-lg border p-4 transition-all ${
                isSelected
                  ? "border-foreground bg-card ring-1 ring-foreground/20"
                  : "border-border/80 bg-card hover:border-foreground/40"
              }`}
            >
              <div className="flex items-center justify-between">
                <div
                  className="flex h-8 w-8 items-center justify-center rounded text-xs font-semibold text-white"
                  style={{ backgroundColor: p.brandColor }}
                >
                  {p.logo}
                </div>
                <span className="rounded bg-muted px-2 py-0.5 font-mono text-[10px] text-muted-foreground uppercase">
                  Connected
                </span>
              </div>
              <h2 className="mt-3 font-heading text-sm font-semibold">{p.name}</h2>
              <p className="mt-0.5 text-xs text-muted-foreground">{p.tagline}</p>
            </div>
          );
        })}
      </div>

      {/* Active Provider Config Box */}
      <div className="rounded-lg border border-border/80 bg-card p-5 space-y-4">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between border-b border-border/80 pb-3">
          <div>
            <h2 className="font-heading text-sm font-semibold text-foreground">
              {selectedProvider.toUpperCase()} Webhook Configuration
            </h2>
            <p className="text-xs text-muted-foreground">
              Copy this webhook URL into your {selectedProvider} admin settings under Webhook Subscriptions.
            </p>
          </div>
          <button
            type="button"
            onClick={() => handleCopyWebhook(selectedProvider)}
            className="inline-flex h-8 items-center rounded bg-foreground px-3 text-xs font-medium text-background hover:opacity-90"
          >
            {copiedProvider === selectedProvider ? "Copied!" : "Copy Webhook URL"}
          </button>
        </div>

        <div>
          <label className="block text-xs font-medium text-muted-foreground">
            Inbound Ingestion Webhook URL
          </label>
          <div className="mt-1 flex items-center gap-2">
            <input
              type="text"
              readOnly
              value={getWebhookUrl(selectedProvider)}
              className="h-8 w-full rounded border border-border/80 bg-muted/30 px-3 font-mono text-xs text-foreground outline-none"
            />
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="block text-xs font-medium text-foreground">Trigger Stage Name</label>
            <input
              type="text"
              defaultValue="AI Technical Assessment"
              className="mt-1 h-8 w-full rounded border border-border/80 bg-background px-3 font-body text-xs text-foreground outline-none focus:border-foreground/40"
            />
            <span className="text-[11px] text-muted-foreground">
              Moving candidates to this stage sends an automated Vyoman invite.
            </span>
          </div>

          <div>
            <label className="block text-xs font-medium text-foreground">Auto-Push Scorecard Note</label>
            <div className="mt-2 flex items-center gap-2">
              <input type="checkbox" defaultChecked className="rounded border-border/80" />
              <span className="text-xs text-foreground">Post scorecard report directly to candidate activity feed</span>
            </div>
          </div>
        </div>
      </div>

      {/* Interactive Webhook Simulator */}
      <div className="rounded-lg border border-border/80 bg-card p-5 space-y-4">
        <div className="border-b border-border/80 pb-3">
          <h2 className="font-heading text-sm font-semibold text-foreground">
            Test Bi-directional ATS Sync Simulator
          </h2>
          <p className="text-xs text-muted-foreground">
            Simulate an incoming stage transition webhook from {selectedProvider} and observe candidate parsing and scorecard sync.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <div>
            <label className="block text-xs font-medium text-foreground">Candidate Name</label>
            <input
              type="text"
              value={simulatedCandidate.name}
              onChange={(e) => setSimulatedCandidate((p) => ({ ...p, name: e.target.value }))}
              className="mt-1 h-8 w-full rounded border border-border/80 bg-background px-3 font-body text-xs text-foreground outline-none focus:border-foreground/40"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-foreground">Candidate Email</label>
            <input
              type="email"
              value={simulatedCandidate.email}
              onChange={(e) => setSimulatedCandidate((p) => ({ ...p, email: e.target.value }))}
              className="mt-1 h-8 w-full rounded border border-border/80 bg-background px-3 font-body text-xs text-foreground outline-none focus:border-foreground/40"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-foreground">Job Title</label>
            <input
              type="text"
              value={simulatedCandidate.role}
              onChange={(e) => setSimulatedCandidate((p) => ({ ...p, role: e.target.value }))}
              className="mt-1 h-8 w-full rounded border border-border/80 bg-background px-3 font-body text-xs text-foreground outline-none focus:border-foreground/40"
            />
          </div>
        </div>

        <button
          type="button"
          onClick={handleRunSimulation}
          disabled={isSimulating}
          className="inline-flex h-8 items-center rounded bg-foreground px-4 text-xs font-medium text-background hover:opacity-90 disabled:opacity-50"
        >
          {isSimulating ? "Running ATS Sync..." : `Dispatch Mock ${selectedProvider.toUpperCase()} Webhook`}
        </button>

        {simulationLogs.length > 0 && (
          <div className="mt-3 rounded border border-border/80 bg-muted/20 p-3 font-mono text-[11px] text-foreground space-y-1 overflow-x-auto max-h-64">
            {simulationLogs.map((log, i) => (
              <div key={i} className="whitespace-pre-wrap leading-relaxed">
                {log}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
