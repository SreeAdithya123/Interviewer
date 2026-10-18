import type { Metadata } from "next";
import { requireCollegeAdmin } from "@/lib/auth/require-college-admin";
import { createClient } from "@/lib/supabase/server";
import { readinessBand, type ReadinessBand } from "@/lib/readiness";
import { isStubReport } from "@/lib/ai-stubs/interview-engine";
import StudentsTable, { type StudentRow } from "./StudentsTable";

export const metadata: Metadata = {
  title: "Students",
};

// This project has no generated Database type for the Supabase client (see
// lib/supabase/client.ts/server.ts — createClient() takes no generic), so
// an embedded-relation select like "batches(name)" can't be typed from the
// select string alone: postgrest-js's type-level parser needs the schema
// to know a profile has at most one batch, and without it infers a
// to-many array instead. Cast to the real shape once here, the same way
// lib/auth/current-profile.ts casts its own untyped query result.
interface StudentProfileRow {
  id: string;
  full_name: string | null;
  email: string;
  department: string | null;
  graduation_year: number | null;
  batch_id: string | null;
  batches: { name: string } | null;
}

// docs/BUILD_SPEC.md Part 4.7: "Students table: search, filter by
// batch/department/readiness, CSV export." The search/filter/export
// themselves are client-side (StudentsTable) over this one real,
// RLS-scoped data fetch — no manual .eq("college_id", ...) needed, RLS
// already restricts `profiles`/`interview_reports`/`weak_areas` to this
// college_admin's own college.
export default async function StudentsPage() {
  await requireCollegeAdmin();
  const supabase = await createClient();

  const [studentsRes, reportsRes, weakAreasRes] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, full_name, email, department, graduation_year, batch_id, batches(name)")
      .eq("role", "student")
      .order("full_name", { ascending: true, nullsFirst: false }),
    supabase
      .from("interview_reports")
      .select("user_id, overall_score, model_id, created_at")
      .eq("status", "completed")
      .order("created_at", { ascending: false }),
    supabase.from("weak_areas").select("user_id").eq("is_resolved", false),
  ]);

  const latestScoreByUser = new Map<string, number | null>();
  const latestScoreIsStubByUser = new Map<string, boolean>();
  for (const report of reportsRes.data ?? []) {
    if (!latestScoreByUser.has(report.user_id)) {
      latestScoreByUser.set(report.user_id, report.overall_score === null ? null : Number(report.overall_score));
      latestScoreIsStubByUser.set(report.user_id, isStubReport(report.model_id));
    }
  }

  const weakAreaCountByUser = new Map<string, number>();
  for (const row of weakAreasRes.data ?? []) {
    weakAreaCountByUser.set(row.user_id, (weakAreaCountByUser.get(row.user_id) ?? 0) + 1);
  }

  const studentProfiles = (studentsRes.data ?? []) as unknown as StudentProfileRow[];

  const students: StudentRow[] = studentProfiles.map((student) => {
    const score = latestScoreByUser.get(student.id) ?? null;
    const band: ReadinessBand = readinessBand(score);
    return {
      id: student.id,
      fullName: student.full_name,
      email: student.email,
      department: student.department,
      graduationYear: student.graduation_year,
      batchName: student.batches?.name ?? null,
      readinessBand: band,
      readinessScore: score,
      readinessScoreIsPreview: latestScoreIsStubByUser.get(student.id) ?? false,
      weakAreaCount: weakAreaCountByUser.get(student.id) ?? 0,
    };
  });

  return (
    <div className="max-w-6xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Students</h1>
        <p className="mt-1 font-body text-sm text-muted-foreground">Every student enrolled at your college.</p>
      </div>

      <StudentsTable students={students} />
    </div>
  );
}
