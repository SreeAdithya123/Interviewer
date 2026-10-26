"use client";

import { useEffect, useState } from "react";
import { Map, X, Sparkles } from "lucide-react";
import dynamic from "next/dynamic";

const PlatformTour = dynamic(
  () => import("@/components/app-shell/PlatformTour").then((m) => m.PlatformTour),
  { ssr: false }
);

const DISMISSED_KEY = "vyoman_tour_banner_dismissed";
const COMPLETED_KEY = "vyoman_tour_completed";

/**
 * A dismissible top-of-dashboard banner that invites new students to take
 * the platform tour. Auto-hides once dismissed or completed.
 */
export function TourBanner() {
  const [visible, setVisible] = useState(false);
  const [tourOpen, setTourOpen] = useState(false);

  useEffect(() => {
    const dismissed = localStorage.getItem(DISMISSED_KEY) === "true";
    const completed = localStorage.getItem(COMPLETED_KEY) === "true";
    if (!dismissed && !completed) setVisible(true);
  }, []);

  function dismiss() {
    localStorage.setItem(DISMISSED_KEY, "true");
    setVisible(false);
  }

  function openTour() {
    setTourOpen(true);
  }

  function closeTour() {
    localStorage.setItem(COMPLETED_KEY, "true");
    setTourOpen(false);
    setVisible(false);
  }

  if (!visible && !tourOpen) return null;

  return (
    <>
      {visible && (
        <div
          id="tour-banner"
          className="relative flex items-center justify-between gap-4 rounded-xl border border-violet-200/60 bg-violet-50 px-4 py-3 dark:border-violet-800/40 dark:bg-violet-950/30 animate-fade-in"
          role="banner"
        >
          {/* Left: Icon + Copy */}
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-violet-100 dark:bg-violet-900/60">
              <Sparkles className="h-4 w-4 text-violet-600 dark:text-violet-400" />
            </div>
            <div className="min-w-0">
              <p className="font-body text-sm font-semibold text-violet-900 dark:text-violet-200">
                Welcome to Vyoman — take a 2-minute tour
              </p>
              <p className="font-body text-xs text-violet-700/70 dark:text-violet-300/70 truncate">
                Learn how to use every feature: mock interviews, blueprints, resume, drives, AI coach and more.
              </p>
            </div>
          </div>

          {/* Right: CTA + dismiss */}
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              id="tour-banner-start"
              onClick={openTour}
              className="inline-flex items-center gap-1.5 rounded-lg bg-violet-600 px-3 py-1.5 font-body text-xs font-medium text-white transition-colors hover:bg-violet-700"
            >
              <Map className="h-3.5 w-3.5" />
              Start tour
            </button>
            <button
              type="button"
              onClick={dismiss}
              aria-label="Dismiss tour banner"
              className="rounded-lg p-1.5 text-violet-500 transition-colors hover:bg-violet-100 hover:text-violet-700 dark:hover:bg-violet-900/50"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}

      {tourOpen && (
        <PlatformTour isOpen={tourOpen} onClose={closeTour} />
      )}
    </>
  );
}

export default TourBanner;
