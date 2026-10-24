import { cn } from "@/lib/utils";

const TONE_CLASSES: Record<string, string> = {
  neutral: "bg-muted text-muted-foreground border-border/80",
  draft: "bg-muted text-muted-foreground border-border/80",
  pending: "bg-amber-50 text-amber-900 border-amber-200/60 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/40",
  reviewed: "bg-emerald-50 text-emerald-900 border-emerald-200/60 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/40",
  completed: "bg-emerald-50 text-emerald-900 border-emerald-200/60 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/40",
  accepted: "bg-emerald-50 text-emerald-900 border-emerald-200/60 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/40",
  active: "bg-emerald-50 text-emerald-900 border-emerald-200/60 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/40",
  retired: "bg-muted text-muted-foreground/80 border-border/60",
  revoked: "bg-rose-50 text-rose-900 border-rose-200/60 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800/40",
  expired: "bg-muted text-muted-foreground/80 border-border/60",
  failed: "bg-rose-50 text-rose-900 border-rose-200/60 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800/40",
  abandoned: "bg-muted text-muted-foreground border-border/80",
  in_progress: "bg-sky-50 text-sky-900 border-sky-200/60 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-800/40",
};

/**
 * Clean 20px status pill according to taste-skill guidelines:
 * Pale tints with dark text of the same hue, 1px subtle boundary, 11-12px font weight 500.
 */
export function StatusBadge({ status }: { status: string }) {
  const tone = TONE_CLASSES[status] ?? TONE_CLASSES.neutral;
  return (
    <span
      className={cn(
        "inline-flex items-center rounded px-2 py-0.5 font-body text-[11px] font-medium border leading-none capitalize",
        tone,
      )}
    >
      {status.replace(/_/g, " ")}
    </span>
  );
}

export default StatusBadge;
