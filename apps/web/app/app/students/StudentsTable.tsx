"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { downloadCsv } from "@/lib/csv";
import { READINESS_BANDS, READINESS_LABEL, type ReadinessBand } from "@/lib/readiness";

export interface StudentRow {
  id: string;
  fullName: string | null;
  email: string;
  department: string | null;
  graduationYear: number | null;
  batchName: string | null;
  readinessBand: ReadinessBand;
  readinessScore: number | null;
  readinessScoreIsPreview: boolean;
  weakAreaCount: number;
}

const READINESS_BADGE_CLASS: Record<ReadinessBand, string> = {
  ready: "bg-emerald-50 text-emerald-900 border-emerald-200/60 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/40",
  developing: "bg-amber-50 text-amber-900 border-amber-200/60 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/40",
  needs_practice: "bg-rose-50 text-rose-900 border-rose-200/60 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800/40",
  not_yet_assessed: "bg-muted text-muted-foreground border-border/80",
};

export function StudentsTable({ students }: { students: StudentRow[] }) {
  const [search, setSearch] = useState("");
  const [batchFilter, setBatchFilter] = useState("all");
  const [departmentFilter, setDepartmentFilter] = useState("all");
  const [readinessFilter, setReadinessFilter] = useState<"all" | ReadinessBand>("all");

  const batches = useMemo(
    () => [...new Set(students.map((s) => s.batchName).filter((b): b is string => !!b))].sort(),
    [students],
  );
  const departments = useMemo(
    () => [...new Set(students.map((s) => s.department).filter((d): d is string => !!d))].sort(),
    [students],
  );

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return students.filter((student) => {
      if (query) {
        const haystack = `${student.fullName ?? ""} ${student.email}`.toLowerCase();
        if (!haystack.includes(query)) return false;
      }
      if (batchFilter !== "all" && student.batchName !== batchFilter) return false;
      if (departmentFilter !== "all" && student.department !== departmentFilter) return false;
      if (readinessFilter !== "all" && student.readinessBand !== readinessFilter) return false;
      return true;
    });
  }, [students, search, batchFilter, departmentFilter, readinessFilter]);

  function handleExport() {
    const header = [
      "Name",
      "Email",
      "Department",
      "Graduation year",
      "Batch",
      "Readiness",
      "Readiness score",
      "Open weak areas",
    ];
    const rows = filtered.map((student) => [
      student.fullName ?? "",
      student.email,
      student.department ?? "",
      student.graduationYear !== null ? String(student.graduationYear) : "",
      student.batchName ?? "",
      READINESS_LABEL[student.readinessBand],
      student.readinessScore !== null ? String(student.readinessScore) : "",
      String(student.weakAreaCount),
    ]);
    downloadCsv(`students-${new Date().toISOString().slice(0, 10)}.csv`, [header, ...rows]);
  }

  return (
    <div className="space-y-4">
      {/* Toolbar: Search, Filters & Export */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-1 flex-wrap items-center gap-2">
          <input
            type="text"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search student name or email..."
            className="h-8 w-full sm:w-56 rounded border border-border/80 bg-background px-3 font-body text-xs text-foreground outline-none transition-colors focus:border-foreground/40 placeholder:text-muted-foreground/60"
          />
          <Select label="Batch" value={batchFilter} onChange={setBatchFilter} options={batches} />
          <Select label="Department" value={departmentFilter} onChange={setDepartmentFilter} options={departments} />
          <select
            value={readinessFilter}
            onChange={(event) => setReadinessFilter(event.target.value as "all" | ReadinessBand)}
            className="h-8 rounded border border-border/80 bg-background px-2.5 font-body text-xs text-foreground outline-none"
          >
            <option value="all">All readiness bands</option>
            {READINESS_BANDS.map((band) => (
              <option key={band} value={band}>
                {READINESS_LABEL[band]}
              </option>
            ))}
          </select>
        </div>

        <button
          type="button"
          onClick={handleExport}
          className="inline-flex h-8 items-center rounded border border-border/80 bg-background px-3 font-body text-xs font-medium text-foreground transition-colors hover:bg-muted"
        >
          Export CSV
        </button>
      </div>

      <p className="font-body text-xs text-muted-foreground">
        Showing {filtered.length} of {students.length} students.
      </p>

      {students.some((s) => s.readinessScoreIsPreview) && (
        <p className="rounded-md border border-amber-200/70 bg-amber-50 px-3.5 py-2.5 font-body text-xs text-amber-900 dark:border-amber-800/40 dark:bg-amber-950/30 dark:text-amber-300">
          Preview mode — readiness scores marked with (preview) were generated by the benchmark stub engine.
        </p>
      )}

      {/* Students Data Table */}
      <div className="overflow-x-auto rounded-lg border border-border/80 bg-card">
        <table className="w-full text-left font-body text-xs">
          <thead>
            <tr className="border-b border-border/60 text-muted-foreground">
              <th className="px-5 py-2.5 font-medium">Candidate</th>
              <th className="px-4 py-2.5 font-medium">Batch</th>
              <th className="px-4 py-2.5 font-medium">Department</th>
              <th className="px-4 py-2.5 font-medium">Readiness</th>
              <th className="px-5 py-2.5 text-right font-medium">Weak skills</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-5 py-8 text-center text-muted-foreground">
                  {students.length === 0
                    ? "No students have been enrolled yet. Use Invites to onboard your batch."
                    : "No students match the selected filters."}
                </td>
              </tr>
            ) : (
              filtered.map((student) => (
                <tr
                  key={student.id}
                  className="border-b border-border/60 transition-colors last:border-0 hover:bg-muted/30"
                >
                  <td className="px-5 py-3">
                    <Link
                      href={`/app/students/${student.id}`}
                      className="font-medium text-foreground underline-offset-4 hover:underline"
                    >
                      {student.fullName ?? student.email}
                    </Link>
                    <p className="text-[11px] text-muted-foreground">{student.email}</p>
                  </td>
                  <td className="px-4 py-3 text-foreground">{student.batchName ?? "—"}</td>
                  <td className="px-4 py-3 text-foreground">{student.department ?? "—"}</td>
                  <td className="px-4 py-3">
                    <span
                      className={cn(
                        "inline-flex items-center rounded border px-2 py-0.5 text-[11px] font-medium leading-none capitalize",
                        READINESS_BADGE_CLASS[student.readinessBand],
                      )}
                    >
                      {READINESS_LABEL[student.readinessBand]}
                    </span>
                    {student.readinessScoreIsPreview && (
                      <span className="ml-1 font-body text-[10px] font-medium text-amber-700 dark:text-amber-300">
                        (preview)
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-3 text-right font-metric font-medium text-foreground tabular-nums">
                    {student.weakAreaCount}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Select({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: string[];
}) {
  return (
    <select
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="h-8 rounded border border-border/80 bg-background px-2.5 font-body text-xs text-foreground outline-none"
    >
      <option value="all">All {label.toLowerCase()}s</option>
      {options.map((option) => (
        <option key={option} value={option}>
          {option}
        </option>
      ))}
    </select>
  );
}

export default StudentsTable;
