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
  /** True when this student's latest completed report was scored by the
   * stub interview engine (no real evaluation model connected yet) — see
   * lib/ai-stubs/interview-engine.ts's STUB_REPORT_MODEL_ID. */
  readinessScoreIsPreview: boolean;
  weakAreaCount: number;
}

const READINESS_BADGE_CLASS: Record<ReadinessBand, string> = {
  ready: "bg-primary/10 text-primary",
  developing: "bg-secondary/10 text-secondary",
  needs_practice: "bg-destructive/10 text-destructive",
  not_yet_assessed: "bg-muted text-muted-foreground",
};

/**
 * All search/filter/export here runs over the one real data fetch
 * StudentsPage already made (profiles + latest interview_reports +
 * weak_areas, RLS-scoped to the admin's own college) — no extra network
 * round trip per keystroke, no AI involved, nothing to stub.
 */
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
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 flex-col gap-3 sm:flex-row">
          <input
            type="text"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by name or email"
            className="w-full rounded-2xl border border-input bg-background px-4 py-2.5 font-body text-sm text-foreground outline-none transition-colors focus:border-primary sm:max-w-xs"
          />
          <Select label="Batch" value={batchFilter} onChange={setBatchFilter} options={batches} />
          <Select label="Department" value={departmentFilter} onChange={setDepartmentFilter} options={departments} />
          <select
            value={readinessFilter}
            onChange={(event) => setReadinessFilter(event.target.value as "all" | ReadinessBand)}
            className="rounded-2xl border border-input bg-background px-4 py-2.5 font-body text-sm text-foreground outline-none transition-colors focus:border-primary"
          >
            <option value="all">All readiness</option>
            {READINESS_BANDS.map((band) => (
              <option key={band} value={band}>
                {READINESS_LABEL[band]}
              </option>
            ))}
          </select>
        </div>

        <button type="button" onClick={handleExport} className="btn-secondary shrink-0 text-sm">
          Export CSV
        </button>
      </div>

      <p className="font-body text-xs text-muted-foreground">
        Showing {filtered.length} of {students.length} students.
      </p>

      {students.some((s) => s.readinessScoreIsPreview) && (
        <p className="rounded-2xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 font-body text-xs font-medium text-amber-700">
          Preview — readiness marked with <span className="font-semibold">(preview)</span> below comes from
          the stub interview engine, not a real evaluation model.
        </p>
      )}

      <div className="overflow-x-auto rounded-3xl border border-border bg-card shadow-soft">
        <table className="w-full text-left font-body text-sm">
          <thead>
            <tr className="border-b border-border text-muted-foreground">
              <th className="px-5 py-3 font-medium">Name</th>
              <th className="px-5 py-3 font-medium">Batch</th>
              <th className="px-5 py-3 font-medium">Department</th>
              <th className="px-5 py-3 font-medium">Readiness</th>
              <th className="px-5 py-3 font-medium">Weak areas</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-5 py-10 text-center text-muted-foreground">
                  {students.length === 0
                    ? "No students have been added to your college yet. Use Invites to bring your batch on."
                    : "No students match these filters."}
                </td>
              </tr>
            ) : (
              filtered.map((student) => (
                <tr key={student.id} className="border-b border-border last:border-b-0 hover:bg-muted/40">
                  <td className="px-5 py-3">
                    <Link href={`/app/students/${student.id}`} className="font-medium text-foreground hover:underline">
                      {student.fullName ?? student.email}
                    </Link>
                    <p className="font-body text-xs text-muted-foreground">{student.email}</p>
                  </td>
                  <td className="px-5 py-3 text-foreground">{student.batchName ?? "—"}</td>
                  <td className="px-5 py-3 text-foreground">{student.department ?? "—"}</td>
                  <td className="px-5 py-3">
                    <span
                      className={cn(
                        "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium",
                        READINESS_BADGE_CLASS[student.readinessBand],
                      )}
                    >
                      {READINESS_LABEL[student.readinessBand]}
                    </span>
                    {student.readinessScoreIsPreview && (
                      <span className="ml-1.5 font-body text-[10px] font-semibold uppercase tracking-wide text-amber-600">
                        (preview)
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-3 text-foreground">{student.weakAreaCount}</td>
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
      className="rounded-2xl border border-input bg-background px-4 py-2.5 font-body text-sm text-foreground outline-none transition-colors focus:border-primary"
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
