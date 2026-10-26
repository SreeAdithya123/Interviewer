"use client";

import { useState } from "react";
import { Map } from "lucide-react";
import dynamic from "next/dynamic";

const PlatformTour = dynamic(
  () => import("@/components/app-shell/PlatformTour").then((m) => m.PlatformTour),
  { ssr: false }
);

interface TourTriggerProps {
  /** Compact mode: icon-only button for collapsed sidebar / small spaces */
  compact?: boolean;
  className?: string;
}

export function TourTrigger({ compact = false, className = "" }: TourTriggerProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        id="platform-tour-trigger"
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Open platform tour"
        title="Platform Tour — learn every feature"
        className={`inline-flex items-center gap-2 rounded-lg border border-border/60 bg-muted/40 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
          compact ? "h-8 w-8 justify-center p-0" : "h-8 px-3 text-xs font-medium"
        } ${className}`}
      >
        <Map className="h-3.5 w-3.5 shrink-0" />
        {!compact && <span>Platform Tour</span>}
      </button>

      {open && <PlatformTour isOpen={open} onClose={() => setOpen(false)} />}
    </>
  );
}

export default TourTrigger;
