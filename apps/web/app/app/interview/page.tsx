import type { Metadata } from "next";
import { InterviewSetupForm } from "@/components/interview/InterviewSetupForm";

export const metadata: Metadata = {
  title: "Start an interview",
};

export default function InterviewSetupPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="font-headline text-2xl font-semibold tracking-tight text-foreground">
          Start a Practice Interview
        </h1>
        <p className="mt-1 font-body text-sm text-muted-foreground">
          Select interview track, technical level, and optional role targeting. The AI interviewer adapts dynamically in real time.
        </p>
      </div>

      <div className="rounded-lg border border-border/80 bg-card p-6">
        <InterviewSetupForm />
      </div>
    </div>
  );
}
