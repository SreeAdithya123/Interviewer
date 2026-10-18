"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Download, Save, Star } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { normalizeResumeData } from "@/lib/resume/empty";
import { downloadResumePdf } from "@/lib/resume/pdf";
import { RESUME_TEMPLATES, isResumeTemplateId, type ResumeData, type ResumeRow, type ResumeTemplateId } from "@/lib/resume/types";
import ResumeForm from "./ResumeForm";
import ResumePreview from "./ResumePreview";

export function ResumeBuilderClient({ userId, initialResume }: { userId: string; initialResume: ResumeRow | null }) {
  const router = useRouter();
  const [resumeId, setResumeId] = useState<string | null>(initialResume?.id ?? null);
  const [title, setTitle] = useState(initialResume?.title ?? "My Resume");
  const [template, setTemplate] = useState<ResumeTemplateId>(
    initialResume && isResumeTemplateId(initialResume.template) ? initialResume.template : "minimal-professional",
  );
  const [data, setData] = useState<ResumeData>(normalizeResumeData(initialResume?.data));
  const [isPrimary, setIsPrimary] = useState(initialResume?.is_primary ?? false);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  function update(updater: (d: ResumeData) => ResumeData) {
    setData((prev) => updater(prev));
    setStatus("idle");
  }

  async function handleSave() {
    setStatus("saving");
    setError(null);
    const supabase = createClient();

    try {
      if (isPrimary) {
        let unsetQuery = supabase.from("resumes").update({ is_primary: false }).eq("user_id", userId).eq("is_primary", true);
        if (resumeId) unsetQuery = unsetQuery.neq("id", resumeId);
        const { error: unsetError } = await unsetQuery;
        if (unsetError) throw unsetError;
      }

      if (resumeId) {
        const { error: updateError } = await supabase
          .from("resumes")
          .update({ title, template, data, is_primary: isPrimary })
          .eq("id", resumeId);
        if (updateError) throw updateError;
      } else {
        const { data: inserted, error: insertError } = await supabase
          .from("resumes")
          .insert({ user_id: userId, title, template, data, is_primary: isPrimary })
          .select("id")
          .single();
        if (insertError) throw insertError;
        setResumeId(inserted.id as string);
        router.replace(`/app/resume/builder?id=${inserted.id}`);
      }

      setStatus("saved");
      router.refresh();
    } catch (e) {
      setStatus("error");
      setError(e instanceof Error ? e.message : "Something went wrong while saving.");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <Link href="/app/resume" className="font-body text-xs font-medium text-muted-foreground hover:text-foreground">
            &larr; Back to resumes
          </Link>
          <h1 className="mt-1 font-headline text-2xl text-foreground">{resumeId ? "Edit resume" : "New resume"}</h1>
        </div>

        <div className="flex items-center gap-2">
          {status === "saved" && <span className="font-body text-xs text-primary">Saved</span>}
          {status === "error" && error && <span className="font-body text-xs text-destructive">{error}</span>}
          <button
            type="button"
            onClick={handleSave}
            disabled={status === "saving"}
            className="btn-primary flex items-center gap-1.5 px-5 py-2.5 text-sm disabled:opacity-60"
          >
            <Save className="h-4 w-4" strokeWidth={1.75} />
            {status === "saving" ? "Saving..." : "Save"}
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-end gap-4 rounded-3xl border border-border bg-card p-5 shadow-soft">
        <label className="block">
          <span className="font-body text-xs font-medium text-muted-foreground">Resume title</span>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="mt-1 w-56 rounded-xl border border-input bg-background px-3 py-2 font-body text-sm text-foreground outline-none focus:border-primary"
          />
        </label>

        <div>
          <span className="font-body text-xs font-medium text-muted-foreground">Template</span>
          <div className="mt-1 flex gap-2">
            {RESUME_TEMPLATES.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTemplate(t.id)}
                title={t.description}
                className={`rounded-full border px-3 py-2 font-body text-xs font-medium transition-colors ${
                  template === t.id ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:bg-muted"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <label className="flex items-center gap-2 pb-2">
          <input type="checkbox" checked={isPrimary} onChange={(e) => setIsPrimary(e.target.checked)} className="h-4 w-4 accent-[color:hsl(var(--primary))]" />
          <span className="flex items-center gap-1 font-body text-xs font-medium text-foreground">
            <Star className="h-3.5 w-3.5" strokeWidth={1.75} /> Set as primary resume
          </span>
        </label>

        <div className="ml-auto flex gap-2 pb-0.5">
          {RESUME_TEMPLATES.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => downloadResumePdf(data, t.id, title)}
              className="flex items-center gap-1.5 rounded-full border border-border px-3 py-2 font-body text-xs font-medium text-foreground transition-colors hover:bg-muted"
            >
              <Download className="h-3.5 w-3.5" strokeWidth={1.75} /> PDF ({t.label})
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_420px]">
        <ResumeForm data={data} update={update} />
        <div className="lg:sticky lg:top-6 lg:self-start">
          <p className="mb-2 font-body text-xs font-medium uppercase tracking-wide text-muted-foreground">Live preview</p>
          <div className="overflow-hidden rounded-2xl border border-border shadow-ambient-lg">
            <ResumePreview data={data} templateId={template} />
          </div>
        </div>
      </div>
    </div>
  );
}

export default ResumeBuilderClient;
