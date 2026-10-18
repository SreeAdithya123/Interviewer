import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { InterviewReportClient } from "@/components/interview/InterviewReportClient";
import type { Interview, InterviewReport, InterviewTurn } from "@/lib/interview/types";

export const metadata: Metadata = {
  title: "Interview report",
};

interface InterviewReportPageProps {
  params: Promise<{ id: string }>;
}

// /app/interview/[id]/report — BUILD_SPEC Part 4.5 step 9. Reads real
// rows from `interviews`/`interview_reports`/`interview_turns`; in stub
// mode the report row was written by finish_stub_interview() (see
// supabase/migrations/20261017180000_interview_stub_bridge.sql) with
// model_id = 'stub-fixture-v1', which InterviewReportClient's preview
// badge makes visible rather than presenting it as a real evaluation.
export default async function InterviewReportPage({ params }: InterviewReportPageProps) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: interview } = await supabase.from("interviews").select("*").eq("id", id).maybeSingle();

  if (!interview) {
    return (
      <div className="max-w-xl space-y-4">
        <Link href="/app/history" className="font-body text-sm text-muted-foreground hover:text-foreground">
          &larr; Back to history
        </Link>
        <p className="rounded-3xl border border-border bg-card p-8 text-center font-body text-sm text-muted-foreground shadow-soft">
          No interview found with this link.
        </p>
      </div>
    );
  }

  const [reportRes, turnsRes] = await Promise.all([
    supabase.from("interview_reports").select("*").eq("interview_id", id).maybeSingle(),
    supabase.from("interview_turns").select("*").eq("interview_id", id).order("turn_number", { ascending: true }),
  ]);

  return (
    <InterviewReportClient
      interview={interview as Interview}
      report={(reportRes.data as InterviewReport | null) ?? null}
      turns={(turnsRes.data as InterviewTurn[] | null) ?? []}
    />
  );
}
