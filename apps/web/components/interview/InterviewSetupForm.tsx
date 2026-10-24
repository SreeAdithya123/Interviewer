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
        "rounded border px-3 py-2 text-left font-body text-xs font-medium transition-colors",
        selected
          ? "border-foreground bg-muted font-medium text-foreground"
          : "border-border/80 bg-background text-muted-foreground hover:border-border hover:text-foreground",
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
    <form onSubmit={handleSubmit} className="space-y-6">
      <fieldset>
        <legend className="font-body text-xs font-medium text-foreground">Interview track</legend>
        <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {INTERVIEW_TYPES.map((type) => (
            <ChoiceButton key={type} selected={interviewType === type} onClick={() => setInterviewType(type)}>
              {INTERVIEW_TYPE_LABELS[type]}
            </ChoiceButton>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend className="font-body text-xs font-medium text-foreground">Difficulty tier</legend>
        <div className="mt-2 grid grid-cols-3 gap-2">
          {DIFFICULTIES.map((level) => (
            <ChoiceButton key={level} selected={difficulty === level} onClick={() => setDifficulty(level)}>
              {DIFFICULTY_LABELS[level]}
            </ChoiceButton>
          ))}
        </div>
      </fieldset>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="font-body text-xs font-medium text-foreground">Target role (optional)</span>
          <input
            type="text"
            value={targetRole}
            onChange={(event) => setTargetRole(event.target.value)}
            placeholder="e.g. Backend Engineer, SDE-1"
            className="mt-1 h-8 w-full rounded border border-border/80 bg-background px-3 font-body text-xs text-foreground outline-none focus:border-foreground/40 placeholder:text-muted-foreground/60"
          />
        </label>

        <label className="block">
          <span className="font-body text-xs font-medium text-foreground">Company type (optional)</span>
          <input
            type="text"
            value={companyType}
            onChange={(event) => setCompanyType(event.target.value)}
            placeholder="e.g. Product-based startup, FAANG"
            className="mt-1 h-8 w-full rounded border border-border/80 bg-background px-3 font-body text-xs text-foreground outline-none focus:border-foreground/40 placeholder:text-muted-foreground/60"
          />
        </label>
      </div>

      {error && (
        <p className="rounded border border-rose-200 bg-rose-50 px-3 py-2 font-body text-xs text-rose-900 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300">
          {error}
        </p>
      )}

      <div className="pt-2">
        <button
          type="submit"
          disabled={status === "submitting"}
          className="inline-flex h-9 items-center justify-center rounded bg-foreground px-4 font-body text-xs font-medium text-background hover:bg-foreground/90 disabled:opacity-60"
        >
          {status === "submitting" ? "Launching session..." : "Start mock interview"}
        </button>
      </div>
    </form>
  );
}

export default InterviewSetupForm;
