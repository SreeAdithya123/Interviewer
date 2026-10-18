import type { Metadata } from "next";
import { InterviewSetupForm } from "@/components/interview/InterviewSetupForm";

export const metadata: Metadata = {
  title: "Start an interview",
};

// /app/interview — BUILD_SPEC Part 4.5 step 1: pick interview type, target
// role, company type, difficulty. Submitting creates a real `interviews`
// row via the real engine (lib/interview/actions.ts) and navigates to the
// interview room (app/app/interview/[interviewId]/page.tsx). No auth check
// needed here — app/app/layout.tsx already guarantees a signed-in,
// onboarded profile.
export default function InterviewSetupPage() {
  return (
    <div className="max-w-2xl">
      <h1 className="font-headline text-2xl font-semibold tracking-tight text-foreground">
        Start a practice interview
      </h1>
      <p className="mt-2 font-body text-sm text-muted-foreground">
        Pick a type and difficulty. Target role and company are optional — leave them blank for the
        broadest question match.
      </p>

      <div className="mt-8 rounded-3xl border border-border bg-card p-6 shadow-soft sm:p-8">
        <InterviewSetupForm />
      </div>
    </div>
  );
}
