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
    <div className="max-w-6xl">
      <h1 className="text-2xl font-semibold text-foreground">Question bank</h1>
      <p className="mt-1 font-body text-sm text-muted-foreground">
        Only <strong className="text-foreground">reviewed</strong> questions are used when the
        engine builds an interview plan (docs/BUILD_SPEC.md Part 4.8).
      </p>

      <details className="mt-6 rounded-3xl border border-border bg-card open:pb-6">
        <summary className="cursor-pointer list-none px-6 py-4 font-body text-sm font-medium text-primary">
          + Add a question
        </summary>
        <form action={createQuestion} className="grid gap-4 px-6 sm:grid-cols-2">
          <SelectField label="Stage" name="stage" options={QUESTION_STAGES} />
          <SelectField label="Interview type" name="interview_type" options={INTERVIEW_TYPES} />
          <SelectField label="Difficulty" name="difficulty" options={DIFFICULTIES} />
          <Field label="Company type (optional)" name="company_type" placeholder="product, service, startup..." />
          <Field label="Role (optional)" name="role" placeholder="SDE, data analyst..." />
          <Field label="Source (optional)" name="source" placeholder="internal, glassdoor..." />
          <div className="sm:col-span-2">
            <label htmlFor="question_text" className="font-body text-sm font-medium text-foreground">
              Question
            </label>
            <textarea
              id="question_text"
              name="question_text"
              required
              rows={3}
              className="mt-1.5 w-full rounded-2xl border border-input bg-background px-4 py-3 font-body text-sm text-foreground outline-none focus:border-primary"
            />
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="ideal_answer_notes" className="font-body text-sm font-medium text-foreground">
              Ideal answer notes (optional)
            </label>
            <textarea
              id="ideal_answer_notes"
              name="ideal_answer_notes"
              rows={2}
              className="mt-1.5 w-full rounded-2xl border border-input bg-background px-4 py-3 font-body text-sm text-foreground outline-none focus:border-primary"
            />
          </div>
          <Field label="Tags (comma-separated)" name="tags" placeholder="arrays, sql, leadership" />
          <div className="flex items-end sm:col-span-2">
            <button type="submit" className="btn-primary">
              Create question (as draft)
            </button>
          </div>
        </form>
      </details>

      <form method="get" className="mt-6 flex flex-wrap items-end gap-3 rounded-3xl border border-border bg-card p-4">
        <FilterSelect label="Stage" name="stage" options={QUESTION_STAGES} value={stage} />
        <FilterSelect label="Type" name="interview_type" options={INTERVIEW_TYPES} value={interviewType} />
        <FilterSelect label="Difficulty" name="difficulty" options={DIFFICULTIES} value={difficulty} />
        <FilterSelect label="Status" name="status" options={REVIEW_STATUSES} value={status} />
        <button type="submit" className="rounded-xl bg-primary/10 px-4 py-2 font-body text-sm font-medium text-primary">
          Filter
        </button>
        {(stage || interviewType || difficulty || status) && (
          <Link href="/app/question-bank" className="font-body text-sm text-muted-foreground hover:underline">
            Clear filters
          </Link>
        )}
      </form>

      <div className="mt-6 overflow-x-auto rounded-3xl border border-border bg-card">
        {error ? (
          <p className="p-6 font-body text-sm text-destructive">Couldn&apos;t load questions: {error.message}</p>
        ) : !questions || questions.length === 0 ? (
          <p className="p-6 font-body text-sm text-muted-foreground">No questions match these filters.</p>
        ) : (
          <table className="w-full text-left font-body text-sm">
            <thead>
              <tr className="border-b border-border text-xs uppercase tracking-label text-muted-foreground">
                <th className="px-6 py-3 font-medium">Question</th>
                <th className="px-6 py-3 font-medium">Stage</th>
                <th className="px-6 py-3 font-medium">Type</th>
                <th className="px-6 py-3 font-medium">Difficulty</th>
                <th className="px-6 py-3 font-medium">Status</th>
                <th className="px-6 py-3 font-medium" />
              </tr>
            </thead>
            <tbody>
              {(questions as QuestionBankRow[]).map((q) => (
                <tr key={q.id} className="border-b border-border last:border-0">
                  <td className="max-w-md px-6 py-4 text-foreground">
                    <Link href={`/app/question-bank/${q.id}`} className="hover:underline">
                      {q.question_text.length > 90 ? `${q.question_text.slice(0, 90)}…` : q.question_text}
                    </Link>
                  </td>
                  <td className="px-6 py-4 capitalize text-muted-foreground">{q.stage.replace(/_/g, " ")}</td>
                  <td className="px-6 py-4 capitalize text-muted-foreground">{q.interview_type}</td>
                  <td className="px-6 py-4 capitalize text-muted-foreground">{q.difficulty}</td>
                  <td className="px-6 py-4">
                    <StatusBadge status={q.status} />
                  </td>
                  <td className="px-6 py-4 text-right">
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
          <button type="submit" className="font-body text-xs font-medium text-secondary hover:underline">
            Mark reviewed
          </button>
        </form>
      )}
      {currentStatus !== "retired" && (
        <form action={setQuestionStatus}>
          <input type="hidden" name="id" value={id} />
          <input type="hidden" name="status" value="retired" />
          <button type="submit" className="font-body text-xs font-medium text-muted-foreground hover:underline">
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
      <label htmlFor={name} className="font-body text-sm font-medium text-foreground">
        {label}
      </label>
      <input
        id={name}
        name={name}
        placeholder={placeholder}
        className="mt-1.5 w-full rounded-2xl border border-input bg-background px-4 py-2.5 font-body text-sm text-foreground outline-none focus:border-primary"
      />
    </div>
  );
}

function SelectField({ label, name, options }: { label: string; name: string; options: readonly string[] }) {
  return (
    <div>
      <label htmlFor={name} className="font-body text-sm font-medium text-foreground">
        {label}
      </label>
      <select
        id={name}
        name={name}
        className="mt-1.5 w-full rounded-2xl border border-input bg-background px-4 py-2.5 font-body text-sm capitalize text-foreground outline-none focus:border-primary"
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
      <label htmlFor={name} className="block font-body text-xs text-muted-foreground">
        {label}
      </label>
      <select
        id={name}
        name={name}
        defaultValue={value}
        className="mt-1 w-40 rounded-xl border border-input bg-background px-3 py-2 font-body text-sm capitalize text-foreground outline-none focus:border-primary"
      >
        <option value="">All</option>
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {opt.replace(/_/g, " ")}
          </option>
        ))}
      </select>
    </div>
  );
}
