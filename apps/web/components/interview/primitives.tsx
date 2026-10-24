import { cn } from "@/lib/utils";

type StatusTone = "neutral" | "live" | "active" | "warning" | "idle";

const DOT_TONE: Record<StatusTone, string> = {
  neutral: "bg-muted-foreground",
  live: "bg-rose-500 animate-pulse",
  active: "bg-emerald-600",
  warning: "bg-amber-500",
  idle: "bg-muted-foreground/50",
};

/** Small neutral pill + one state dot, matching taste-skill design tokens */
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
        "inline-flex items-center gap-1.5 rounded border border-border/80 bg-background px-2.5 py-1 font-body text-xs font-medium text-foreground",
        className,
      )}
    >
      <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", DOT_TONE[tone])} />
      {children}
    </span>
  );
}

/**
 * Visible marker that content is preview/calibration stub
 */
export function PreviewBadge({ className }: { className?: string }) {
  return (
    <span
      title="This interview runs on a benchmark fixture, not a real AI engine."
      className={cn(
        "inline-flex items-center gap-1.5 rounded border border-amber-200/60 bg-amber-50 px-2.5 py-0.5 font-body text-xs font-medium text-amber-900 dark:border-amber-800/40 dark:bg-amber-950/30 dark:text-amber-300",
        className,
      )}
    >
      <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" />
      Preview mode
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
    <div className={cn("rounded-lg border border-border/80 bg-card p-5", className)}>
      {children}
    </div>
  );
}
