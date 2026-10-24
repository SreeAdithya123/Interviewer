import type { Metadata } from "next";
import Link from "next/link";
import { getCurrentProfile } from "@/lib/auth/current-profile";
import { requireRole } from "@/lib/auth/require-role";
import StatusBadge from "@/components/app-shell/StatusBadge";
import { createClient } from "@/lib/supabase/server";
import { KB_CATEGORIES, type KbDocument } from "@/lib/types/db";
import { createDocument, setDocumentStatus } from "./actions";

export const metadata: Metadata = {
  title: "Knowledge base",
};

export const dynamic = "force-dynamic";

export default async function KnowledgeBasePage() {
  requireRole(await getCurrentProfile(), ["platform_admin"]);

  const supabase = await createClient();
  const { data: documents, error } = await supabase
    .from("kb_documents")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(200);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="font-headline text-2xl font-semibold tracking-tight text-foreground">
          Knowledge Base
        </h1>
        <p className="mt-1 font-body text-sm text-muted-foreground">
          Senior interview archives, company hiring patterns, topic resources and placement prep documentation.
        </p>
      </div>

      <div className="rounded-md border border-amber-200/70 bg-amber-50 px-4 py-3 font-body text-xs text-amber-900 dark:border-amber-800/40 dark:bg-amber-950/30 dark:text-amber-300">
        Preview mode — chunking and vector embeddings run through Gemini embedding pipelines. Published documents are indexed for the student prep assistant.
      </div>

      {/* Add Document Expandable Form */}
      <details className="rounded-lg border border-border/80 bg-card open:pb-5">
        <summary className="cursor-pointer list-none px-5 py-3.5 font-body text-xs font-medium text-foreground hover:bg-muted/40">
          + Add a new knowledge base document
        </summary>
        <form action={createDocument} className="grid gap-3.5 px-5 pt-2 sm:grid-cols-2">
          <Field label="Document title *" name="title" required placeholder="How Google SDE-1 rounds work" />
          <SelectField label="Category" name="category" options={KB_CATEGORIES} includeBlank />
          <Field label="Company name (optional)" name="company_name" placeholder="Google, Microsoft, Amazon" />
          <Field label="Source URL (optional)" name="source_url" type="url" placeholder="https://..." />
          <div className="sm:col-span-2">
            <label htmlFor="raw_text" className="block font-body text-xs font-medium text-foreground">
              Document body text *
            </label>
            <textarea
              id="raw_text"
              name="raw_text"
              required
              rows={6}
              className="mt-1 w-full rounded border border-border/80 bg-background p-2.5 font-body text-xs text-foreground outline-none focus:border-foreground/40 resize-none"
            />
          </div>
          <div className="sm:col-span-2 pt-1">
            <button
              type="submit"
              className="inline-flex h-8 items-center rounded bg-foreground px-3.5 font-body text-xs font-medium text-background hover:bg-foreground/90"
            >
              Create document (as draft)
            </button>
          </div>
        </form>
      </details>

      {/* Documents Table */}
      <div className="overflow-x-auto rounded-lg border border-border/80 bg-card">
        {error ? (
          <p className="p-5 font-body text-xs text-destructive">Couldn&apos;t load documents: {error.message}</p>
        ) : !documents || documents.length === 0 ? (
          <p className="p-8 text-center font-body text-xs text-muted-foreground">No documents added yet. Add the first document above.</p>
        ) : (
          <table className="w-full text-left font-body text-xs">
            <thead>
              <tr className="border-b border-border/60 text-muted-foreground">
                <th className="px-5 py-2.5 font-medium">Document</th>
                <th className="px-4 py-2.5 font-medium">Category</th>
                <th className="px-4 py-2.5 font-medium">Status</th>
                <th className="px-5 py-2.5 text-right font-medium">Action</th>
              </tr>
            </thead>
            <tbody>
              {(documents as KbDocument[]).map((doc) => (
                <tr
                  key={doc.id}
                  className="border-b border-border/60 transition-colors last:border-0 hover:bg-muted/30"
                >
                  <td className="px-5 py-3">
                    <Link href={`/app/knowledge-base/${doc.id}`} className="font-medium text-foreground hover:underline">
                      {doc.title}
                    </Link>
                    {doc.company_name && (
                      <p className="text-[11px] text-muted-foreground">{doc.company_name}</p>
                    )}
                  </td>
                  <td className="px-4 py-3 capitalize text-muted-foreground">
                    {doc.category ? doc.category.replace(/_/g, " ") : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={doc.status} />
                  </td>
                  <td className="px-5 py-3 text-right">
                    {doc.status !== "retired" && (
                      <form action={setDocumentStatus} className="inline">
                        <input type="hidden" name="id" value={doc.id} />
                        <input type="hidden" name="status" value="retired" />
                        <button type="submit" className="font-body text-xs text-muted-foreground hover:text-foreground underline-offset-4 hover:underline">
                          Retire
                        </button>
                      </form>
                    )}
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

function Field({
  label,
  name,
  type = "text",
  required = false,
  placeholder,
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  placeholder?: string;
}) {
  return (
    <div>
      <label htmlFor={name} className="block font-body text-xs font-medium text-foreground">
        {label}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        required={required}
        placeholder={placeholder}
        className="mt-1 h-8 w-full rounded border border-border/80 bg-background px-3 font-body text-xs text-foreground outline-none focus:border-foreground/40 placeholder:text-muted-foreground/60"
      />
    </div>
  );
}

function SelectField({
  label,
  name,
  options,
  includeBlank = false,
}: {
  label: string;
  name: string;
  options: readonly string[];
  includeBlank?: boolean;
}) {
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
        {includeBlank && <option value="">Uncategorized</option>}
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {opt.replace(/_/g, " ")}
          </option>
        ))}
      </select>
    </div>
  );
}
