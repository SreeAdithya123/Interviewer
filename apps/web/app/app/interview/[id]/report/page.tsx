import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { InterviewReportClient } from "@/components/interview/InterviewReportClient";
import { getInterviewTurns } from "@/lib/interview/actions";
import type { Interview, InterviewReport, InterviewTurn } from "@/lib/interview/types";

export const metadata: Metadata = {
  title: "Interview report",
};

interface InterviewReportPageProps {
  params: Promise<{ id: string }>;
}

// /app/interview/[id]/report — BUILD_SPEC Part 4.5 step 9. Reads real
// rows from `interviews`/`interview_reports`/`interview_turns` with R2
// signed download URLs for permanent audio playback across page reloads.
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

  let turns: InterviewTurn[] = [];
  try {
    turns = await getInterviewTurns(id);
  } catch {
    const turnsRes = await supabase
      .from("interview_turns")
      .select("*")
      .eq("interview_id", id)
      .order("turn_number", { ascending: true });
    turns = (turnsRes.data as InterviewTurn[]) ?? [];
  }

  const { data: report } = await supabase
    .from("interview_reports")
    .select("*")
    .eq("interview_id", id)
    .maybeSingle();

  return (
    <InterviewReportClient
      interview={interview as Interview}
      report={(report as InterviewReport | null) ?? null}
      turns={turns}
    />
  );
}
