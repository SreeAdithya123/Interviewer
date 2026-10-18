import { cn } from "@/lib/utils";

const TONE_CLASSES: Record<string, string> = {
  neutral: "bg-muted text-muted-foreground",
  draft: "bg-muted text-muted-foreground",
  pending: "bg-muted text-muted-foreground",
  reviewed: "bg-secondary/15 text-secondary",
  completed: "bg-secondary/15 text-secondary",
  accepted: "bg-secondary/15 text-secondary",
  active: "bg-secondary/15 text-secondary",
  retired: "bg-border text-muted-foreground",
  revoked: "bg-destructive/10 text-destructive",
  expired: "bg-destructive/10 text-destructive",
  failed: "bg-destructive/10 text-destructive",
  abandoned: "bg-destructive/10 text-destructive",
  in_progress: "bg-primary/10 text-primary",
};

/** Small status pill for review-workflow / lifecycle columns (draft/reviewed/retired, pending/completed, ...). */
export function StatusBadge({ status }: { status: string }) {
  const tone = TONE_CLASSES[status] ?? TONE_CLASSES.neutral;
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-1 font-body text-xs font-medium capitalize",
        tone,
      )}
    >
      {status.replace(/_/g, " ")}
    </span>
  );
}

export default StatusBadge;
