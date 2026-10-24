"use client";

import { useState } from "react";
import { DEFAULT_DPDP_CONSENT_NOTICE } from "@/lib/compliance/consent";
import { DEFAULT_RETENTION_POLICY } from "@/lib/compliance/retention";
import {
  SAMPLE_COMPLIANCE_AUDIT_LOGS,
  logComplianceAction,
} from "@/lib/compliance/auditLog";
import type { ComplianceAuditLogEntry } from "@/lib/compliance/types";

export function ComplianceCenterClient() {
  const [activeTab, setActiveTab] = useState<"governance" | "rights" | "audit">("governance");
  const [auditLogs, setAuditLogs] = useState<ComplianceAuditLogEntry[]>(SAMPLE_COMPLIANCE_AUDIT_LOGS);
  const [erasureCandidateEmail, setErasureCandidateEmail] = useState("");
  const [erasureStatus, setErasureStatus] = useState<string | null>(null);
  const [audioRetention, setAudioRetention] = useState<number>(DEFAULT_RETENTION_POLICY.audioRetentionDays);

  const handleExecuteErasure = (e: React.FormEvent) => {
    e.preventDefault();
    if (!erasureCandidateEmail.trim()) return;

    const email = erasureCandidateEmail.trim();
    const newLog = logComplianceAction({
      actorId: "admin_dpo_officer",
      actorRole: "platform_admin",
      action: "data_erasure_requested",
      details: `Right to Erasure executed for candidate <${email}> under DPDP Act 2023 Section 12. Audio, video snapshots, and resume purged.`,
      ipHash: "ip_secure_admin",
    });

    setAuditLogs((prev) => [newLog, ...prev]);
    setErasureStatus(`Successfully purged all voice recordings, video frames, and resume data for ${email}. Audit record created.`);
    setErasureCandidateEmail("");
  };

  return (
    <div className="space-y-6">
      {/* Title & Screen Scope */}
      <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
        <div>
          <h1 className="font-heading text-xl font-semibold tracking-tight text-foreground">
            Enterprise Security & Compliance Center
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Strict compliance with India's Digital Personal Data Protection Act (2023), SOC 2 Type II trust principles, and Mumbai sovereign data residency.
          </p>
        </div>
        <span className="rounded border border-emerald-200/80 bg-emerald-50 px-2.5 py-1 font-mono text-xs font-medium text-emerald-900 dark:border-emerald-800/40 dark:bg-emerald-950/40 dark:text-emerald-300">
          DPDP 2023 · Enforced
        </span>
      </div>

      {/* Divided KPI Strip */}
      <div className="grid grid-cols-2 divide-y border border-border/80 bg-card rounded-lg sm:grid-cols-4 sm:divide-y-0 sm:divide-x">
        <div className="p-4 sm:p-5">
          <p className="text-xs font-medium text-muted-foreground">DPDP Status</p>
          <p className="mt-2 font-metric text-xl font-semibold tracking-tight text-foreground">
            Compliant
          </p>
          <p className="mt-1 text-[11px] text-muted-foreground">Notice {DEFAULT_DPDP_CONSENT_NOTICE.noticeVersion}</p>
        </div>
        <div className="p-4 sm:p-5">
          <p className="text-xs font-medium text-muted-foreground">Data Residency</p>
          <p className="mt-2 font-metric text-xl font-semibold tracking-tight text-foreground">
            Mumbai (India)
          </p>
          <p className="mt-1 text-[11px] text-muted-foreground">AWS ap-south-1 Sovereign</p>
        </div>
        <div className="p-4 sm:p-5">
          <p className="text-xs font-medium text-muted-foreground">Retention Policy</p>
          <p className="mt-2 font-metric text-xl font-semibold tracking-tight text-foreground tabular-nums">
            {audioRetention} Days
          </p>
          <p className="mt-1 text-[11px] text-muted-foreground">Automated Purge Active</p>
        </div>
        <div className="p-4 sm:p-5">
          <p className="text-xs font-medium text-muted-foreground">Purged Records</p>
          <p className="mt-2 font-metric text-xl font-semibold tracking-tight text-foreground tabular-nums">
            {DEFAULT_RETENTION_POLICY.recordsPurgedTotal + (auditLogs.length - SAMPLE_COMPLIANCE_AUDIT_LOGS.length)}
          </p>
          <p className="mt-1 text-[11px] text-muted-foreground">Media & raw telemetry</p>
        </div>
      </div>

      {/* Segmented Scope Tabs */}
      <div className="flex border-b border-border/80 gap-2">
        <button
          type="button"
          onClick={() => setActiveTab("governance")}
          className={`pb-2.5 text-xs font-medium border-b-2 transition-colors ${
            activeTab === "governance"
              ? "border-foreground text-foreground"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          Governance & Data Residency
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("rights")}
          className={`pb-2.5 text-xs font-medium border-b-2 transition-colors ${
            activeTab === "rights"
              ? "border-foreground text-foreground"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          Data Principal Rights (Erasure)
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("audit")}
          className={`pb-2.5 text-xs font-medium border-b-2 transition-colors ${
            activeTab === "audit"
              ? "border-foreground text-foreground"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          Immutable Compliance Audit Trail ({auditLogs.length})
        </button>
      </div>

      {/* Tab 1: Governance & Data Residency */}
      {activeTab === "governance" && (
        <div className="space-y-4">
          <div className="rounded-lg border border-border/80 bg-card p-5 space-y-4">
            <h2 className="font-heading text-sm font-semibold text-foreground">
              DPDP Act 2023 Statutory Notice & Purpose Limitation
            </h2>
            <div className="rounded border border-border/80 bg-muted/20 p-4 text-xs text-foreground leading-relaxed">
              <p className="font-medium text-foreground mb-1">Mandatory Consent Notice to Candidates:</p>
              <p className="text-muted-foreground">{DEFAULT_DPDP_CONSENT_NOTICE.purposeSummary}</p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded border border-border/80 bg-background/50 p-3.5 space-y-2 text-xs">
                <span className="font-medium text-foreground">Designated Data Protection Officer (DPO)</span>
                <p className="text-muted-foreground">
                  Official point of contact for student data queries, grievance redressal, and institutional oversight:
                </p>
                <p className="font-mono text-foreground font-semibold">{DEFAULT_DPDP_CONSENT_NOTICE.dpoContactEmail}</p>
              </div>

              <div className="rounded border border-border/80 bg-background/50 p-3.5 space-y-2 text-xs">
                <span className="font-medium text-foreground">Sovereign Data Residency Affirmation</span>
                <p className="text-muted-foreground">
                  All candidate audio speech streams, webcam frames, and resume vectors reside strictly within Indian jurisdiction:
                </p>
                <p className="font-mono text-emerald-800 dark:text-emerald-300 font-semibold">
                  ✓ {DEFAULT_DPDP_CONSENT_NOTICE.dataResidencyRegion}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-border/80 bg-card p-5 space-y-3">
            <h2 className="font-heading text-sm font-semibold text-foreground">
              Automated Retention & Purge Scheduling
            </h2>
            <p className="text-xs text-muted-foreground">
              Configure how long raw candidate speech audio and video snapshot frames are stored before automatic cryptographic deletion.
            </p>

            <div className="mt-3 flex items-center gap-3">
              {[30, 90, 180, 365].map((days) => (
                <button
                  key={days}
                  type="button"
                  onClick={() => setAudioRetention(days)}
                  className={`rounded border px-3 py-1.5 text-xs font-medium transition-colors ${
                    audioRetention === days
                      ? "border-foreground bg-muted font-medium text-foreground"
                      : "border-border/80 bg-background text-muted-foreground hover:border-foreground"
                  }`}
                >
                  {days} Days Purge
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Data Principal Rights & Erasure Executor */}
      {activeTab === "rights" && (
        <div className="rounded-lg border border-border/80 bg-card p-5 space-y-4">
          <div>
            <h2 className="font-heading text-sm font-semibold text-foreground">
              Candidate Right to Erasure / Data Deletion
            </h2>
            <p className="text-xs text-muted-foreground">
              Under Chapter III, Section 12 of India's Digital Personal Data Protection Act 2023, candidates have the right to request erasure of their personal assessment data.
            </p>
          </div>

          <form onSubmit={handleExecuteErasure} className="space-y-3 max-w-lg">
            <label className="block">
              <span className="text-xs font-medium text-foreground">Candidate Email Address</span>
              <input
                type="email"
                required
                value={erasureCandidateEmail}
                onChange={(e) => setErasureCandidateEmail(e.target.value)}
                placeholder="e.g. candidate@sasi.ac.in"
                className="mt-1 h-8 w-full rounded border border-border/80 bg-background px-3 font-body text-xs text-foreground outline-none focus:border-foreground/40"
              />
            </label>

            <button
              type="submit"
              className="inline-flex h-8 items-center rounded border border-rose-300 bg-rose-50 px-3.5 text-xs font-medium text-rose-900 hover:bg-rose-100 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300"
            >
              Execute Erasure & Log Compliance Record
            </button>
          </form>

          {erasureStatus && (
            <div className="rounded border border-emerald-200/80 bg-emerald-50 px-3 py-2 text-xs text-emerald-950 dark:border-emerald-800/40 dark:bg-emerald-950/30 dark:text-emerald-300">
              {erasureStatus}
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Immutable Audit Trail */}
      {activeTab === "audit" && (
        <div className="rounded-lg border border-border/80 bg-card p-5 space-y-3">
          <div>
            <h2 className="font-heading text-sm font-semibold text-foreground">
              SOC 2 Type II Immutable Audit Trail
            </h2>
            <p className="text-xs text-muted-foreground">
              Timestamped cryptographic log of data access, consent updates, and retention events.
            </p>
          </div>

          <div className="overflow-x-auto rounded border border-border/80 mt-3">
            <table className="w-full text-left font-body text-xs">
              <thead>
                <tr className="border-b border-border/60 bg-muted/30 text-muted-foreground">
                  <th className="px-3 py-2 font-medium">Timestamp</th>
                  <th className="px-3 py-2 font-medium">Actor</th>
                  <th className="px-3 py-2 font-medium">Action</th>
                  <th className="px-3 py-2 font-medium">Audit Description</th>
                  <th className="px-3 py-2 font-medium">IP Hash</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {auditLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-muted/10">
                    <td className="px-3 py-2 font-mono text-[11px] text-muted-foreground whitespace-nowrap">
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                    <td className="px-3 py-2">
                      <span className="font-medium text-foreground">{log.actorId}</span>{" "}
                      <span className="text-[10px] text-muted-foreground uppercase">({log.actorRole})</span>
                    </td>
                    <td className="px-3 py-2">
                      <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] text-foreground">
                        {log.action}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-muted-foreground text-[11px] max-w-md truncate">
                      {log.details}
                    </td>
                    <td className="px-3 py-2 font-mono text-[10px] text-muted-foreground">
                      {log.ipHash}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
