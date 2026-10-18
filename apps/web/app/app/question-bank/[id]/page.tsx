import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth/current-profile";
import { requireRole } from "@/lib/auth/require-role";
import StatusBadge from "@/components/app-shell/StatusBadge";
import { createClient } from "@/lib/supabase/server";
import { DIFFICULTIES, INTERVIEW_TYPES, QUESTION_STAGES, type QuestionBankRow } from "@/lib/types/db";
import { deleteQuestion, setQuestionStatus, updateQuestion } from "../actions";

export const metadata: Metadata = {
  title: "Edit question",
};

export const dynamic = "force-dynamic";

export default async function QuestionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  requireRole(await getCurrentProfile(), ["platform_admin"]);
  const { id } = await params;

  const supabase = await createClient();
  const { data: question, error } = await supabase
    .from("question_bank")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!question) notFound();

  const q = question as QuestionBankRow;

  return (
    <div className="max-w-3xl">
      <Link href="/app/question-bank" className="font-body text-sm text-muted-foreground hover:text-foreground">
        ← Question bank
      </Link>

      <div className="mt-3 flex items-center gap-3">
        <h1 className="text-2xl font-semibold text-foreground">Edit question</h1>
        <StatusBadge status={q.status} />
      </div>

      <div className="mt-4 flex gap-2">
        {q.status !== "reviewed" && (
          <form action={setQuestionStatus}>
            <input type="hidden" name="id" value={q.id} />
            <input type="hidden" name="status" value="reviewed" />
            <button type="submit" className="rounded-xl bg-secondary/15 px-3 py-1.5 font-body text-xs font-medium text-secondary">
              Mark reviewed
            </button>
          </form>
        )}
        {q.status !== "draft" && (
          <form action={setQuestionStatus}>
            <input type="hidden" name="id" value={q.id} />
            <input type="hidden" name="status" value="draft" />
            <button type="submit" className="rounded-xl bg-muted px-3 py-1.5 font-body text-xs font-medium text-muted-foreground">
              Back to draft
            </button>
          </form>
        )}
        {q.status !== "retired" && (
          <form action={setQuestionStatus}>
            <input type="hidden" name="id" value={q.id} />
            <input type="hidden" name="status" value="retired" />
            <button type="submit" className="rounded-xl bg-muted px-3 py-1.5 font-body text-xs font-medium text-muted-foreground">
              Retire
            </button>
          </form>
        )}
      </div>

      {q.reviewed_at && (
        <p className="mt-2 font-body text-xs text-muted-foreground">
          Reviewed {new Date(q.reviewed_at).toLocaleString("en-IN")}
        </p>
      )}

      <form action={updateQuestion} className="mt-6 grid gap-4 rounded-3xl border border-border bg-card p-6 sm:grid-cols-2">
        <input type="hidden" name="id" value={q.id} />
        <SelectField label="Stage" name="stage" options={QUESTION_STAGES} defaultValue={q.stage} />
        <SelectField label="Interview type" name="interview_type" options={INTERVIEW_TYPES} defaultValue={q.interview_type} />
        <SelectField label="Difficulty" name="difficulty" options={DIFFICULTIES} defaultValue={q.difficulty} />
        <Field label="Company type" name="company_type" defaultValue={q.company_type ?? ""} />
        <Field label="Role" name="role" defaultValue={q.role ?? ""} />
        <Field label="Source" name="source" defaultValue={q.source ?? ""} />
        <div className="sm:col-span-2">
          <label htmlFor="question_text" className="font-body text-sm font-medium text-foreground">
            Question
          </label>
          <textarea
            id="question_text"
            name="question_text"
            required
            rows={3}
            defaultValue={q.question_text}
            className="mt-1.5 w-full rounded-2xl border border-input bg-background px-4 py-3 font-body text-sm text-foreground outline-none focus:border-primary"
          />
        </div>
        <div className="sm:col-span-2">
          <label htmlFor="ideal_answer_notes" className="font-body text-sm font-medium text-foreground">
            Ideal answer notes
          </label>
          <textarea
            id="ideal_answer_notes"
            name="ideal_answer_notes"
            rows={3}
            defaultValue={q.ideal_answer_notes ?? ""}
            className="mt-1.5 w-full rounded-2xl border border-input bg-background px-4 py-3 font-body text-sm text-foreground outline-none focus:border-primary"
          />
        </div>
        <Field label="Tags (comma-separated)" name="tags" defaultValue={q.tags.join(", ")} />
        <div className="flex items-end sm:col-span-2">
          <button type="submit" className="btn-primary">
            Save changes
          </button>
        </div>
      </form>

      <form action={deleteQuestion} className="mt-4">
        <input type="hidden" name="id" value={q.id} />
        <button type="submit" className="font-body text-sm text-destructive hover:underline">
          Delete question
        </button>
      </form>
    </div>
  );
}

function Field({ label, name, defaultValue }: { label: string; name: string; defaultValue?: string }) {
  return (
    <div>
      <label htmlFor={name} className="font-body text-sm font-medium text-foreground">
        {label}
      </label>
      <input
        id={name}
        name={name}
        defaultValue={defaultValue}
        className="mt-1.5 w-full rounded-2xl border border-input bg-background px-4 py-2.5 font-body text-sm text-foreground outline-none focus:border-primary"
      />
    </div>
  );
}

function SelectField({
  label,
  name,
  options,
  defaultValue,
}: {
  label: string;
  name: string;
  options: readonly string[];
  defaultValue: string;
}) {
  return (
    <div>
      <label htmlFor={name} className="font-body text-sm font-medium text-foreground">
        {label}
      </label>
      <select
        id={name}
        name={name}
        defaultValue={defaultValue}
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
