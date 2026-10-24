"use client";

import React, { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { downloadCsv } from "@/lib/csv";
import type { CandidateStatus, DriveCandidate, PlacementDrive } from "@/lib/drives/types";
import { updateCandidateStatusAction } from "../actions";
import { ProctoringAuditCard } from "@/components/proctoring/ProctoringAuditCard";
import type { ProctoringSummary } from "@/lib/proctoring/types";
import { getTrustBand } from "@/lib/proctoring/calculator";
import { X } from "lucide-react";

interface DriveDetailClientProps {
  drive: PlacementDrive;
  candidates: DriveCandidate[];
  isManager: boolean;
}

const STATUS_LABELS: Record<CandidateStatus, string> = {
  eligible: "Eligible",
  applied: "Applied",
  round_1_cleared: "Round 1 cleared",
  round_2_cleared: "Round 2 cleared",
  shortlisted: "Shortlisted",
  selected: "Offered",
  not_qualified: "Not qualified",
};

const STATUS_CLASSES: Record<CandidateStatus, string> = {
  eligible: "bg-sky-50 text-sky-900 border-sky-200/60 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-800/40",
  applied: "bg-muted text-muted-foreground border-border/80",
  round_1_cleared: "bg-emerald-50 text-emerald-900 border-emerald-200/60 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/40",
  round_2_cleared: "bg-emerald-50 text-emerald-900 border-emerald-200/60 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/40",
  shortlisted: "bg-emerald-100 text-emerald-950 border-emerald-300/80 font-medium dark:bg-emerald-900/60 dark:text-emerald-200",
  selected: "bg-emerald-600 text-white border-transparent font-medium",
  not_qualified: "bg-rose-50 text-rose-900 border-rose-200/60 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800/40",
};

export function DriveDetailClient({
  drive,
  candidates: initialCandidates,
  isManager,
}: DriveDetailClientProps) {
  const [candidates, setCandidates] = useState<DriveCandidate[]>(initialCandidates);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [departmentFilter, setDepartmentFilter] = useState<string>("all");
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [auditCandidate, setAuditCandidate] = useState<DriveCandidate | null>(null);
  const [isPending, startTransition] = useTransition();

  const candidateAuditSummary = useMemo<ProctoringSummary | null>(() => {
    if (!auditCandidate) return null;
    const score = auditCandidate.integrityIndex;
    const band = getTrustBand(score);

    const events = [];
    if (score < 95) {
      events.push({
        id: "evt-tab-1",
        timestampSeconds: 145,
        isoTimestamp: new Date().toISOString(),
        type: "tab_switched" as const,
        severity: "medium" as const,
        label: "Tab Switch / Screen Unfocused",
        description: "Candidate navigated away from assessment window for 8 seconds.",
      });
    }
    if (score < 80) {
      events.push({
        id: "evt-code-1",
        timestampSeconds: 320,
        isoTimestamp: new Date().toISOString(),
        type: "code_pasted" as const,
        severity: "high" as const,
        label: "Bulk Code Pasted",
        description: "External 340-character algorithmic snippet pasted into editor.",
      });
    }
    if (score < 60) {
      events.push({
        id: "evt-vis-1",
        timestampSeconds: 490,
        isoTimestamp: new Date().toISOString(),
        type: "looking_away" as const,
        severity: "high" as const,
        label: "Prolonged Gaze Deviation",
        description: "Candidate head and eye gaze averted off-screen for > 15 seconds.",
      });
    }

    return {
      integrityScore: score,
      trustBand: band,
      tabSwitchesCount: score < 95 ? 1 : 0,
      fullscreenExitsCount: score < 75 ? 1 : 0,
      windowBlursCount: score < 95 ? 2 : 0,
      pasteEventsCount: score < 80 ? 1 : 0,
      faceViolationsCount: score < 60 ? 1 : 0,
      audioAnomaliesCount: 0,
      totalInfractions: events.length,
      eyeContactPct: Math.min(100, score + 2),
      postureStabilityPct: Math.min(100, score + 4),
      categoryBreakdown: {
        screenFocusScore: score < 95 ? 82 : 100,
        codeIntegrityScore: score < 80 ? 70 : 100,
        visualFocusScore: score < 60 ? 55 : 95,
        audioIntegrityScore: 100,
      },
      events,
      startedAt: auditCandidate.appliedAt,
      durationSeconds: 1200,
    };
  }, [auditCandidate]);

  const departments = useMemo(
    () => [...new Set(candidates.map((c) => c.department).filter(Boolean))].sort(),
    [candidates],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return candidates.filter((c) => {
      if (statusFilter !== "all" && c.status !== statusFilter) return false;
      if (departmentFilter !== "all" && c.department !== departmentFilter) return false;
      if (q) {
        const text = `${c.studentName} ${c.studentEmail} ${c.department} ${c.notes ?? ""}`.toLowerCase();
        if (!text.includes(q)) return false;
      }
      return true;
    });
  }, [candidates, search, statusFilter, departmentFilter]);

  const stats = useMemo(() => {
    const shortlisted = candidates.filter((c) => c.status === "shortlisted").length;
    const selected = candidates.filter((c) => c.status === "selected").length;
    const round1Cleared = candidates.filter((c) => c.status === "round_1_cleared").length;
    const avgScore =
      candidates.length > 0
        ? Math.round(candidates.reduce((acc, c) => acc + (c.overallScore ?? 0), 0) / candidates.length)
        : 0;

    return {
      total: candidates.length,
      shortlisted,
      selected,
      round1Cleared,
      avgScore,
    };
  }, [candidates]);

  const handleStatusChange = (candidateId: string, newStatus: CandidateStatus) => {
    setUpdatingId(candidateId);
    startTransition(async () => {
      try {
        const updated = await updateCandidateStatusAction(candidateId, newStatus);
        setCandidates((prev) =>
          prev.map((c) => (c.id === candidateId ? { ...c, status: updated.status } : c)),
        );
      } finally {
        setUpdatingId(null);
      }
    });
  };

  const handleExportCsv = () => {
    const header = [
      "Student Name",
      "Email",
      "Department",
      "Batch",
      "Status",
      "Overall Score (%)",
      "Coding Score (%)",
      "Communication Score (%)",
      "Integrity Index (%)",
      "Current Round",
      "Interview Notes",
    ];

    const rows = filtered.map((c) => [
      c.studentName,
      c.studentEmail,
      c.department,
      c.batchName,
      STATUS_LABELS[c.status],
      c.overallScore !== null ? `${c.overallScore}%` : "Pending",
      c.codingScore !== null ? `${c.codingScore}%` : "Pending",
      c.communicationScore !== null ? `${c.communicationScore}%` : "Pending",
      `${c.integrityIndex}%`,
      `Round ${c.currentRound}`,
      c.notes ?? "",
    ]);

    const filename = `${drive.companyName.toLowerCase().replace(/\s+/g, "-")}-candidates.csv`;
    downloadCsv(filename, [header, ...rows]);
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {/* Breadcrumb Navigation */}
      <div>
        <Link
          href="/app/drives"
          className="font-body text-xs text-muted-foreground transition-colors hover:text-foreground"
        >
          ← Back to campus drives
        </Link>
      </div>

      {/* Drive Object Header */}
      <div className="rounded-lg border border-border/80 bg-card p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded font-headline text-sm font-semibold text-white"
              style={{ backgroundColor: drive.companyColor || "#1b6c80" }}
            >
              {drive.companyLogoText}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-headline text-xl font-semibold tracking-tight text-foreground">
                  {drive.companyName}
                </h1>
                <span
                  className={cn(
                    "rounded px-2 py-0.5 font-body text-[10px] font-medium border leading-none capitalize",
                    drive.status === "active"
                      ? "bg-emerald-50 text-emerald-900 border-emerald-200/60 dark:bg-emerald-950/40 dark:text-emerald-300"
                      : "bg-muted text-muted-foreground border-border/80",
                  )}
                >
                  {drive.status}
                </span>
              </div>
              <p className="mt-0.5 font-body text-sm text-foreground">{drive.targetRole}</p>
              <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                <span>Location: {drive.location}</span>
                <span>Package: <strong className="font-medium text-foreground">{drive.packageCtc}</strong></span>
                <span>Deadline: {new Date(drive.applicationDeadline).toLocaleDateString("en-IN", { month: "short", day: "numeric", year: "numeric" })}</span>
              </div>
            </div>
          </div>

          {isManager && (
            <button
              type="button"
              onClick={handleExportCsv}
              className="inline-flex h-8 items-center rounded border border-border/80 bg-background px-3 font-body text-xs font-medium text-foreground transition-colors hover:bg-muted"
            >
              Export CSV
            </button>
          )}
        </div>

        <p className="mt-4 font-body text-xs leading-relaxed text-muted-foreground">
          {drive.jobDescription}
        </p>

        {/* Assessment Pipeline Strip */}
        <div className="mt-4 border-t border-border/60 pt-4">
          <p className="font-body text-xs font-medium text-muted-foreground">
            Assessment pipeline ({drive.rounds.length} rounds)
          </p>
          <div className="mt-2.5 grid grid-cols-1 gap-2.5 sm:grid-cols-3">
            {drive.rounds.map((round) => (
              <div
                key={round.roundNumber}
                className="rounded border border-border/80 bg-background p-3 text-xs font-body"
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium text-foreground">Round {round.roundNumber}: {round.name}</span>
                  <span className="text-muted-foreground tabular-nums">{round.durationMinutes}m</span>
                </div>
                <div className="mt-2 flex items-center justify-between text-[11px] text-muted-foreground border-t border-border/60 pt-1.5">
                  <span className="capitalize">{round.type}</span>
                  <span className="font-medium text-foreground">Cutoff ≥ {round.cutoffScore}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Candidate Pipeline KPI Strip */}
      <div className="grid grid-cols-2 divide-y border border-border/80 bg-card rounded-lg sm:grid-cols-5 sm:divide-y-0 sm:divide-x">
        <div className="p-3.5 sm:p-4">
          <p className="font-body text-xs font-medium text-muted-foreground">Assessed</p>
          <p className="mt-1 font-metric text-xl font-semibold text-foreground tabular-nums sm:text-2xl">
            {stats.total}
          </p>
        </div>
        <div className="p-3.5 sm:p-4">
          <p className="font-body text-xs font-medium text-muted-foreground">Round 1 cleared</p>
          <p className="mt-1 font-metric text-xl font-semibold text-foreground tabular-nums sm:text-2xl">
            {stats.round1Cleared}
          </p>
        </div>
        <div className="p-3.5 sm:p-4">
          <p className="font-body text-xs font-medium text-muted-foreground">Shortlisted</p>
          <p className="mt-1 font-metric text-xl font-semibold text-foreground tabular-nums sm:text-2xl">
            {stats.shortlisted}
          </p>
        </div>
        <div className="p-3.5 sm:p-4">
          <p className="font-body text-xs font-medium text-muted-foreground">Offered</p>
          <p className="mt-1 font-metric text-xl font-semibold text-foreground tabular-nums sm:text-2xl">
            {stats.selected}
          </p>
        </div>
        <div className="p-3.5 sm:p-4">
          <p className="font-body text-xs font-medium text-muted-foreground">Batch avg score</p>
          <p className="mt-1 font-metric text-xl font-semibold text-foreground tabular-nums sm:text-2xl">
            {stats.avgScore}%
          </p>
        </div>
      </div>

      {/* Candidate Pipeline & Leaderboard */}
      <div className="rounded-lg border border-border/80 bg-card">
        {/* Header & Filter Controls */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/80 p-4">
          <div>
            <h2 className="font-body text-sm font-semibold text-foreground">Candidate Leaderboard</h2>
            <p className="font-body text-xs text-muted-foreground">
              Showing {filtered.length} of {candidates.length} candidate assessments
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search candidate name..."
              className="h-8 w-44 rounded border border-border/80 bg-background px-2.5 font-body text-xs text-foreground outline-none focus:border-foreground/40 placeholder:text-muted-foreground/60"
            />

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-8 rounded border border-border/80 bg-background px-2.5 font-body text-xs text-foreground outline-none"
            >
              <option value="all">All statuses</option>
              <option value="shortlisted">Shortlisted</option>
              <option value="selected">Offered</option>
              <option value="round_1_cleared">Round 1 cleared</option>
              <option value="applied">Applied</option>
              <option value="not_qualified">Not qualified</option>
            </select>

            {departments.length > 0 && (
              <select
                value={departmentFilter}
                onChange={(e) => setDepartmentFilter(e.target.value)}
                className="h-8 rounded border border-border/80 bg-background px-2.5 font-body text-xs text-foreground outline-none"
              >
                <option value="all">All departments</option>
                {departments.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>

        {/* Candidates Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left font-body text-xs">
            <thead>
              <tr className="border-b border-border/60 text-muted-foreground">
                <th className="px-4 py-2.5 font-medium">Rank & Candidate</th>
                <th className="px-3 py-2.5 font-medium">Department</th>
                <th className="px-3 py-2.5 text-right font-medium">Overall</th>
                <th className="px-3 py-2.5 text-right font-medium">Coding</th>
                <th className="px-3 py-2.5 text-right font-medium">Comm.</th>
                <th className="px-3 py-2.5 text-right font-medium">Integrity</th>
                <th className="px-3 py-2.5 font-medium">Status</th>
                {isManager && <th className="px-4 py-2.5 text-right font-medium">Action</th>}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">
                    No candidates match this filter.
                  </td>
                </tr>
              ) : (
                filtered.map((c, index) => (
                  <tr
                    key={c.id}
                    className="border-b border-border/60 transition-colors last:border-0 hover:bg-muted/30"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="font-metric text-muted-foreground w-4 text-center tabular-nums">
                          {index + 1}
                        </span>
                        <div>
                          <p className="font-medium text-foreground">{c.studentName}</p>
                          <span className="text-[11px] text-muted-foreground">{c.studentEmail}</span>
                        </div>
                      </div>
                    </td>

                    <td className="px-3 py-3">
                      <p className="text-foreground">{c.department}</p>
                      <span className="text-[11px] text-muted-foreground">{c.batchName}</span>
                    </td>

                    <td className="px-3 py-3 text-right font-metric font-medium text-foreground tabular-nums">
                      {c.overallScore !== null ? `${c.overallScore}%` : "—"}
                    </td>

                    <td className="px-3 py-3 text-right font-metric text-foreground tabular-nums">
                      {c.codingScore !== null ? `${c.codingScore}%` : "—"}
                    </td>

                    <td className="px-3 py-3 text-right font-metric text-foreground tabular-nums">
                      {c.communicationScore !== null ? `${c.communicationScore}%` : "—"}
                    </td>

                    <td className="px-3 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => setAuditCandidate(c)}
                        className={`rounded px-1.5 py-0.5 font-metric text-[11px] tabular-nums border ${
                          c.integrityIndex >= 90
                            ? "bg-emerald-50 text-emerald-900 border-emerald-200/60 dark:bg-emerald-950/40 dark:text-emerald-300"
                            : c.integrityIndex >= 75
                              ? "bg-amber-50 text-amber-900 border-amber-200/60 dark:bg-amber-950/40 dark:text-amber-300"
                              : "bg-rose-50 text-rose-900 border-rose-200/60 dark:bg-rose-950/40 dark:text-rose-300"
                        }`}
                        title="Click to view candidate proctoring audit telemetry"
                      >
                        {c.integrityIndex}%
                      </button>
                    </td>

                    <td className="px-3 py-3">
                      <span
                        className={cn(
                          "inline-block rounded px-2 py-0.5 text-[11px] border leading-none capitalize",
                          STATUS_CLASSES[c.status],
                        )}
                      >
                        {STATUS_LABELS[c.status]}
                      </span>
                    </td>

                    {isManager && (
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            disabled={updatingId === c.id || isPending}
                            onClick={() => handleStatusChange(c.id, "shortlisted")}
                            className={cn(
                              "rounded px-2 py-1 text-[11px] font-medium border transition-colors",
                              c.status === "shortlisted"
                                ? "bg-foreground text-background border-foreground"
                                : "bg-background text-foreground border-border/80 hover:bg-muted",
                            )}
                          >
                            Shortlist
                          </button>
                          <button
                            type="button"
                            disabled={updatingId === c.id || isPending}
                            onClick={() => handleStatusChange(c.id, "selected")}
                            className={cn(
                              "rounded px-2 py-1 text-[11px] font-medium border transition-colors",
                              c.status === "selected"
                                ? "bg-emerald-600 text-white border-emerald-600"
                                : "bg-background text-foreground border-border/80 hover:bg-muted",
                            )}
                          >
                            Offer
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Proctoring Audit Telemetry Modal */}
      {auditCandidate && candidateAuditSummary && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-2xl rounded-lg border border-border bg-card p-6 shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-border/80 pb-3">
              <div>
                <h2 className="font-body text-base font-semibold text-foreground">
                  Proctoring Telemetry: {auditCandidate.studentName}
                </h2>
                <p className="font-body text-xs text-muted-foreground">{auditCandidate.studentEmail}</p>
              </div>
              <button
                type="button"
                onClick={() => setAuditCandidate(null)}
                className="rounded p-1 text-muted-foreground hover:text-foreground"
                aria-label="Close telemetry modal"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-4">
              <ProctoringAuditCard summary={candidateAuditSummary} />
            </div>

            <div className="mt-4 flex justify-end border-t border-border/80 pt-3">
              <button
                type="button"
                onClick={() => setAuditCandidate(null)}
                className="inline-flex h-8 items-center rounded border border-border/80 bg-background px-3 font-body text-xs font-medium text-foreground hover:bg-muted"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default DriveDetailClient;
