"use client";

import React, { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { downloadCsv } from "@/lib/csv";
import type { CandidateStatus, DriveCandidate, PlacementDrive } from "@/lib/drives/types";
import { updateCandidateStatusAction } from "../actions";

interface DriveDetailClientProps {
  drive: PlacementDrive;
  candidates: DriveCandidate[];
  isManager: boolean;
}

const STATUS_LABELS: Record<CandidateStatus, string> = {
  eligible: "Eligible",
  applied: "Applied",
  round_1_cleared: "Round 1 Cleared",
  round_2_cleared: "Round 2 Cleared",
  shortlisted: "Shortlisted",
  selected: "Selected / Offered",
  not_qualified: "Not Qualified",
};

const STATUS_STYLES: Record<CandidateStatus, string> = {
  eligible: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  applied: "bg-muted text-muted-foreground border-border",
  round_1_cleared: "bg-sky-500/10 text-sky-500 border-sky-500/20",
  round_2_cleared: "bg-indigo-500/10 text-indigo-500 border-indigo-500/20",
  shortlisted: "bg-primary/10 text-primary border-primary/20 font-semibold",
  selected: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20 font-bold",
  not_qualified: "bg-destructive/10 text-destructive border-destructive/20",
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
  const [isPending, startTransition] = useTransition();

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
    const avgScore = candidates.length > 0
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

    const filename = `${drive.companyName.toLowerCase().replace(/\s+/g, "-")}-drive-candidates.csv`;
    downloadCsv(filename, [header, ...rows]);
  };

  return (
    <div className="space-y-8">
      {/* Back button */}
      <div>
        <Link href="/app/drives" className="font-body text-sm text-muted-foreground hover:text-foreground">
          ← Back to All Drives
        </Link>
      </div>

      {/* Main Drive Header Card */}
      <div className="rounded-3xl border border-border bg-card p-6 shadow-soft sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div className="flex items-center gap-4">
            <div
              className="flex h-16 w-16 items-center justify-center rounded-2xl font-headline text-xl font-bold text-white shadow-md"
              style={{ backgroundColor: drive.companyColor }}
            >
              {drive.companyLogoText}
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="font-headline text-2xl font-bold text-foreground sm:text-3xl">
                  {drive.companyName}
                </h1>
                <span className="rounded-full bg-emerald-500/10 px-3 py-1 font-body text-xs font-semibold text-emerald-500 uppercase">
                  {drive.status}
                </span>
              </div>
              <p className="mt-1 font-headline text-lg font-semibold text-primary">{drive.targetRole}</p>
              <div className="mt-1 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                <span>📍 {drive.location}</span>
                <span>💰 Package: <strong className="text-foreground">{drive.packageCtc}</strong></span>
                <span>📅 Deadline: {new Date(drive.applicationDeadline).toLocaleDateString()}</span>
              </div>
            </div>
          </div>

          {isManager && (
            <button
              type="button"
              onClick={handleExportCsv}
              className="btn-secondary flex items-center gap-2 text-xs font-semibold"
            >
              <span>📥</span> Export Recruiter CSV
            </button>
          )}
        </div>

        {/* Drive Description */}
        <p className="mt-6 font-body text-sm leading-relaxed text-muted-foreground">
          {drive.jobDescription}
        </p>

        {/* Assessment Rounds Timeline */}
        <div className="mt-6 border-t border-border pt-6">
          <h2 className="font-headline text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Drive Assessment Pipeline ({drive.rounds.length} Rounds)
          </h2>
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
            {drive.rounds.map((round) => (
              <div
                key={round.roundNumber}
                className="rounded-2xl border border-border bg-background p-4 shadow-sm"
              >
                <div className="flex items-center justify-between">
                  <span className="font-headline text-xs font-bold text-primary">Round {round.roundNumber}</span>
                  <span className="font-metric text-xs text-muted-foreground">{round.durationMinutes} mins</span>
                </div>
                <h3 className="mt-1 font-headline text-sm font-semibold text-foreground">{round.name}</h3>
                <p className="mt-1 font-body text-xs text-muted-foreground line-clamp-2">{round.description}</p>
                <div className="mt-3 flex items-center justify-between text-[11px] text-muted-foreground border-t border-border/60 pt-2">
                  <span>Type: <strong className="capitalize text-foreground">{round.type}</strong></span>
                  <span>Cutoff: <strong className="text-foreground">&ge; {round.cutoffScore}%</strong></span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Candidate Pipeline & Leaderboard Section */}
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="font-headline text-xl font-bold text-foreground">Candidate Recruitment Pipeline</h2>
            <p className="font-body text-xs text-muted-foreground">
              Review candidates assessed by the AI interview & coding sandbox.
            </p>
          </div>
        </div>

        {/* Metrics Row */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          <div className="rounded-2xl border border-border bg-card p-4 shadow-soft">
            <span className="text-[11px] font-medium text-muted-foreground uppercase">Assessed</span>
            <p className="mt-1 font-headline text-2xl font-bold text-foreground">{stats.total}</p>
          </div>
          <div className="rounded-2xl border border-border bg-card p-4 shadow-soft">
            <span className="text-[11px] font-medium text-muted-foreground uppercase">Round 1 Cleared</span>
            <p className="mt-1 font-headline text-2xl font-bold text-sky-500">{stats.round1Cleared}</p>
          </div>
          <div className="rounded-2xl border border-border bg-card p-4 shadow-soft">
            <span className="text-[11px] font-medium text-muted-foreground uppercase">Shortlisted</span>
            <p className="mt-1 font-headline text-2xl font-bold text-primary">{stats.shortlisted}</p>
          </div>
          <div className="rounded-2xl border border-border bg-card p-4 shadow-soft">
            <span className="text-[11px] font-medium text-muted-foreground uppercase">Selected</span>
            <p className="mt-1 font-headline text-2xl font-bold text-emerald-500">{stats.selected}</p>
          </div>
          <div className="rounded-2xl border border-border bg-card p-4 shadow-soft">
            <span className="text-[11px] font-medium text-muted-foreground uppercase">Avg Batch Score</span>
            <p className="mt-1 font-headline text-2xl font-bold text-foreground">{stats.avgScore}%</p>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-card p-3 shadow-soft">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search candidate name, email, or notes..."
            className="flex-1 min-w-[200px] rounded-xl border border-border bg-background px-3 py-1.5 font-body text-xs text-foreground outline-none focus:border-primary"
          />

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-xl border border-border bg-background px-3 py-1.5 font-body text-xs text-foreground outline-none"
            >
              <option value="all">All Statuses</option>
              <option value="shortlisted">Shortlisted</option>
              <option value="selected">Selected</option>
              <option value="round_1_cleared">Round 1 Cleared</option>
              <option value="applied">Applied / In Review</option>
              <option value="not_qualified">Not Qualified</option>
            </select>

            {departments.length > 0 && (
              <select
                value={departmentFilter}
                onChange={(e) => setDepartmentFilter(e.target.value)}
                className="rounded-xl border border-border bg-background px-3 py-1.5 font-body text-xs text-foreground outline-none"
              >
                <option value="all">All Departments</option>
                {departments.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>

        {/* Candidate Leaderboard Table */}
        <div className="overflow-x-auto rounded-3xl border border-border bg-card shadow-soft">
          <table className="w-full border-collapse text-left font-body text-xs">
            <thead>
              <tr className="border-b border-border bg-muted/40 font-headline text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                <th className="p-4">Rank & Candidate</th>
                <th className="p-4">Department & Batch</th>
                <th className="p-4 text-center">Overall</th>
                <th className="p-4 text-center">Coding</th>
                <th className="p-4 text-center">Comm.</th>
                <th className="p-4 text-center">Integrity</th>
                <th className="p-4">Pipeline Status</th>
                {isManager && <th className="p-4 text-right">Shortlist Action</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-muted-foreground">
                    No candidates found for this drive filter.
                  </td>
                </tr>
              ) : (
                filtered.map((c, index) => (
                  <tr key={c.id} className="transition hover:bg-muted/20">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <span className="font-headline font-bold text-muted-foreground w-4 text-center">
                          #{index + 1}
                        </span>
                        <div>
                          <p className="font-headline font-semibold text-foreground">{c.studentName}</p>
                          <span className="text-[11px] text-muted-foreground">{c.studentEmail}</span>
                        </div>
                      </div>
                    </td>

                    <td className="p-4">
                      <p className="font-medium text-foreground">{c.department}</p>
                      <span className="text-[11px] text-muted-foreground">{c.batchName}</span>
                    </td>

                    <td className="p-4 text-center">
                      <span className="font-metric font-bold text-sm text-foreground">
                        {c.overallScore !== null ? `${c.overallScore}%` : "—"}
                      </span>
                    </td>

                    <td className="p-4 text-center">
                      <span className="font-metric font-semibold text-primary">
                        {c.codingScore !== null ? `${c.codingScore}%` : "—"}
                      </span>
                    </td>

                    <td className="p-4 text-center">
                      <span className="font-metric text-foreground">
                        {c.communicationScore !== null ? `${c.communicationScore}%` : "—"}
                      </span>
                    </td>

                    <td className="p-4 text-center">
                      <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 font-metric text-[11px] font-semibold text-emerald-500">
                        {c.integrityIndex}%
                      </span>
                    </td>

                    <td className="p-4">
                      <span
                        className={cn(
                          "inline-block rounded-full border px-2.5 py-0.5 text-[11px]",
                          STATUS_STYLES[c.status],
                        )}
                      >
                        {STATUS_LABELS[c.status]}
                      </span>
                      {c.notes && (
                        <p className="mt-1 text-[10px] text-muted-foreground max-w-[180px] truncate" title={c.notes}>
                          💬 {c.notes}
                        </p>
                      )}
                    </td>

                    {isManager && (
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            disabled={updatingId === c.id || isPending}
                            onClick={() => handleStatusChange(c.id, "shortlisted")}
                            className={cn(
                              "rounded-lg px-2 py-1 text-[10px] font-semibold transition border",
                              c.status === "shortlisted"
                                ? "bg-primary text-primary-foreground border-primary"
                                : "bg-background text-foreground hover:border-primary",
                            )}
                            title="Shortlist for next round"
                          >
                            ★ Shortlist
                          </button>

                          <button
                            type="button"
                            disabled={updatingId === c.id || isPending}
                            onClick={() => handleStatusChange(c.id, "selected")}
                            className={cn(
                              "rounded-lg px-2 py-1 text-[10px] font-semibold transition border",
                              c.status === "selected"
                                ? "bg-emerald-600 text-white border-emerald-600"
                                : "bg-background text-foreground hover:border-emerald-500",
                            )}
                            title="Mark as Selected / Offer Given"
                          >
                            ✓ Select
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
    </div>
  );
}

export default DriveDetailClient;
