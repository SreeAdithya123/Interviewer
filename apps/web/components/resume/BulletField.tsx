"use client";

import { useState } from "react";
import { Sparkles, Check, X, Trash2 } from "lucide-react";
import { rewriteBullet, applyMetricAnswer, type RewriteResult } from "@/lib/ai-stubs/rewrite-bullet";

/**
 * One editable resume bullet (an experience/project "highlight") with an
 * inline "Rewrite with AI" action. Per docs/BUILD_SPEC.md Part 4.3, the
 * rewrite must never invent a number — the stub in lib/ai-stubs/rewrite-bullet.ts
 * asks a specific follow-up question instead when the bullet has none, and
 * this component collects that answer before showing a rewrite.
 */
export function BulletField({
  value,
  onChange,
  onRemove,
  placeholder,
}: {
  value: string;
  onChange: (next: string) => void;
  onRemove: () => void;
  placeholder?: string;
}) {
  const [status, setStatus] = useState<"idle" | "loading">("idle");
  const [result, setResult] = useState<RewriteResult | null>(null);
  const [metricAnswer, setMetricAnswer] = useState("");

  async function handleRewrite() {
    setStatus("loading");
    setResult(null);
    const r = await rewriteBullet(value);
    setResult(r);
    setStatus("idle");
  }

  async function handleMetricSubmit() {
    if (!metricAnswer.trim()) return;
    setStatus("loading");
    const r = await applyMetricAnswer(value, metricAnswer);
    setResult(r);
    setStatus("idle");
  }

  function accept() {
    if (result?.kind === "rewritten") {
      onChange(result.text.replace(/\s*\[Preview rewrite.*?\]\s*$/, ""));
    }
    setResult(null);
    setMetricAnswer("");
  }

  function reject() {
    setResult(null);
    setMetricAnswer("");
  }

  return (
    <div className="space-y-2">
      <div className="flex items-start gap-2">
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder ?? "Describe what you did and the result, e.g. Reduced page load time by 40%."}
          rows={2}
          className="flex-1 resize-none rounded-xl border border-input bg-background px-3 py-2 font-body text-sm text-foreground outline-none transition-colors focus:border-primary"
        />
        <div className="flex flex-col gap-1">
          <button
            type="button"
            onClick={handleRewrite}
            disabled={status === "loading" || !value.trim()}
            title="Rewrite with AI (preview)"
            className="rounded-lg border border-border bg-card p-2 text-primary transition-colors hover:bg-primary/10 disabled:opacity-50"
          >
            <Sparkles className="h-4 w-4" strokeWidth={1.75} />
          </button>
          <button
            type="button"
            onClick={onRemove}
            title="Remove bullet"
            className="rounded-lg border border-border bg-card p-2 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
          >
            <Trash2 className="h-4 w-4" strokeWidth={1.75} />
          </button>
        </div>
      </div>

      {status === "loading" && (
        <p className="font-body text-xs text-muted-foreground">Thinking of a rewrite&hellip;</p>
      )}

      {result && result.kind === "needs_metric" && (
        <div className="rounded-xl border border-dashed border-primary/40 bg-primary/5 p-3">
          <p className="font-body text-xs text-foreground">{result.question}</p>
          <div className="mt-2 flex gap-2">
            <input
              value={metricAnswer}
              onChange={(e) => setMetricAnswer(e.target.value)}
              placeholder="e.g. 500 users, 2 hours, 30%"
              className="flex-1 rounded-lg border border-input bg-background px-3 py-1.5 font-body text-xs text-foreground outline-none focus:border-primary"
            />
            <button
              type="button"
              onClick={handleMetricSubmit}
              disabled={!metricAnswer.trim()}
              className="rounded-lg bg-primary px-3 py-1.5 font-body text-xs font-medium text-primary-foreground disabled:opacity-50"
            >
              Use it
            </button>
          </div>
        </div>
      )}

      {result && result.kind === "rewritten" && (
        <div className="rounded-xl border border-primary/30 bg-primary/5 p-3">
          <div className="mb-1 flex items-center gap-1.5">
            <span className="rounded-full bg-accent/15 px-2 py-0.5 font-body text-[10px] font-semibold uppercase tracking-wide text-accent">
              Preview &mdash; not yet connected to the real engine
            </span>
          </div>
          <p className="font-body text-sm text-foreground">{result.text}</p>
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              onClick={accept}
              className="flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 font-body text-xs font-medium text-primary-foreground"
            >
              <Check className="h-3.5 w-3.5" strokeWidth={2} /> Accept
            </button>
            <button
              type="button"
              onClick={reject}
              className="flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 font-body text-xs font-medium text-muted-foreground"
            >
              <X className="h-3.5 w-3.5" strokeWidth={2} /> Dismiss
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default BulletField;
