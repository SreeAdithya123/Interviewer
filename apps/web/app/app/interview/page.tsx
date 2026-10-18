import type { Metadata } from "next";
import { PreviewBadge } from "@/components/interview/primitives";
import { InterviewSetupForm } from "@/components/interview/InterviewSetupForm";

export const metadata: Metadata = {
  title: "Start an interview",
};

// /app/interview — BUILD_SPEC Part 4.5 step 1: pick interview type, target
// role, company type, difficulty. Submitting creates a real `interviews`
// row (status 'pending') and navigates to the interview room
// (app/app/interview/[interviewId]/page.tsx). No auth check needed here —
// app/app/layout.tsx already guarantees a signed-in, onboarded profile.
export default function InterviewSetupPage() {
  return (
    <div className="max-w-2xl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-headline text-2xl font-semibold tracking-tight text-foreground">
          Start a practice interview
        </h1>
        <PreviewBadge />
      </div>
      <p className="mt-2 font-body text-sm text-muted-foreground">
        Pick a type, role and difficulty. The questions you&apos;ll get are drawn from a small local
        preview set, not the real question engine yet — see the badge above.
      </p>

      <div className="mt-8 rounded-3xl border border-border bg-card p-6 shadow-soft sm:p-8">
        <InterviewSetupForm />
      </div>
    </div>
  );
}
