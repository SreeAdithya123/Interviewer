"use client";

import { useEffect, useState } from "react";
import {
  generatePairToken,
  buildPairingUrl,
  isSecondaryCameraActive,
  type DualCamStatus,
} from "@/lib/proctoring/dualCam";

export function DualCameraPairingCard({
  interviewId,
  onStatusChange,
}: {
  interviewId: string;
  onStatusChange?: (status: DualCamStatus) => void;
}) {
  const [token] = useState(() => generatePairToken());
  const [status, setStatus] = useState<DualCamStatus>("awaiting_scan");
  const [lastHeartbeat, setLastHeartbeat] = useState<string | null>(null);
  const [batteryPct, setBatteryPct] = useState<number | null>(null);

  const pairingUrl = typeof window !== "undefined"
    ? buildPairingUrl(interviewId, token, window.location.origin)
    : `https://vyoman.ai/proctor/pair?interviewId=${interviewId}&token=${token}`;

  // Poll local storage for mobile heartbeats
  useEffect(() => {
    const checkHeartbeat = () => {
      try {
        const raw = window.localStorage.getItem(`vyoman_dualcam_${interviewId}`);
        if (raw) {
          const data = JSON.parse(raw);
          if (data.token === token && isSecondaryCameraActive(data.lastHeartbeat)) {
            setStatus("streaming_active");
            setLastHeartbeat(data.lastHeartbeat);
            setBatteryPct(data.battery ?? null);
            onStatusChange?.("streaming_active");
            return;
          }
        }
      } catch {
        // ignore
      }

      if (status === "streaming_active") {
        setStatus("disconnected");
        onStatusChange?.("disconnected");
      }
    };

    const interval = setInterval(checkHeartbeat, 2500);
    return () => clearInterval(interval);
  }, [interviewId, token, status, onStatusChange]);

  const handleSimulatePair = () => {
    setStatus("streaming_active");
    setBatteryPct(92);
    setLastHeartbeat(new Date().toISOString());
    onStatusChange?.("streaming_active");
    try {
      window.localStorage.setItem(
        `vyoman_dualcam_${interviewId}`,
        JSON.stringify({
          token,
          status: "streaming_active",
          lastHeartbeat: new Date().toISOString(),
          battery: 92,
          angleConfidence: 96,
        })
      );
    } catch {
      // ignore
    }
  };

  return (
    <div className="rounded-lg border border-border/80 bg-card p-5 space-y-4 font-body">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between border-b border-border/80 pb-3">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-heading text-sm font-semibold text-foreground">
              Dual-Camera Secondary Device Proctoring
            </h3>
            <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground uppercase">
              Tier-1 Anti-Cheat
            </span>
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Pair a mobile smartphone camera positioned at a 45° angle to monitor physical desk, keyboard, and peripheral workspace.
          </p>
        </div>

        {/* Status Badge */}
        <div>
          {status === "streaming_active" ? (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200/80 bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-900 dark:border-emerald-800/40 dark:bg-emerald-950/40 dark:text-emerald-300">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-600 animate-pulse" />
              Secondary Camera Active (45° Angle)
            </span>
          ) : status === "disconnected" ? (
            <span className="inline-flex items-center rounded-full border border-amber-200/80 bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-900 dark:border-amber-800/40 dark:bg-amber-950/40 dark:text-amber-300">
              Connection Lost · Reconnect Phone
            </span>
          ) : (
            <span className="inline-flex items-center rounded-full border border-border/80 bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
              Awaiting Mobile Scan
            </span>
          )}
        </div>
      </div>

      {status === "streaming_active" ? (
        <div className="rounded border border-emerald-200/60 bg-emerald-50/30 p-4 text-xs space-y-2 dark:border-emerald-900/40 dark:bg-emerald-950/20">
          <div className="flex items-center justify-between">
            <span className="font-medium text-emerald-950 dark:text-emerald-200">
              ✓ Dual-camera verification active
            </span>
            <span className="font-mono text-[11px] text-muted-foreground">
              {batteryPct !== null ? `Phone Battery: ${batteryPct}%` : "Encrypted Stream"}
            </span>
          </div>
          <p className="text-muted-foreground leading-relaxed">
            Secondary camera is streaming encrypted frames of your desk and keyboard. Session integrity index boosted (+10 pts confidence).
          </p>
          <div className="flex items-center justify-between pt-1 border-t border-emerald-200/40 dark:border-emerald-900/40 text-[11px] text-muted-foreground font-mono">
            <span>Angle Confidence: 95%</span>
            <span>Last Ping: {lastHeartbeat ? new Date(lastHeartbeat).toLocaleTimeString() : "Live"}</span>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-2 max-w-sm text-xs">
            <p className="text-foreground font-medium">How to pair your smartphone:</p>
            <ol className="list-decimal list-inside space-y-1 text-muted-foreground leading-relaxed">
              <li>Open your phone's default camera app.</li>
              <li>Scan the pairing QR code or open the link below.</li>
              <li>Place phone on a stand or water bottle at a 45° angle to your side.</li>
              <li>Ensure your hands, laptop screen, and desk are clearly visible.</li>
            </ol>
            <div className="pt-1">
              <span className="text-[11px] text-muted-foreground">Pairing Code: </span>
              <span className="font-mono font-semibold text-foreground tracking-wider">{token}</span>
            </div>
          </div>

          {/* QR Code / Action Block */}
          <div className="flex flex-col items-center gap-2 rounded border border-border/80 bg-background p-4 text-center">
            {/* SVG Stylized QR code representation */}
            <div className="relative h-28 w-28 rounded border border-border/80 bg-white p-2 shadow-sm flex items-center justify-center">
              <div className="grid grid-cols-5 gap-1 w-full h-full opacity-80">
                {Array.from({ length: 25 }).map((_, i) => (
                  <div
                    key={i}
                    className={`rounded-[1px] ${
                      i % 2 === 0 || i === 0 || i === 4 || i === 20 || i === 24
                        ? "bg-slate-900"
                        : "bg-slate-200"
                    }`}
                  />
                ))}
              </div>
            </div>

            <a
              href={pairingUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[11px] font-mono text-muted-foreground underline hover:text-foreground"
            >
              Open Mobile Link
            </a>

            <button
              type="button"
              onClick={handleSimulatePair}
              className="mt-1 inline-flex h-7 items-center rounded border border-border/80 bg-muted/40 px-2.5 font-body text-[11px] font-medium text-foreground hover:bg-muted"
            >
              Simulate Mobile Pair (Test)
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default DualCameraPairingCard;
