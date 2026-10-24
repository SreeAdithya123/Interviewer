"use client";

import { useEffect, useState } from "react";
import type { VoiceStreamingState } from "@/lib/voice/types";

export function StreamingVoiceIndicator({
  state = "listening",
  measuredLatencyMs = 680,
  onToggleBargeIn,
}: {
  state?: VoiceStreamingState;
  measuredLatencyMs?: number;
  onToggleBargeIn?: (enabled: boolean) => void;
}) {
  const [bargeInEnabled, setBargeInEnabled] = useState(true);
  const [waveHeight, setWaveHeight] = useState<number[]>([40, 65, 85, 50, 70]);

  // Animate audio wave when candidate or AI is speaking
  useEffect(() => {
    if (state !== "candidate_speaking" && state !== "ai_speaking") return;
    const interval = setInterval(() => {
      setWaveHeight([
        Math.floor(Math.random() * 60) + 30,
        Math.floor(Math.random() * 70) + 25,
        Math.floor(Math.random() * 80) + 20,
        Math.floor(Math.random() * 60) + 35,
        Math.floor(Math.random() * 75) + 25,
      ]);
    }, 150);
    return () => clearInterval(interval);
  }, [state]);

  const handleBargeInChange = (checked: boolean) => {
    setBargeInEnabled(checked);
    onToggleBargeIn?.(checked);
  };

  return (
    <div className="rounded-lg border border-border/80 bg-card p-4 space-y-3 font-body">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-border/80 pb-2.5">
        <div className="flex items-center gap-2">
          <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          <h4 className="font-heading text-xs font-semibold text-foreground">
            Full-Duplex Real-Time Voice Engine
          </h4>
          <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground uppercase">
            Sarvam Bulbul + Groq
          </span>
        </div>

        {/* Turnaround Latency Metric */}
        <div className="flex items-center gap-1.5">
          <span className="inline-flex items-center gap-1 rounded border border-emerald-200/80 bg-emerald-50 px-2 py-0.5 font-mono text-[11px] font-medium text-emerald-950 dark:border-emerald-800/40 dark:bg-emerald-950/40 dark:text-emerald-300">
            ⚡ {measuredLatencyMs}ms Turnaround
          </span>
          <span className="text-[10px] text-muted-foreground">(&lt;800ms SLA)</span>
        </div>
      </div>

      {/* State & Waveform Monitor */}
      <div className="flex items-center justify-between rounded border border-border/80 bg-background/50 px-3 py-2 text-xs">
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground">Live Voice Pipeline:</span>
          {state === "listening" && (
            <span className="font-medium text-foreground">Listening for candidate speech...</span>
          )}
          {state === "candidate_speaking" && (
            <span className="font-medium text-emerald-800 dark:text-emerald-300">
              Candidate Speaking (Streaming Audio Slices)
            </span>
          )}
          {state === "ai_thinking" && (
            <span className="font-medium text-amber-800 dark:text-amber-300">
              Pipelining First Sentence Audio...
            </span>
          )}
          {state === "ai_speaking" && (
            <span className="font-medium text-blue-800 dark:text-blue-300">
              AI Interviewer Speaking (Sentence Pipelined)
            </span>
          )}
          {state === "interrupted" && (
            <span className="font-medium text-rose-800 dark:text-rose-300">
              Candidate Barged In · AI Yielded Instantly
            </span>
          )}
        </div>

        {/* Audio Waveform Bars */}
        <div className="flex items-center gap-1 h-5">
          {waveHeight.map((h, i) => (
            <div
              key={i}
              className={`w-1 rounded-full transition-all duration-150 ${
                state === "candidate_speaking"
                  ? "bg-emerald-500"
                  : state === "ai_speaking"
                  ? "bg-blue-500"
                  : "bg-muted"
              }`}
              style={{
                height:
                  state === "candidate_speaking" || state === "ai_speaking" ? `${h}%` : "20%",
              }}
            />
          ))}
        </div>
      </div>

      {/* Controls & Telemetry Footer */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-[11px] text-muted-foreground">
        <label className="flex items-center gap-1.5 cursor-pointer select-none text-foreground font-medium">
          <input
            type="checkbox"
            checked={bargeInEnabled}
            onChange={(e) => handleBargeInChange(e.target.checked)}
            className="rounded border-border/80"
          />
          <span>Natural Voice Interruption (Barge-In)</span>
        </label>
        <span className="font-mono text-[10px]">
          Timeslice: 250ms · Sub-clause Pipelining: Active
        </span>
      </div>
    </div>
  );
}

export default StreamingVoiceIndicator;
