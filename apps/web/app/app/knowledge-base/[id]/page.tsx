import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth/current-profile";
import { requireRole } from "@/lib/auth/require-role";
import StatusBadge from "@/components/app-shell/StatusBadge";
import { createClient } from "@/lib/supabase/server";
import { KB_CATEGORIES, type KbDocument } from "@/lib/types/db";
import { approveAndEmbedDocument, deleteDocument, setDocumentStatus, updateDocument } from "../actions";

export const metadata: Metadata = {
  title: "Edit document",
};

export const dynamic = "force-dynamic";

export default async function KbDocumentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  requireRole(await getCurrentProfile(), ["platform_admin"]);
  const { id } = await params;

  const supabase = await createClient();
  const { data: document, error } = await supabase
    .from("kb_documents")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!document) notFound();

  const doc = document as KbDocument;

  return (
    <div className="max-w-3xl">
      <Link href="/app/knowledge-base" className="font-body text-sm text-muted-foreground hover:text-foreground">
        ← Knowledge base
      </Link>

      <div className="mt-3 flex items-center gap-3">
        <h1 className="text-2xl font-semibold text-foreground">{doc.title}</h1>
        <StatusBadge status={doc.status} />
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {doc.status === "draft" && (
          <form action={approveAndEmbedDocument}>
            <input type="hidden" name="id" value={doc.id} />
            <button type="submit" className="rounded-xl bg-secondary/15 px-3 py-1.5 font-body text-xs font-medium text-secondary">
              Approve → chunk &amp; embed
            </button>
          </form>
        )}
        {doc.status !== "draft" && (
          <form action={setDocumentStatus}>
            <input type="hidden" name="id" value={doc.id} />
            <input type="hidden" name="status" value="draft" />
            <button type="submit" className="rounded-xl bg-muted px-3 py-1.5 font-body text-xs font-medium text-muted-foreground">
              Back to draft
            </button>
          </form>
        )}
        {doc.status !== "retired" && (
          <form action={setDocumentStatus}>
            <input type="hidden" name="id" value={doc.id} />
            <input type="hidden" name="status" value="retired" />
            <button type="submit" className="rounded-xl bg-muted px-3 py-1.5 font-body text-xs font-medium text-muted-foreground">
              Retire
            </button>
          </form>
        )}
      </div>

      {doc.status === "reviewed" && (
        <p className="mt-3 rounded-2xl bg-accent/10 px-4 py-2.5 font-body text-xs text-foreground">
          Preview — marked reviewed, but chunking &amp; embedding into kb_chunks is pending Phase 1
          (needs GEMINI_API_KEY). The prep assistant can&apos;t retrieve this document yet.
        </p>
      )}
      {doc.reviewed_at && (
        <p className="mt-2 font-body text-xs text-muted-foreground">
          Reviewed {new Date(doc.reviewed_at).toLocaleString("en-IN")}
        </p>
      )}

      <form action={updateDocument} className="mt-6 grid gap-4 rounded-3xl border border-border bg-card p-6 sm:grid-cols-2">
        <input type="hidden" name="id" value={doc.id} />
        <Field label="Title" name="title" defaultValue={doc.title} required />
        <SelectField label="Category" name="category" options={KB_CATEGORIES} defaultValue={doc.category ?? ""} />
        <Field label="Company name" name="company_name" defaultValue={doc.company_name ?? ""} />
        <Field label="Source URL" name="source_url" type="url" defaultValue={doc.source_url ?? ""} />
        <div className="sm:col-span-2">
          <label htmlFor="raw_text" className="font-body text-sm font-medium text-foreground">
            Body text
          </label>
          <textarea
            id="raw_text"
            name="raw_text"
            required
            rows={12}
            defaultValue={doc.raw_text}
            className="mt-1.5 w-full rounded-2xl border border-input bg-background px-4 py-3 font-body text-sm text-foreground outline-none focus:border-primary"
          />
        </div>
        <div className="sm:col-span-2">
          <button type="submit" className="btn-primary">
            Save changes
          </button>
        </div>
      </form>

      <form action={deleteDocument} className="mt-4">
        <input type="hidden" name="id" value={doc.id} />
        <button type="submit" className="font-body text-sm text-destructive hover:underline">
          Delete document
        </button>
      </form>
    </div>
  );
}

function Field({
  label,
  name,
  type = "text",
  required = false,
  defaultValue,
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  defaultValue?: string;
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
        <option value="">Uncategorized</option>
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {opt.replace(/_/g, " ")}
          </option>
        ))}
      </select>
    </div>
  );
}
