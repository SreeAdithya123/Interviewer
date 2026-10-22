import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { InterviewRoomClient } from "@/components/interview/InterviewRoomClient";
import type { Interview } from "@/lib/interview/types";

export const metadata: Metadata = {
  title: "Interview in progress",
};

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Dynamic route param: Next.js 16 passes `params` as a Promise — see the
// same note in app/app/students/[id]/page.tsx.
interface InterviewRoomPageProps {
  params: Promise<{ id: string }>;
}

export default async function InterviewRoomPage({ params }: InterviewRoomPageProps) {
  const { id } = await params;

  if (!UUID_REGEX.test(id)) {
    return (
      <div className="max-w-xl space-y-4">
        <Link href="/app/interview" className="font-body text-sm text-muted-foreground hover:text-foreground">
          &larr; Back to interview setup
        </Link>
        <p className="rounded-3xl border border-border bg-card p-8 text-center font-body text-sm text-muted-foreground shadow-soft">
          Invalid interview link.
        </p>
      </div>
    );
  }

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

  return (
    <Suspense
      fallback={
        <div className="flex min-h-[500px] w-full items-center justify-center">
          <div className="text-center space-y-3">
            <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            <p className="font-body text-sm text-muted-foreground">Loading interview room...</p>
          </div>
        </div>
      }
    >
      <InterviewRoomClient interview={interview as Interview} />
    </Suspense>
  );
}
