"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { createInterview } from "@/lib/interview/actions";
import type { Difficulty, InterviewType } from "@/lib/interview/types";
import { DIFFICULTY_LABELS, INTERVIEW_TYPE_LABELS } from "@/lib/interview/types";

const INTERVIEW_TYPES: InterviewType[] = ["hr", "technical", "behavioral", "mixed"];
const DIFFICULTIES: Difficulty[] = ["easy", "medium", "hard"];

function ChoiceButton({
  selected,
  onClick,
  children,
}: {
  selected: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-2xl border px-4 py-3 text-left font-body text-sm font-medium transition-colors",
        selected
          ? "border-primary bg-primary/10 text-primary"
          : "border-border bg-background text-foreground hover:border-primary/40",
      )}
    >
      {children}
    </button>
  );
}

export function InterviewSetupForm() {
  const router = useRouter();
  const [interviewType, setInterviewType] = useState<InterviewType>("mixed");
  const [difficulty, setDifficulty] = useState<Difficulty>("medium");
  const [targetRole, setTargetRole] = useState("");
  const [companyType, setCompanyType] = useState("");
  const [status, setStatus] = useState<"idle" | "submitting" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("submitting");
    setError(null);

    try {
      const interview = await createInterview({
        interviewType,
        targetRole: targetRole.trim(),
        companyType: companyType.trim(),
        difficulty,
      });
      router.push(`/app/interview/${interview.id}`);
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Could not create the interview.");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <fieldset>
        <legend className="font-body text-sm font-semibold text-foreground">Interview type</legend>
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {INTERVIEW_TYPES.map((type) => (
            <ChoiceButton key={type} selected={interviewType === type} onClick={() => setInterviewType(type)}>
              {INTERVIEW_TYPE_LABELS[type]}
            </ChoiceButton>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend className="font-body text-sm font-semibold text-foreground">Difficulty</legend>
        <div className="mt-3 grid grid-cols-3 gap-3">
          {DIFFICULTIES.map((level) => (
            <ChoiceButton key={level} selected={difficulty === level} onClick={() => setDifficulty(level)}>
              {DIFFICULTY_LABELS[level]}
            </ChoiceButton>
          ))}
        </div>
      </fieldset>

      <div className="grid gap-6 sm:grid-cols-2">
        <label className="block">
          <span className="font-body text-sm font-semibold text-foreground">Target role</span>
          <input
            type="text"
            value={targetRole}
            onChange={(event) => setTargetRole(event.target.value)}
            placeholder="e.g. Backend Engineer"
            className="mt-2 w-full rounded-2xl border border-input bg-background px-4 py-3 font-body text-sm text-foreground outline-none transition-colors focus:border-primary"
          />
        </label>

        <label className="block">
          <span className="font-body text-sm font-semibold text-foreground">Company type</span>
          <input
            type="text"
            value={companyType}
            onChange={(event) => setCompanyType(event.target.value)}
            placeholder="e.g. Product-based startup"
            className="mt-2 w-full rounded-2xl border border-input bg-background px-4 py-3 font-body text-sm text-foreground outline-none transition-colors focus:border-primary"
          />
        </label>
      </div>

      {error && (
        <p className="rounded-2xl bg-destructive/10 px-4 py-3 font-body text-sm text-destructive">{error}</p>
      )}

      <button
        type="submit"
        disabled={status === "submitting"}
        className="btn-primary w-full disabled:opacity-60 sm:w-auto"
      >
        {status === "submitting" ? "Setting up..." : "Start interview"}
      </button>
    </form>
  );
}

export default InterviewSetupForm;
