"use client";

import React, { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import type { PlacementDrive, EligibilityResult } from "@/lib/drives/types";
import { createDriveAction, startDriveInterviewAction } from "./actions";

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
    <div className="space-y-8">
      {/* Top Banner & Stats */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-headline text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Campus Placement Drives
          </h1>
          <p className="mt-1 font-body text-sm text-muted-foreground">
            {isManager
              ? "Manage visiting company hiring pipelines, configure cutoffs, and track batch shortlists."
              : "Discover campus placement opportunities, verify your eligibility, and take company-specific assessments."}
          </p>
        </div>

        {isManager && (
          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="btn-primary flex items-center gap-2 shadow-md"
          >
            <span>+</span> Create Placement Drive
          </button>
        )}
      </div>

      {actionError && (
        <div className="rounded-2xl border border-destructive/20 bg-destructive/10 p-4 font-body text-sm text-destructive">
          {actionError}
        </div>
      )}

      {/* Overview Stat Cards (for TPO / College Admins) */}
      {isManager && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div className="rounded-3xl border border-border bg-card p-5 shadow-soft">
            <span className="font-body text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Total Drives
            </span>
            <p className="mt-2 font-headline text-3xl font-bold text-foreground">{stats.total}</p>
          </div>
          <div className="rounded-3xl border border-border bg-card p-5 shadow-soft">
            <span className="font-body text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Active Now
            </span>
            <p className="mt-2 font-headline text-3xl font-bold text-emerald-500">{stats.active}</p>
          </div>
          <div className="rounded-3xl border border-border bg-card p-5 shadow-soft">
            <span className="font-body text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Registered Candidates
            </span>
            <p className="mt-2 font-headline text-3xl font-bold text-foreground">{stats.totalApplicants}</p>
          </div>
          <div className="rounded-3xl border border-border bg-card p-5 shadow-soft">
            <span className="font-body text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Shortlisted for Offers
            </span>
            <p className="mt-2 font-headline text-3xl font-bold text-primary">{stats.totalShortlisted}</p>
          </div>
        </div>
      )}

      {/* Filters & Search */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-border bg-card/60 p-3 shadow-soft backdrop-blur">
        <div className="flex flex-1 items-center gap-3 min-w-[240px]">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by company, role, package, or location..."
            className="w-full rounded-xl border border-border bg-background px-4 py-2 font-body text-sm text-foreground outline-none transition focus:border-primary"
          />
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setStatusFilter("all")}
            className={cn(
              "rounded-xl px-3 py-1.5 font-body text-xs font-medium transition",
              statusFilter === "all"
                ? "bg-primary text-primary-foreground font-semibold"
                : "text-muted-foreground hover:bg-muted",
            )}
          >
            All Drives
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter("active")}
            className={cn(
              "rounded-xl px-3 py-1.5 font-body text-xs font-medium transition",
              statusFilter === "active"
                ? "bg-emerald-600 text-white font-semibold"
                : "text-muted-foreground hover:bg-muted",
            )}
          >
            Active
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter("upcoming")}
            className={cn(
              "rounded-xl px-3 py-1.5 font-body text-xs font-medium transition",
              statusFilter === "upcoming"
                ? "bg-primary text-primary-foreground font-semibold"
                : "text-muted-foreground hover:bg-muted",
            )}
          >
            Upcoming
          </button>
        </div>
      </div>

      {/* Drives Grid */}
      {filteredDrives.length === 0 ? (
        <div className="rounded-3xl border border-border bg-card p-12 text-center">
          <p className="font-body text-base text-muted-foreground">No placement drives found matching your criteria.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredDrives.map((drive) => {
            const elig = eligibilityMap[drive.id];
            const isEligible = elig ? elig.isEligible : true;

            return (
              <div
                key={drive.id}
                className="flex flex-col justify-between rounded-3xl border border-border bg-card p-6 shadow-soft transition hover:border-primary/50 hover:shadow-lg"
              >
                <div>
                  {/* Card Header: Company Badge & Status */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div
                        className="flex h-12 w-12 items-center justify-center rounded-2xl font-headline font-bold text-white shadow"
                        style={{ backgroundColor: drive.companyColor }}
                      >
                        {drive.companyLogoText}
                      </div>
                      <div>
                        <h2 className="font-headline text-lg font-bold text-foreground">{drive.companyName}</h2>
                        <span className="font-body text-xs text-muted-foreground">{drive.location}</span>
                      </div>
                    </div>

                    <span
                      className={cn(
                        "rounded-full px-2.5 py-0.5 font-body text-[11px] font-semibold uppercase tracking-wider",
                        drive.status === "active"
                          ? "bg-emerald-500/10 text-emerald-500"
                          : drive.status === "upcoming"
                            ? "bg-sky-500/10 text-sky-500"
                            : "bg-muted text-muted-foreground",
                      )}
                    >
                      {drive.status}
                    </span>
                  </div>

                  {/* Target Role & CTC */}
                  <div className="mt-4">
                    <h3 className="font-headline text-base font-semibold text-foreground">{drive.targetRole}</h3>
                    <div className="mt-1 flex items-center gap-2">
                      <span className="font-metric text-sm font-bold text-primary">{drive.packageCtc}</span>
                      <span className="text-xs text-muted-foreground">· Full Time</span>
                    </div>
                  </div>

                  {/* Description */}
                  <p className="mt-3 line-clamp-2 font-body text-xs leading-relaxed text-muted-foreground">
                    {drive.jobDescription}
                  </p>

                  {/* Eligibility Highlights */}
                  <div className="mt-4 space-y-1.5 border-t border-border/60 pt-3 text-xs">
                    <div className="flex items-center justify-between text-muted-foreground">
                      <span>Cutoff Score:</span>
                      <span className="font-medium text-foreground">&ge; {drive.eligibility.minReadinessScore}%</span>
                    </div>
                    <div className="flex items-center justify-between text-muted-foreground">
                      <span>Target Batches:</span>
                      <span className="font-medium text-foreground">{drive.eligibility.targetBatches[0]}</span>
                    </div>
                    <div className="flex items-center justify-between text-muted-foreground">
                      <span>Rounds:</span>
                      <span className="font-medium text-foreground">{drive.rounds.length} Assessment Rounds</span>
                    </div>
                  </div>

                  {/* Student Eligibility Pill */}
                  {!isManager && elig && (
                    <div className="mt-4 rounded-xl border p-2.5 text-xs">
                      {isEligible ? (
                        <div className="flex items-center gap-1.5 text-emerald-500 font-medium">
                          <span>✓</span> Eligible for this drive (Your score: {elig.currentScore}%)
                        </div>
                      ) : (
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5 text-amber-500 font-medium">
                            <span>⚠</span> Requirements pending
                          </div>
                          <p className="text-[11px] text-muted-foreground">{elig.reasons[0]}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Card Footer Actions */}
                <div className="mt-6 flex items-center gap-3 border-t border-border pt-4">
                  {isManager ? (
                    <Link
                      href={`/app/drives/${drive.id}`}
                      className="btn-secondary w-full text-center text-xs font-semibold"
                    >
                      View Leaderboard ({drive.totalApplicants}) ↗
                    </Link>
                  ) : isEligible ? (
                    <button
                      type="button"
                      disabled={isStartingId === drive.id}
                      onClick={() => handleStartDrive(drive.id)}
                      className="btn-primary w-full text-xs font-semibold"
                    >
                      {isStartingId === drive.id ? "Launching Assessment..." : "Start Drive Assessment ⚡"}
                    </button>
                  ) : (
                    <Link
                      href="/app/interview"
                      className="btn-secondary w-full text-center text-xs font-medium"
                    >
                      Practice to Qualify ↗
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-xl rounded-3xl border border-border bg-card p-6 shadow-2xl sm:p-8">
            <div className="flex items-center justify-between border-b border-border pb-4">
              <h2 className="font-headline text-xl font-bold text-foreground">Create Placement Drive</h2>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-muted-foreground hover:text-foreground text-lg"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="mt-6 space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className="font-body text-xs font-semibold text-foreground">Company Name *</span>
                  <input
                    type="text"
                    name="companyName"
                    required
                    placeholder="e.g. Google, Microsoft, TCS"
                    className="mt-1.5 w-full rounded-xl border border-border bg-background px-3.5 py-2 font-body text-sm text-foreground outline-none focus:border-primary"
                  />
                </label>

                <label className="block">
                  <span className="font-body text-xs font-semibold text-foreground">Target Role *</span>
                  <input
                    type="text"
                    name="targetRole"
                    required
                    placeholder="e.g. SDE-1, Data Analyst"
                    className="mt-1.5 w-full rounded-xl border border-border bg-background px-3.5 py-2 font-body text-sm text-foreground outline-none focus:border-primary"
                  />
                </label>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className="font-body text-xs font-semibold text-foreground">Package / CTC</span>
                  <input
                    type="text"
                    name="packageCtc"
                    placeholder="e.g. 12.5 LPA"
                    className="mt-1.5 w-full rounded-xl border border-border bg-background px-3.5 py-2 font-body text-sm text-foreground outline-none focus:border-primary"
                  />
                </label>

                <label className="block">
                  <span className="font-body text-xs font-semibold text-foreground">Location</span>
                  <input
                    type="text"
                    name="location"
                    placeholder="e.g. Bangalore / Remote"
                    className="mt-1.5 w-full rounded-xl border border-border bg-background px-3.5 py-2 font-body text-sm text-foreground outline-none focus:border-primary"
                  />
                </label>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className="font-body text-xs font-semibold text-foreground">Minimum Cutoff Score (%)</span>
                  <input
                    type="number"
                    name="minReadinessScore"
                    defaultValue={70}
                    min={0}
                    max={100}
                    className="mt-1.5 w-full rounded-xl border border-border bg-background px-3.5 py-2 font-body text-sm text-foreground outline-none focus:border-primary"
                  />
                </label>

                <label className="block">
                  <span className="font-body text-xs font-semibold text-foreground">Eligible Batches (comma separated)</span>
                  <input
                    type="text"
                    name="targetBatches"
                    defaultValue="2026 Batch, 2025 Batch"
                    className="mt-1.5 w-full rounded-xl border border-border bg-background px-3.5 py-2 font-body text-sm text-foreground outline-none focus:border-primary"
                  />
                </label>
              </div>

              <label className="block">
                <span className="font-body text-xs font-semibold text-foreground">
                  Allowed Departments (comma separated)
                </span>
                <input
                  type="text"
                  name="allowedDepartments"
                  defaultValue="Computer Science, Information Technology, Electronics & Communication"
                  className="mt-1.5 w-full rounded-xl border border-border bg-background px-3.5 py-2 font-body text-sm text-foreground outline-none focus:border-primary"
                />
              </label>

              <label className="block">
                <span className="font-body text-xs font-semibold text-foreground">Job Description</span>
                <textarea
                  name="jobDescription"
                  rows={3}
                  placeholder="Key responsibilities and qualifications required for this campus drive..."
                  className="mt-1.5 w-full rounded-xl border border-border bg-background px-3.5 py-2 font-body text-sm text-foreground outline-none focus:border-primary resize-none"
                />
              </label>

              <div className="mt-6 flex items-center justify-end gap-3 border-t border-border pt-4">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="btn-secondary text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="btn-primary text-xs font-semibold"
                >
                  {isPending ? "Creating Drive..." : "Publish Placement Drive"}
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
