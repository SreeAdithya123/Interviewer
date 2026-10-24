import type { Metadata } from "next";
import Link from "next/link";
import { getCurrentProfile } from "@/lib/auth/current-profile";
import { requireRole } from "@/lib/auth/require-role";
import StatusBadge from "@/components/app-shell/StatusBadge";
import { createClient } from "@/lib/supabase/server";
import {
  DIFFICULTIES,
  INTERVIEW_TYPES,
  QUESTION_STAGES,
  REVIEW_STATUSES,
  type QuestionBankRow,
} from "@/lib/types/db";
import { createQuestion, setQuestionStatus } from "./actions";

export const metadata: Metadata = {
  title: "Question bank",
};

export const dynamic = "force-dynamic";

export default async function QuestionBankPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  requireRole(await getCurrentProfile(), ["platform_admin"]);
  const params = await searchParams;
  const stage = typeof params.stage === "string" ? params.stage : "";
  const interviewType = typeof params.interview_type === "string" ? params.interview_type : "";
  const difficulty = typeof params.difficulty === "string" ? params.difficulty : "";
  const status = typeof params.status === "string" ? params.status : "";

  const supabase = await createClient();
  let query = supabase.from("question_bank").select("*").order("created_at", { ascending: false }).limit(200);
  if (stage) query = query.eq("stage", stage);
  if (interviewType) query = query.eq("interview_type", interviewType);
  if (difficulty) query = query.eq("difficulty", difficulty);
  if (status) query = query.eq("status", status);

  const { data: questions, error } = await query;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="font-headline text-2xl font-semibold tracking-tight text-foreground">
          Question Bank
        </h1>
        <p className="mt-1 font-body text-sm text-muted-foreground">
          Curated placement questions. Only <strong className="font-medium text-foreground">reviewed</strong> items are sampled by the interview engine.
        </p>
      </div>

      {/* Add Question Expandable Panel */}
      <details className="rounded-lg border border-border/80 bg-card open:pb-5">
        <summary className="cursor-pointer list-none px-5 py-3.5 font-body text-xs font-medium text-foreground hover:bg-muted/40">
          + Add a new question to the bank
        </summary>
        <form action={createQuestion} className="grid gap-3.5 px-5 pt-2 sm:grid-cols-2">
          <SelectField label="Interview stage" name="stage" options={QUESTION_STAGES} />
          <SelectField label="Interview track" name="interview_type" options={INTERVIEW_TYPES} />
          <SelectField label="Difficulty level" name="difficulty" options={DIFFICULTIES} />
          <Field label="Company type (optional)" name="company_type" placeholder="product, enterprise, startup" />
          <Field label="Target role (optional)" name="role" placeholder="SDE-1, Data Analyst, QA" />
          <Field label="Source (optional)" name="source" placeholder="internal, company campus memory" />
          <div className="sm:col-span-2">
            <label htmlFor="question_text" className="block font-body text-xs font-medium text-foreground">
              Question text *
            </label>
            <textarea
              id="question_text"
              name="question_text"
              required
              rows={3}
              className="mt-1 w-full rounded border border-border/80 bg-background p-2.5 font-body text-xs text-foreground outline-none focus:border-foreground/40 resize-none"
            />
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="ideal_answer_notes" className="block font-body text-xs font-medium text-foreground">
              Ideal answer notes (optional)
            </label>
            <textarea
              id="ideal_answer_notes"
              name="ideal_answer_notes"
              rows={2}
              className="mt-1 w-full rounded border border-border/80 bg-background p-2.5 font-body text-xs text-foreground outline-none focus:border-foreground/40 resize-none"
            />
          </div>
          <Field label="Tags (comma-separated)" name="tags" placeholder="arrays, binary search, system design" />
          <div className="flex items-end sm:col-span-2 pt-1">
            <button
              type="submit"
              className="inline-flex h-8 items-center rounded bg-foreground px-3.5 font-body text-xs font-medium text-background hover:bg-foreground/90"
            >
              Create question (as draft)
            </button>
          </div>
        </form>
      </details>

      {/* Filter Toolbar */}
      <form method="get" className="flex flex-wrap items-center gap-2 rounded-lg border border-border/80 bg-card p-3">
        <FilterSelect label="Stage" name="stage" options={QUESTION_STAGES} value={stage} />
        <FilterSelect label="Type" name="interview_type" options={INTERVIEW_TYPES} value={interviewType} />
        <FilterSelect label="Difficulty" name="difficulty" options={DIFFICULTIES} value={difficulty} />
        <FilterSelect label="Status" name="status" options={REVIEW_STATUSES} value={status} />
        <div className="flex items-center gap-2 pt-3 sm:pt-0">
          <button
            type="submit"
            className="inline-flex h-7 items-center rounded border border-border/80 bg-background px-3 font-body text-xs font-medium text-foreground hover:bg-muted"
          >
            Apply
          </button>
          {(stage || interviewType || difficulty || status) && (
            <Link href="/app/question-bank" className="font-body text-xs text-muted-foreground hover:text-foreground">
              Clear
            </Link>
          )}
        </div>
      </form>

      {/* Questions Data Table */}
      <div className="overflow-x-auto rounded-lg border border-border/80 bg-card">
        {error ? (
          <p className="p-5 font-body text-xs text-destructive">Couldn&apos;t load questions: {error.message}</p>
        ) : !questions || questions.length === 0 ? (
          <p className="p-8 text-center font-body text-xs text-muted-foreground">No questions match these filters.</p>
        ) : (
          <table className="w-full text-left font-body text-xs">
            <thead>
              <tr className="border-b border-border/60 text-muted-foreground">
                <th className="px-5 py-2.5 font-medium">Question</th>
                <th className="px-4 py-2.5 font-medium">Stage</th>
                <th className="px-4 py-2.5 font-medium">Type</th>
                <th className="px-4 py-2.5 font-medium">Difficulty</th>
                <th className="px-4 py-2.5 font-medium">Status</th>
                <th className="px-5 py-2.5 text-right font-medium">Action</th>
              </tr>
            </thead>
            <tbody>
              {(questions as QuestionBankRow[]).map((q) => (
                <tr
                  key={q.id}
                  className="border-b border-border/60 transition-colors last:border-0 hover:bg-muted/30"
                >
                  <td className="max-w-md px-5 py-3 font-medium text-foreground">
                    <Link href={`/app/question-bank/${q.id}`} className="hover:underline">
                      {q.question_text.length > 90 ? `${q.question_text.slice(0, 90)}…` : q.question_text}
                    </Link>
                  </td>
                  <td className="px-4 py-3 capitalize text-muted-foreground">{q.stage.replace(/_/g, " ")}</td>
                  <td className="px-4 py-3 capitalize text-muted-foreground">{q.interview_type}</td>
                  <td className="px-4 py-3 capitalize text-muted-foreground">{q.difficulty}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={q.status} />
                  </td>
                  <td className="px-5 py-3 text-right">
                    <StatusActions id={q.id} currentStatus={q.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function StatusActions({ id, currentStatus }: { id: string; currentStatus: string }) {
  return (
    <div className="flex justify-end gap-2">
      {currentStatus !== "reviewed" && (
        <form action={setQuestionStatus}>
          <input type="hidden" name="id" value={id} />
          <input type="hidden" name="status" value="reviewed" />
          <button type="submit" className="font-body text-xs font-medium text-foreground underline-offset-4 hover:underline">
            Approve
          </button>
        </form>
      )}
      {currentStatus !== "retired" && (
        <form action={setQuestionStatus}>
          <input type="hidden" name="id" value={id} />
          <input type="hidden" name="status" value="retired" />
          <button type="submit" className="font-body text-xs text-muted-foreground hover:underline">
            Retire
          </button>
        </form>
      )}
    </div>
  );
}

function Field({ label, name, placeholder }: { label: string; name: string; placeholder?: string }) {
  return (
    <div>
      <label htmlFor={name} className="block font-body text-xs font-medium text-foreground">
        {label}
      </label>
      <input
        id={name}
        name={name}
        placeholder={placeholder}
        className="mt-1 h-8 w-full rounded border border-border/80 bg-background px-3 font-body text-xs text-foreground outline-none focus:border-foreground/40 placeholder:text-muted-foreground/60"
      />
    </div>
  );
}

function SelectField({ label, name, options }: { label: string; name: string; options: readonly string[] }) {
  return (
    <div>
      <label htmlFor={name} className="block font-body text-xs font-medium text-foreground">
        {label}
      </label>
      <select
        id={name}
        name={name}
        className="mt-1 h-8 w-full rounded border border-border/80 bg-background px-2.5 font-body text-xs capitalize text-foreground outline-none focus:border-foreground/40"
      >
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {opt.replace(/_/g, " ")}
          </option>
        ))}
      </select>
    </div>
  );
}

function FilterSelect({
  label,
  name,
  options,
  value,
}: {
  label: string;
  name: string;
  options: readonly string[];
  value: string;
}) {
  return (
    <div>
      <select
        id={name}
        name={name}
        defaultValue={value}
        className="h-7 rounded border border-border/80 bg-background px-2 font-body text-xs capitalize text-foreground outline-none"
      >
        <option value="">{label}: All</option>
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {label}: {opt.replace(/_/g, " ")}
          </option>
        ))}
      </select>
    </div>
  );
}
