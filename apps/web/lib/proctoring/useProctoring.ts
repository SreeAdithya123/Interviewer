"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ProctoringEvent, ProctoringEventType, ProctoringSummary } from "./types";
import { calculateProctoringSummary } from "./calculator";

interface UseProctoringOptions {
  enabled?: boolean;
  interviewStartTime?: number; // timestamp in ms
  onEventRecorded?: (event: ProctoringEvent) => void;
  maxWarningsBeforeFlag?: number;
}

export function useProctoring({
  enabled = true,
  interviewStartTime,
  onEventRecorded,
  maxWarningsBeforeFlag = 3,
}: UseProctoringOptions = {}) {
  const [events, setEvents] = useState<ProctoringEvent[]>([]);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [activeWarning, setActiveWarning] = useState<ProctoringEvent | null>(null);
  const [warningCount, setWarningCount] = useState(0);

  const startMsRef = useRef<number>(interviewStartTime ?? Date.now());
  const eventsRef = useRef<ProctoringEvent[]>([]);
  eventsRef.current = events;

  // Record an integrity event with timestamp and severity
  const recordEvent = useCallback(
    (type: ProctoringEventType, label: string, description: string, severity: "low" | "medium" | "high" = "medium", metadata?: Record<string, unknown>) => {
      if (!enabled) return;

      const now = Date.now();
      const elapsedSeconds = Math.max(0, Math.round((now - startMsRef.current) / 1000));

      const newEvent: ProctoringEvent = {
        id: `evt-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        timestampSeconds: elapsedSeconds,
        isoTimestamp: new Date().toISOString(),
        type,
        severity,
        label,
        description,
        metadata,
      };

      setEvents((prev) => [...prev, newEvent]);
      onEventRecorded?.(newEvent);

      // Trigger warning banner for focus/screen/clipboard violations
      if (severity === "high" || type === "tab_switched" || type === "fullscreen_exit" || type === "code_pasted") {
        setActiveWarning(newEvent);
        setWarningCount((c) => c + 1);
      }
    },
    [enabled, onEventRecorded],
  );

  const dismissWarning = useCallback(() => {
    setActiveWarning(null);
  }, []);

  // Request Fullscreen
  const requestFullscreen = useCallback(async () => {
    try {
      if (document.documentElement.requestFullscreen) {
        await document.documentElement.requestFullscreen();
      }
    } catch {
      // Browser permissions or user gesture restriction
    }
  }, []);

  // Exit Fullscreen
  const exitFullscreen = useCallback(async () => {
    try {
      if (document.fullscreenElement && document.exitFullscreen) {
        await document.exitFullscreen();
      }
    } catch {
      // Ignored
    }
  }, []);

  // Fullscreen change listener
  useEffect(() => {
    if (!enabled) return;

    function handleFullscreenChange() {
      const isNowFullscreen = !!document.fullscreenElement;
      setIsFullscreen(isNowFullscreen);

      if (!isNowFullscreen && isFullscreen) {
        recordEvent(
          "fullscreen_exit",
          "Fullscreen Mode Exited",
          "Candidate exited proctored fullscreen mode.",
          "high",
        );
      }
    }

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, [enabled, isFullscreen, recordEvent]);

  // Tab switch & window blur listeners
  useEffect(() => {
    if (!enabled) return;

    let wasHidden = false;

    function handleVisibilityChange() {
      if (document.visibilityState === "hidden") {
        wasHidden = true;
        recordEvent(
          "tab_switched",
          "Tab Switched / Screen Hidden",
          "Candidate switched to another browser tab or minimized window.",
          "high",
        );
      } else {
        wasHidden = false;
      }
    }

    function handleWindowBlur() {
      if (!wasHidden && document.visibilityState !== "hidden") {
        recordEvent(
          "window_blur",
          "Window Lost Focus",
          "Candidate clicked away from the assessment window.",
          "medium",
        );
      }
    }

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("blur", handleWindowBlur);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("blur", handleWindowBlur);
    };
  }, [enabled, recordEvent]);

  // Keyboard shortcut & DevTools monitor
  useEffect(() => {
    if (!enabled) return;

    function handleKeyDown(e: KeyboardEvent) {
      // F12 or Inspect shortcuts (Ctrl+Shift+I / Cmd+Option+I)
      const isDevTools =
        e.key === "F12" ||
        ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === "I" || e.key === "i" || e.key === "J" || e.key === "j")) ||
        ((e.ctrlKey || e.metaKey) && (e.key === "u" || e.key === "U"));

      if (isDevTools) {
        e.preventDefault();
        recordEvent(
          "devtools_opened",
          "Developer Tools Intercepted",
          "Candidate attempted to open browser developer tools or source view.",
          "high",
        );
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [enabled, recordEvent]);

  // Context menu (right click) prevention in proctored session
  const handleContextMenu = useCallback(
    (e: React.MouseEvent) => {
      if (!enabled) return;
      e.preventDefault();
      recordEvent(
        "context_menu_blocked",
        "Context Menu Blocked",
        "Candidate attempted to right-click inside the proctored assessment.",
        "low",
      );
    },
    [enabled, recordEvent],
  );

  // Paste detection in code editor or text input
  const handlePasteEvent = useCallback(
    (pastedText: string) => {
      if (!enabled) return;
      if (pastedText.length > 50) {
        recordEvent(
          "code_pasted",
          "External Code Snippet Pasted",
          `Candidate pasted ${pastedText.length} characters of code into the editor.`,
          "high",
          { charCount: pastedText.length },
        );
      }
    },
    [enabled, recordEvent],
  );

  // Generate final summary
  const getFinalSummary = useCallback((): ProctoringSummary => {
    const startedIso = new Date(startMsRef.current).toISOString();
    const endedIso = new Date().toISOString();
    const durationSeconds = Math.max(0, Math.round((Date.now() - startMsRef.current) / 1000));
    return calculateProctoringSummary(eventsRef.current, startedIso, endedIso, durationSeconds);
  }, []);

  return {
    events,
    isFullscreen,
    activeWarning,
    warningCount,
    maxWarningsBeforeFlag,
    requestFullscreen,
    exitFullscreen,
    recordEvent,
    dismissWarning,
    handleContextMenu,
    handlePasteEvent,
    getFinalSummary,
  };
}
