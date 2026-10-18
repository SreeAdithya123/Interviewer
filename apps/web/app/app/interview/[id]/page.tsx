import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { InterviewRoomClient } from "@/components/interview/InterviewRoomClient";
import type { Interview } from "@/lib/interview/types";

export const metadata: Metadata = {
  title: "Interview in progress",
};

// Dynamic route param: Next.js 16 passes `params` as a Promise — see the
// same note in app/app/students/[id]/page.tsx.
interface InterviewRoomPageProps {
  params: Promise<{ id: string }>;
}

// /app/interview/[id] — the turn-based interview room (BUILD_SPEC Part
// 4.5 steps 2-7). Real browser recording (MediaRecorder) and real
// Supabase writes (interviews/interview_turns/interview_reports via the
// *_stub_interview RPC functions); the question text, "transcript" and
// scoring are stub/preview content from lib/ai-stubs/interview-engine.ts
// — there is no real STT/TTS/question-engine provider wired up yet
// (BUILD_SPEC Part 7 Phase 1 is blocked on API keys).
//
// Audio stays in-browser only for this preview: there is no R2 upload
// wired up either, so recorded clips are kept in
// lib/interview/audio-store.ts (an in-memory, per-tab store) rather than
// uploaded, and `interview_turns.answer_audio_key` is always left null.
export default async function InterviewRoomPage({ params }: InterviewRoomPageProps) {
  const { id } = await params;
  const supabase = await createClient();

  // RLS (interviews_select) only returns this row if it belongs to the
  // caller (or, for a college_admin/platform_admin, their own
  // college/everyone) — not found at all means either it doesn't exist or
  // it isn't this caller's interview to take.
  const { data: interview } = await supabase
    .from("interviews")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (!interview) {
    return (
      <div className="max-w-xl space-y-4">
        <Link href="/app/interview" className="font-body text-sm text-muted-foreground hover:text-foreground">
          &larr; Back to interview setup
        </Link>
        <p className="rounded-3xl border border-border bg-card p-8 text-center font-body text-sm text-muted-foreground shadow-soft">
          No interview found with this link.
        </p>
      </div>
    );
  }

  if (interview.status === "completed") {
    redirect(`/app/interview/${id}/report`);
  }

  if (interview.status === "abandoned") {
    return (
      <div className="max-w-xl space-y-4">
        <Link href="/app/interview" className="font-body text-sm text-muted-foreground hover:text-foreground">
          &larr; Back to interview setup
        </Link>
        <p className="rounded-3xl border border-border bg-card p-8 text-center font-body text-sm text-muted-foreground shadow-soft">
          This interview was abandoned. Start a new one from the setup page.
        </p>
      </div>
    );
  }

  return <InterviewRoomClient interview={interview as Interview} />;
}
