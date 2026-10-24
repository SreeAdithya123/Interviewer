"use client";

import React, { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import type { PlacementDrive, EligibilityResult } from "@/lib/drives/types";
import { createDriveAction, startDriveInterviewAction } from "./actions";
import { COMPANY_BLUEPRINTS } from "@/lib/blueprints/catalog";

interface DrivesClientProps {
  drives: PlacementDrive[];
  isManager: boolean; // college_admin or platform_admin
  studentProfile?: {
    department?: string | null;
    batchName?: string | null;
    graduationYear?: number | null;
  } | null;
  studentReadinessScore?: number | null;
  eligibilityMap: Record<string, EligibilityResult>;
}

export function DrivesClient({
  drives,
  isManager,
  eligibilityMap,
}: DrivesClientProps) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "upcoming">("all");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalCompanyName, setModalCompanyName] = useState("");
  const [modalTargetRole, setModalTargetRole] = useState("");
  const [modalPackageCtc, setModalPackageCtc] = useState("");
  const [modalCutoff, setModalCutoff] = useState(70);
  const [modalJobDesc, setModalJobDesc] = useState("");

  const handleApplyBlueprint = (bpId: string) => {
    const bp = COMPANY_BLUEPRINTS.find((b) => b.id === bpId);
    if (!bp) return;
    setModalCompanyName(bp.companyName);
    setModalTargetRole(bp.hiringTiers[0]?.name || "Software Engineer");
    setModalPackageCtc(bp.typicalPackageCtc);
    setModalCutoff(bp.hiringTiers[0]?.minScore || 70);
    setModalJobDesc(`${bp.overview}\n\nKey Competencies Assessed:\n${bp.keyCompetencies.map((c) => `• ${c}`).join("\n")}`);
  };
  const [isStartingId, setIsStartingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [actionError, setActionError] = useState<string | null>(null);

  const filteredDrives = useMemo(() => {
    const q = search.trim().toLowerCase();
    return drives.filter((drive) => {
      if (statusFilter !== "all" && drive.status !== statusFilter) return false;
      if (q) {
        const text = `${drive.companyName} ${drive.targetRole} ${drive.location} ${drive.packageCtc}`.toLowerCase();
        if (!text.includes(q)) return false;
      }
      return true;
    });
  }, [drives, search, statusFilter]);

  const stats = useMemo(() => {
    const active = drives.filter((d) => d.status === "active").length;
    const totalApplicants = drives.reduce((acc, d) => acc + d.totalApplicants, 0);
    const totalShortlisted = drives.reduce((acc, d) => acc + d.shortlistedCount, 0);
    return { total: drives.length, active, totalApplicants, totalShortlisted };
  }, [drives]);

  const handleStartDrive = async (driveId: string) => {
    setActionError(null);
    setIsStartingId(driveId);
    try {
      const interviewId = await startDriveInterviewAction(driveId);
      router.push(`/app/interview/${interviewId}`);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Could not launch drive assessment.");
      setIsStartingId(null);
    }
  };

  const handleCreateSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setActionError(null);
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      try {
        await createDriveAction(formData);
        setIsModalOpen(false);
      } catch (err) {
        setActionError(err instanceof Error ? err.message : "Failed to create placement drive.");
      }
    });
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {/* Title & Screen's Finding & Action */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-headline text-2xl font-semibold tracking-tight text-foreground">
            Campus Placement Drives
          </h1>
          <p className="mt-1 font-body text-sm text-muted-foreground">
            {isManager
              ? `Hiring pipeline · ${stats.active} active drives with ${stats.totalApplicants} candidate registrations.`
              : "Company-specific interview assessments, eligibility checks, and shortlist criteria."}
          </p>
        </div>

        {isManager && (
          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="inline-flex h-9 items-center justify-center rounded-md bg-foreground px-4 font-body text-xs font-medium text-background transition-colors hover:bg-foreground/90"
          >
            + Create placement drive
          </button>
        )}
      </div>

      {actionError && (
        <div className="rounded-md border border-rose-200/70 bg-rose-50 px-4 py-3 font-body text-xs text-rose-900 dark:border-rose-800/40 dark:bg-rose-950/30 dark:text-rose-300">
          {actionError}
        </div>
      )}

      {/* Overview KPI Strip (for TPO / Admins) */}
      {isManager && (
        <div className="grid grid-cols-2 divide-y border border-border/80 bg-card rounded-lg sm:grid-cols-4 sm:divide-y-0 sm:divide-x">
          <div className="p-4 sm:p-5">
            <p className="font-body text-xs font-medium text-muted-foreground">Total drives</p>
            <p className="mt-2 font-metric text-2xl font-semibold tracking-tight text-foreground tabular-nums sm:text-3xl">
              {stats.total}
            </p>
            <p className="mt-1 font-body text-[11px] text-muted-foreground">configured pipelines</p>
          </div>
          <div className="p-4 sm:p-5">
            <p className="font-body text-xs font-medium text-muted-foreground">Active now</p>
            <p className="mt-2 font-metric text-2xl font-semibold tracking-tight text-foreground tabular-nums sm:text-3xl">
              {stats.active}
            </p>
            <p className="mt-1 font-body text-[11px] text-muted-foreground">accepting submissions</p>
          </div>
          <div className="p-4 sm:p-5">
            <p className="font-body text-xs font-medium text-muted-foreground">Registered candidates</p>
            <p className="mt-2 font-metric text-2xl font-semibold tracking-tight text-foreground tabular-nums sm:text-3xl">
              {stats.totalApplicants}
            </p>
            <p className="mt-1 font-body text-[11px] text-muted-foreground">applications across batch</p>
          </div>
          <div className="p-4 sm:p-5">
            <p className="font-body text-xs font-medium text-muted-foreground">Shortlisted for offers</p>
            <p className="mt-2 font-metric text-2xl font-semibold tracking-tight text-foreground tabular-nums sm:text-3xl">
              {stats.totalShortlisted}
            </p>
            <p className="mt-1 font-body text-[11px] text-muted-foreground">cleared all rounds</p>
          </div>
        </div>
      )}

      {/* Toolbar: Search & Segmented Status Filter */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/80 pb-4">
        <div className="w-full sm:max-w-xs">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search company, role, location..."
            className="h-8 w-full rounded border border-border/80 bg-background px-3 font-body text-xs text-foreground outline-none transition-colors focus:border-foreground/40 placeholder:text-muted-foreground/60"
          />
        </div>

        <div className="inline-flex h-8 items-center rounded border border-border/80 bg-muted/40 p-0.5 text-xs font-body">
          <button
            type="button"
            onClick={() => setStatusFilter("all")}
            className={cn(
              "rounded px-3 py-1 font-medium transition-colors",
              statusFilter === "all"
                ? "bg-background text-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            All ({drives.length})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter("active")}
            className={cn(
              "rounded px-3 py-1 font-medium transition-colors",
              statusFilter === "active"
                ? "bg-background text-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            Active ({stats.active})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter("upcoming")}
            className={cn(
              "rounded px-3 py-1 font-medium transition-colors",
              statusFilter === "upcoming"
                ? "bg-background text-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            Upcoming
          </button>
        </div>
      </div>

      {/* Drives Grid */}
      {filteredDrives.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border/80 bg-card p-12 text-center">
          <p className="font-body text-xs text-muted-foreground">No placement drives found matching your criteria.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredDrives.map((drive) => {
            const elig = eligibilityMap[drive.id];
            const isEligible = elig ? elig.isEligible : true;

            return (
              <div
                key={drive.id}
                className="flex flex-col justify-between rounded-lg border border-border/80 bg-card p-5 transition-colors hover:border-border"
              >
                <div>
                  {/* Card Header: Company Monogram & Status Badge */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <div
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded font-headline text-xs font-semibold text-white"
                        style={{ backgroundColor: drive.companyColor || "#1b6c80" }}
                      >
                        {drive.companyLogoText}
                      </div>
                      <div>
                        <h2 className="font-body text-sm font-semibold text-foreground">{drive.companyName}</h2>
                        <span className="font-body text-[11px] text-muted-foreground">{drive.location}</span>
                      </div>
                    </div>

                    <span
                      className={cn(
                        "rounded px-2 py-0.5 font-body text-[10px] font-medium border leading-none capitalize",
                        drive.status === "active"
                          ? "bg-emerald-50 text-emerald-900 border-emerald-200/60 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/40"
                          : drive.status === "upcoming"
                            ? "bg-sky-50 text-sky-900 border-sky-200/60 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-800/40"
                            : "bg-muted text-muted-foreground border-border/60",
                      )}
                    >
                      {drive.status}
                    </span>
                  </div>

                  {/* Role & Package */}
                  <div className="mt-3.5">
                    <h3 className="font-body text-sm font-medium text-foreground">{drive.targetRole}</h3>
                    <div className="mt-0.5 flex items-center gap-1.5 font-body text-xs">
                      <span className="font-metric font-medium text-foreground">{drive.packageCtc}</span>
                      <span className="text-muted-foreground">· Full-time placement</span>
                    </div>
                  </div>

                  {/* Brief JD */}
                  <p className="mt-2.5 line-clamp-2 font-body text-xs text-muted-foreground leading-relaxed">
                    {drive.jobDescription}
                  </p>

                  {/* Eligibility Metrics */}
                  <div className="mt-3.5 space-y-1 border-t border-border/60 pt-2.5 font-body text-[11px]">
                    <div className="flex items-center justify-between text-muted-foreground">
                      <span>Cutoff score:</span>
                      <span className="font-medium text-foreground tabular-nums">≥ {drive.eligibility.minReadinessScore}%</span>
                    </div>
                    <div className="flex items-center justify-between text-muted-foreground">
                      <span>Target batches:</span>
                      <span className="text-foreground">{drive.eligibility.targetBatches[0]}</span>
                    </div>
                    <div className="flex items-center justify-between text-muted-foreground">
                      <span>Assessment:</span>
                      <span className="text-foreground">{drive.rounds.length} rounds configured</span>
                    </div>
                  </div>

                  {/* Student Eligibility Pill */}
                  {!isManager && elig && (
                    <div className="mt-3 rounded border border-border/80 bg-muted/30 p-2 font-body text-xs">
                      {isEligible ? (
                        <div className="flex items-center gap-1.5 text-emerald-800 dark:text-emerald-300 font-medium">
                          <span>✓</span> Eligible (Your score: {elig.currentScore}%)
                        </div>
                      ) : (
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-1.5 text-amber-800 dark:text-amber-300 font-medium">
                            <span>⚠</span> Requirements pending
                          </div>
                          <p className="text-[11px] text-muted-foreground">{elig.reasons[0]}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Card Footer Actions */}
                <div className="mt-4 border-t border-border/60 pt-3">
                  {isManager ? (
                    <Link
                      href={`/app/drives/${drive.id}`}
                      className="inline-flex h-8 w-full items-center justify-center rounded border border-border/80 bg-background font-body text-xs font-medium text-foreground transition-colors hover:bg-muted"
                    >
                      Candidate leaderboard ({drive.totalApplicants}) →
                    </Link>
                  ) : isEligible ? (
                    <button
                      type="button"
                      disabled={isStartingId === drive.id}
                      onClick={() => handleStartDrive(drive.id)}
                      className="inline-flex h-8 w-full items-center justify-center rounded bg-foreground font-body text-xs font-medium text-background transition-colors hover:bg-foreground/90 disabled:opacity-60"
                    >
                      {isStartingId === drive.id ? "Launching assessment..." : "Start drive assessment"}
                    </button>
                  ) : (
                    <Link
                      href="/app/interview"
                      className="inline-flex h-8 w-full items-center justify-center rounded border border-border/80 bg-background font-body text-xs font-medium text-muted-foreground hover:text-foreground"
                    >
                      Practice to qualify →
                    </Link>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create Placement Drive Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs" role="dialog" aria-modal="true">
          <div className="w-full max-w-lg rounded-lg border border-border bg-card p-6 shadow-xl">
            <div className="flex items-center justify-between border-b border-border/80 pb-3">
              <h2 className="font-body text-base font-semibold text-foreground">Create Placement Drive</h2>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="rounded p-1 text-muted-foreground hover:text-foreground"
                aria-label="Close modal"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="mt-4 space-y-3.5">
              {/* Quick Template from Blueprint */}
              <div className="rounded border border-border/80 bg-muted/20 p-2.5 space-y-1.5">
                <span className="font-body text-[11px] font-medium text-muted-foreground">
                  Load Template from Standard Blueprint:
                </span>
                <div className="flex flex-wrap gap-1">
                  {COMPANY_BLUEPRINTS.map((bp) => (
                    <button
                      key={bp.id}
                      type="button"
                      onClick={() => handleApplyBlueprint(bp.id)}
                      className="rounded border border-border/60 bg-background px-2 py-0.5 font-body text-[11px] text-muted-foreground hover:border-foreground hover:text-foreground"
                    >
                      {bp.shortCode}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block">
                  <span className="font-body text-xs font-medium text-foreground">Company name *</span>
                  <input
                    type="text"
                    name="companyName"
                    required
                    value={modalCompanyName}
                    onChange={(e) => setModalCompanyName(e.target.value)}
                    placeholder="e.g. Google, Microsoft, TCS"
                    className="mt-1 h-8 w-full rounded border border-border/80 bg-background px-3 font-body text-xs text-foreground outline-none focus:border-foreground/40"
                  />
                </label>

                <label className="block">
                  <span className="font-body text-xs font-medium text-foreground">Target role *</span>
                  <input
                    type="text"
                    name="targetRole"
                    required
                    value={modalTargetRole}
                    onChange={(e) => setModalTargetRole(e.target.value)}
                    placeholder="e.g. SDE-1, Data Analyst"
                    className="mt-1 h-8 w-full rounded border border-border/80 bg-background px-3 font-body text-xs text-foreground outline-none focus:border-foreground/40"
                  />
                </label>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block">
                  <span className="font-body text-xs font-medium text-foreground">Package / CTC</span>
                  <input
                    type="text"
                    name="packageCtc"
                    value={modalPackageCtc}
                    onChange={(e) => setModalPackageCtc(e.target.value)}
                    placeholder="e.g. 12.5 LPA"
                    className="mt-1 h-8 w-full rounded border border-border/80 bg-background px-3 font-body text-xs text-foreground outline-none focus:border-foreground/40"
                  />
                </label>

                <label className="block">
                  <span className="font-body text-xs font-medium text-foreground">Location</span>
                  <input
                    type="text"
                    name="location"
                    placeholder="e.g. Bangalore / Remote"
                    className="mt-1 h-8 w-full rounded border border-border/80 bg-background px-3 font-body text-xs text-foreground outline-none focus:border-foreground/40"
                  />
                </label>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block">
                  <span className="font-body text-xs font-medium text-foreground">Minimum cutoff score (%)</span>
                  <input
                    type="number"
                    name="minReadinessScore"
                    value={modalCutoff}
                    onChange={(e) => setModalCutoff(parseInt(e.target.value, 10) || 0)}
                    min={0}
                    max={100}
                    className="mt-1 h-8 w-full rounded border border-border/80 bg-background px-3 font-body text-xs text-foreground outline-none focus:border-foreground/40"
                  />
                </label>

                <label className="block">
                  <span className="font-body text-xs font-medium text-foreground">Eligible batches</span>
                  <input
                    type="text"
                    name="targetBatches"
                    defaultValue="2026 Batch, 2025 Batch"
                    className="mt-1 h-8 w-full rounded border border-border/80 bg-background px-3 font-body text-xs text-foreground outline-none focus:border-foreground/40"
                  />
                </label>
              </div>

              <label className="block">
                <span className="font-body text-xs font-medium text-foreground">Allowed departments</span>
                <input
                  type="text"
                  name="allowedDepartments"
                  defaultValue="Computer Science, Information Technology, Electronics & Communication"
                  className="mt-1 h-8 w-full rounded border border-border/80 bg-background px-3 font-body text-xs text-foreground outline-none focus:border-foreground/40"
                />
              </label>

              <label className="block">
                <span className="font-body text-xs font-medium text-foreground">Job description</span>
                <textarea
                  name="jobDescription"
                  rows={3}
                  value={modalJobDesc}
                  onChange={(e) => setModalJobDesc(e.target.value)}
                  placeholder="Key responsibilities and qualifications required for this campus drive..."
                  className="mt-1 w-full rounded border border-border/80 bg-background p-2.5 font-body text-xs text-foreground outline-none focus:border-foreground/40 resize-none"
                />
              </label>

              <div className="mt-4 flex items-center justify-end gap-2 border-t border-border/80 pt-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="inline-flex h-8 items-center rounded border border-border/80 bg-background px-3 font-body text-xs font-medium text-muted-foreground hover:text-foreground"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="inline-flex h-8 items-center rounded bg-foreground px-3.5 font-body text-xs font-medium text-background hover:bg-foreground/90 disabled:opacity-60"
                >
                  {isPending ? "Creating drive..." : "Publish placement drive"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default DrivesClient;
