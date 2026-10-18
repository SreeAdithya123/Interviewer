import { cn } from "@/lib/utils";

type StatusTone = "neutral" | "live" | "active" | "warning" | "idle";

const DOT_TONE: Record<StatusTone, string> = {
  neutral: "bg-muted-foreground",
  live: "bg-destructive animate-pulse",
  active: "bg-emerald-500",
  warning: "bg-amber-500",
  idle: "bg-muted-foreground/50",
};

/** Small neutral capsule + one state dot, matching the app shell's light
 * design tokens (not the dark marketing `.bezel` theme). */
export function StatusPill({
  children,
  tone = "neutral",
  className,
}: {
  children: React.ReactNode;
  tone?: StatusTone;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 font-body text-xs font-medium text-foreground shadow-soft",
        className,
      )}
    >
      <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", DOT_TONE[tone])} />
      {children}
    </span>
  );
}

/**
 * Visible, honest marker that whatever is near it is stub/preview content
 * — a fake question-engine turn or a fixture-derived report — never a
 * real AI result. Used by the interview room and report page per the
 * scope boundary in docs/BUILD_SPEC.md / the Phase 1 provider-key block.
 */
export function PreviewBadge({ className }: { className?: string }) {
  return (
    <span
      title="This interview runs on a local fixture, not a real AI engine. Questions, transcripts and scores below are sample content, not a real evaluation."
      className={cn(
        "inline-flex items-center gap-2 rounded-full border border-amber-500/40 bg-amber-500/10 px-3 py-1 font-body text-xs font-medium text-amber-700",
        className,
      )}
    >
      <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" />
      Preview — not yet connected to the real engine
    </span>
  );
}

export function Card({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("rounded-3xl border border-border bg-card p-6 shadow-soft", className)}>
      {children}
    </div>
  );
}
