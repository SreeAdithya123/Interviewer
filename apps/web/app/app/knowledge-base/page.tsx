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
    <div className="max-w-6xl">
      <h1 className="text-2xl font-semibold text-foreground">Knowledge base</h1>
      <p className="mt-1 font-body text-sm text-muted-foreground">
        Senior interview experiences, company-wise patterns, topic resources and placement info —
        the prep assistant retrieves only from documents that have been chunked & embedded.
      </p>
      <p className="mt-2 rounded-2xl bg-accent/10 px-4 py-2.5 font-body text-xs text-foreground">
        Preview — chunking &amp; embedding is pending Phase 1 (needs GEMINI_API_KEY). Approving a
        document here marks it reviewed for real, but creates no kb_chunks yet, so the prep
        assistant can&apos;t retrieve it until the real pipeline runs.
      </p>

      <details className="mt-6 rounded-3xl border border-border bg-card open:pb-6">
        <summary className="cursor-pointer list-none px-6 py-4 font-body text-sm font-medium text-primary">
          + Add a document
        </summary>
        <form action={createDocument} className="grid gap-4 px-6 sm:grid-cols-2">
          <Field label="Title" name="title" required placeholder="How X Corp's SDE-1 interview actually goes" />
          <SelectField label="Category" name="category" options={KB_CATEGORIES} includeBlank />
          <Field label="Company name (optional)" name="company_name" />
          <Field label="Source URL (optional)" name="source_url" type="url" />
          <div className="sm:col-span-2">
            <label htmlFor="raw_text" className="font-body text-sm font-medium text-foreground">
              Body text
            </label>
            <textarea
              id="raw_text"
              name="raw_text"
              required
              rows={8}
              className="mt-1.5 w-full rounded-2xl border border-input bg-background px-4 py-3 font-body text-sm text-foreground outline-none focus:border-primary"
            />
          </div>
          <div className="sm:col-span-2">
            <button type="submit" className="btn-primary">
              Create document (as draft)
            </button>
          </div>
        </form>
      </details>

      <div className="mt-6 overflow-x-auto rounded-3xl border border-border bg-card">
        {error ? (
          <p className="p-6 font-body text-sm text-destructive">Couldn&apos;t load documents: {error.message}</p>
        ) : !documents || documents.length === 0 ? (
          <p className="p-6 font-body text-sm text-muted-foreground">No documents yet. Add the first one above.</p>
        ) : (
          <table className="w-full text-left font-body text-sm">
            <thead>
              <tr className="border-b border-border text-xs uppercase tracking-label text-muted-foreground">
                <th className="px-6 py-3 font-medium">Title</th>
                <th className="px-6 py-3 font-medium">Category</th>
                <th className="px-6 py-3 font-medium">Status</th>
                <th className="px-6 py-3 font-medium" />
              </tr>
            </thead>
            <tbody>
              {(documents as KbDocument[]).map((doc) => (
                <tr key={doc.id} className="border-b border-border last:border-0">
                  <td className="px-6 py-4 text-foreground">
                    <Link href={`/app/knowledge-base/${doc.id}`} className="hover:underline">
                      {doc.title}
                    </Link>
                    {doc.company_name && (
                      <div className="font-body text-xs text-muted-foreground">{doc.company_name}</div>
                    )}
                  </td>
                  <td className="px-6 py-4 capitalize text-muted-foreground">
                    {doc.category ? doc.category.replace(/_/g, " ") : "—"}
                  </td>
                  <td className="px-6 py-4">
                    <StatusBadge status={doc.status} />
                  </td>
                  <td className="px-6 py-4 text-right">
                    {doc.status !== "retired" && (
                      <form action={setDocumentStatus} className="inline">
                        <input type="hidden" name="id" value={doc.id} />
                        <input type="hidden" name="status" value="retired" />
                        <button type="submit" className="font-body text-xs text-muted-foreground hover:underline">
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
      <label htmlFor={name} className="font-body text-sm font-medium text-foreground">
        {label}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        required={required}
        placeholder={placeholder}
        className="mt-1.5 w-full rounded-2xl border border-input bg-background px-4 py-2.5 font-body text-sm text-foreground outline-none focus:border-primary"
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
      <label htmlFor={name} className="font-body text-sm font-medium text-foreground">
        {label}
      </label>
      <select
        id={name}
        name={name}
        className="mt-1.5 w-full rounded-2xl border border-input bg-background px-4 py-2.5 font-body text-sm capitalize text-foreground outline-none focus:border-primary"
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
