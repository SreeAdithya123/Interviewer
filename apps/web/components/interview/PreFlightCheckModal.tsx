"use client";

import { useEffect, useRef, useState } from "react";
import {
  detectDisplaySetup,
  INITIAL_SYSTEM_CHECK_STATUS,
  inspectCameraDevices,
  isPreFlightReadyToStart,
  measureInternetLatency,
  type SystemCheckStatus,
} from "@/lib/proctoring/systemCheck";

interface PreFlightCheckModalProps {
  interviewRole?: string;
  onAllPassedAndStart: (stream: MediaStream, isExternalCamera: boolean) => void;
}

export function PreFlightCheckModal({
  interviewRole = "Campus Placement Assessment",
  onAllPassedAndStart,
}: PreFlightCheckModalProps) {
  const [status, setStatus] = useState<SystemCheckStatus>(INITIAL_SYSTEM_CHECK_STATUS);
  const [activeStream, setActiveStream] = useState<MediaStream | null>(null);
  const [audioLevel, setAudioLevel] = useState<number>(0);
  const [isStarting, setIsStarting] = useState(false);

  const videoPreviewRef = useRef<HTMLVideoElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // 1. Initial Auto-checks on mount (Internet, Display, Devices)
  useEffect(() => {
    let unmounted = false;

    async function runAutoChecks() {
      // Check 1: Internet
      setStatus((prev) => ({
        ...prev,
        internet: { ...prev.internet, status: "checking", message: "Pinging server..." },
      }));
      const net = await measureInternetLatency();
      if (!unmounted) {
        setStatus((prev) => ({
          ...prev,
          internet: {
            status: net.passed ? "passed" : "failed",
            latencyMs: net.latencyMs,
            isOnline: net.isOnline,
            message: net.message,
          },
        }));
      }

      // Check 2: Display & Secondary Monitors
      setStatus((prev) => ({
        ...prev,
        display: { ...prev.display, status: "checking", message: "Scanning display configuration..." },
      }));
      const disp = await detectDisplaySetup();
      if (!unmounted) {
        setStatus((prev) => ({
          ...prev,
          display: {
            status: disp.passed ? "passed" : "failed",
            hasExternalDisplay: disp.hasExternalDisplay,
            screenCount: disp.screenCount,
            message: disp.message,
          },
        }));
      }

      // Check 3 & 4: Camera & Microphone getUserMedia Stream
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: "user" },
          audio: true,
        });

        if (unmounted) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        setActiveStream(stream);
        if (videoPreviewRef.current) {
          videoPreviewRef.current.srcObject = stream;
        }

        const camInfo = await inspectCameraDevices();
        const audioTracks = stream.getAudioTracks();
        const micName = audioTracks[0]?.label || "Default Microphone";

        setStatus((prev) => ({
          ...prev,
          camera: {
            status: "passed",
            hasPermission: true,
            isExternal: camInfo.isExternal,
            deviceName: camInfo.deviceName,
            devicesCount: camInfo.devicesCount,
            message: camInfo.isExternal
              ? "External camera verified."
              : "Integrated camera active.",
          },
          microphone: {
            status: "passed",
            hasPermission: true,
            deviceName: micName,
            audioDetected: true,
            audioLevelPct: 15,
            message: "Microphone stream connected.",
          },
        }));

        // Set up AudioContext VU Meter
        try {
          const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
          const ctx = new AudioCtx();
          audioContextRef.current = ctx;
          const analyser = ctx.createAnalyser();
          analyser.fftSize = 256;
          analyserRef.current = analyser;

          const source = ctx.createMediaStreamSource(stream);
          source.connect(analyser);

          const dataArray = new Uint8Array(analyser.frequencyBinCount);
          const updateAudioLevel = () => {
            if (!analyserRef.current) return;
            analyserRef.current.getByteFrequencyData(dataArray);
            let sum = 0;
            for (let i = 0; i < dataArray.length; i++) {
              sum += dataArray[i];
            }
            const avg = sum / dataArray.length;
            const pct = Math.min(100, Math.round((avg / 128) * 100));
            setAudioLevel(pct);
            animationFrameRef.current = requestAnimationFrame(updateAudioLevel);
          };
          updateAudioLevel();
        } catch {
          // AudioContext fallback
        }
      } catch (err) {
        if (!unmounted) {
          const errMsg = err instanceof Error ? err.message : "Access denied";
          setStatus((prev) => ({
            ...prev,
            camera: {
              ...prev.camera,
              status: "failed",
              message: `Camera error: ${errMsg}. Please allow camera access in browser permissions.`,
            },
            microphone: {
              ...prev.microphone,
              status: "failed",
              message: `Microphone error: ${errMsg}. Please allow microphone access in browser permissions.`,
            },
          }));
        }
      }
    }

    runAutoChecks();

    return () => {
      unmounted = true;
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (audioContextRef.current) {
        audioContextRef.current.close().catch(() => {});
      }
    };
  }, []);

  const handleRetestInternet = async () => {
    setStatus((prev) => ({
      ...prev,
      internet: { ...prev.internet, status: "checking", message: "Pinging server..." },
    }));
    const net = await measureInternetLatency();
    setStatus((prev) => ({
      ...prev,
      internet: {
        status: net.passed ? "passed" : "failed",
        latencyMs: net.latencyMs,
        isOnline: net.isOnline,
        message: net.message,
      },
    }));
  };

  const handleRetestDisplay = async () => {
    setStatus((prev) => ({
      ...prev,
      display: { ...prev.display, status: "checking", message: "Scanning displays..." },
    }));
    const disp = await detectDisplaySetup();
    setStatus((prev) => ({
      ...prev,
      display: {
        status: disp.passed ? "passed" : "failed",
        hasExternalDisplay: disp.hasExternalDisplay,
        screenCount: disp.screenCount,
        message: disp.message,
      },
    }));
  };

  const handleToggleLockscreenAck = (checked: boolean) => {
    setStatus((prev) => ({
      ...prev,
      lockscreen: {
        ...prev.lockscreen,
        status: checked ? "passed" : "pending",
        acknowledged: checked,
        message: checked ? "Lockdown mode acknowledged." : "Acknowledgement required.",
      },
    }));
  };

  const { canStart, failingChecks } = isPreFlightReadyToStart(status);

  const handleStartInterview = async () => {
    if (!canStart || !activeStream) return;
    setIsStarting(true);

    try {
      // Trigger Fullscreen
      if (document.documentElement.requestFullscreen) {
        await document.documentElement.requestFullscreen();
      }
    } catch {
      // Browser gesture allowance
    }

    onAllPassedAndStart(activeStream, status.camera.isExternal);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
      <div className="relative w-full max-w-2xl rounded-lg border border-border/80 bg-card p-6 shadow-2xl font-body space-y-5 max-h-[92vh] overflow-y-auto">
        {/* Title row */}
        <div className="flex flex-col gap-1 border-b border-border/80 pb-3">
          <div className="flex items-center justify-between">
            <span className="rounded bg-muted px-2 py-0.5 font-mono text-[10px] font-medium uppercase text-muted-foreground">
              Pre-Flight Integrity Gate
            </span>
            <span className="text-xs font-mono text-muted-foreground">{interviewRole}</span>
          </div>
          <h2 className="font-heading text-lg font-semibold text-foreground">
            System, Display & Hardware Verification
          </h2>
          <p className="text-xs text-muted-foreground">
            All system, network, and proctoring prerequisites must pass before the assessment begins.
          </p>
        </div>

        {/* 4-Item Verification Grid */}
        <div className="grid gap-3 sm:grid-cols-2">
          {/* Check 1: Internet Stability */}
          <div className="rounded border border-border/80 bg-background/50 p-3.5 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-foreground">1. Network & Ping</span>
              {status.internet.status === "passed" ? (
                <span className="rounded bg-emerald-50 px-1.5 py-0.5 font-mono text-[10px] font-medium text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
                  ✓ Passed
                </span>
              ) : status.internet.status === "checking" ? (
                <span className="font-mono text-[10px] text-muted-foreground">Pinging...</span>
              ) : (
                <span className="rounded bg-rose-50 px-1.5 py-0.5 font-mono text-[10px] font-medium text-rose-800 dark:bg-rose-950/40 dark:text-rose-300">
                  ✕ Failed
                </span>
              )}
            </div>
            <p className="text-[11px] text-muted-foreground leading-relaxed">{status.internet.message}</p>
            <div className="flex justify-end pt-0.5">
              <button
                type="button"
                onClick={handleRetestInternet}
                className="text-[10px] font-mono text-muted-foreground underline hover:text-foreground"
              >
                Retest ping
              </button>
            </div>
          </div>

          {/* Check 2: Display & External Monitor */}
          <div className="rounded border border-border/80 bg-background/50 p-3.5 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-foreground">2. Display Integrity</span>
              {status.display.status === "passed" ? (
                <span className="rounded bg-emerald-50 px-1.5 py-0.5 font-mono text-[10px] font-medium text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
                  ✓ Single Display
                </span>
              ) : (
                <span className="rounded bg-rose-50 px-1.5 py-0.5 font-mono text-[10px] font-medium text-rose-800 dark:bg-rose-950/40 dark:text-rose-300">
                  ✕ Multi-Screen Alert
                </span>
              )}
            </div>
            <p className="text-[11px] text-muted-foreground leading-relaxed">{status.display.message}</p>
            <div className="flex justify-end pt-0.5">
              <button
                type="button"
                onClick={handleRetestDisplay}
                className="text-[10px] font-mono text-muted-foreground underline hover:text-foreground"
              >
                Re-scan displays
              </button>
            </div>
          </div>

          {/* Check 3: Webcam & Video Stream Preview */}
          <div className="rounded border border-border/80 bg-background/50 p-3.5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-foreground">3. Camera Stream</span>
              {status.camera.status === "passed" ? (
                <span className="rounded bg-emerald-50 px-1.5 py-0.5 font-mono text-[10px] font-medium text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
                  ✓ Live Video
                </span>
              ) : (
                <span className="rounded bg-rose-50 px-1.5 py-0.5 font-mono text-[10px] font-medium text-rose-800 dark:bg-rose-950/40 dark:text-rose-300">
                  ✕ Cam Offline
                </span>
              )}
            </div>
            {/* Live Video Preview Box */}
            <div className="relative aspect-[4/3] w-full overflow-hidden rounded border border-border/80 bg-black flex items-center justify-center">
              <video
                ref={videoPreviewRef}
                autoPlay
                playsInline
                muted
                className="h-full w-full object-cover scale-x-[-1]"
              />
              <div className="pointer-events-none absolute inset-0 border border-dashed border-white/20 rounded m-2 flex items-center justify-center">
                <span className="text-[10px] font-mono text-white/50 bg-black/40 px-1.5 py-0.5 rounded backdrop-blur">
                  Position Face Centered
                </span>
              </div>
            </div>
            <p className="text-[10px] font-mono text-muted-foreground truncate">{status.camera.deviceName || "Webcam"}</p>
          </div>

          {/* Check 4: Microphone & Live VU Meter */}
          <div className="rounded border border-border/80 bg-background/50 p-3.5 space-y-2 flex flex-col justify-between">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-foreground">4. Audio Microphone</span>
                {status.microphone.status === "passed" ? (
                  <span className="rounded bg-emerald-50 px-1.5 py-0.5 font-mono text-[10px] font-medium text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
                    ✓ Mic Active
                  </span>
                ) : (
                  <span className="rounded bg-rose-50 px-1.5 py-0.5 font-mono text-[10px] font-medium text-rose-800 dark:bg-rose-950/40 dark:text-rose-300">
                    ✕ Mic Offline
                  </span>
                )}
              </div>
              <p className="text-[11px] text-muted-foreground">
                Speak aloud to test audio levels. The green meter should respond to your voice:
              </p>
            </div>

            {/* Live VU Meter */}
            <div className="space-y-1 pt-2">
              <div className="flex items-center justify-between text-[10px] font-mono text-muted-foreground">
                <span>Mic Input Level:</span>
                <span>{audioLevel}%</span>
              </div>
              <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                <div
                  className={`h-full transition-all duration-75 rounded-full ${
                    audioLevel > 10 ? "bg-emerald-500" : "bg-muted-foreground/30"
                  }`}
                  style={{ width: `${Math.max(5, audioLevel)}%` }}
                />
              </div>
              <p className="text-[10px] font-mono text-muted-foreground truncate pt-1">
                {status.microphone.deviceName || "Microphone"}
              </p>
            </div>
          </div>
        </div>

        {/* Lock Screen Mode Acknowledgement */}
        <div className="rounded border border-border/80 bg-muted/20 p-3.5 space-y-2 text-xs">
          <label className="flex items-start gap-2.5 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={status.lockscreen.acknowledged}
              onChange={(e) => handleToggleLockscreenAck(e.target.checked)}
              className="mt-0.5 rounded border-border/80 text-foreground focus:ring-0"
            />
            <div className="space-y-0.5">
              <span className="font-medium text-foreground">
                I acknowledge and enable Secure Lockdown Fullscreen Mode
              </span>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                The interview will lock into full-screen. Exiting full-screen, switching browser tabs, opening developer tools, or pasting external code triggers instant proctor integrity infractions.
              </p>
            </div>
          </label>
        </div>

        {/* Unmet Checklist warnings */}
        {!canStart && (
          <div className="rounded border border-amber-200/80 bg-amber-50/60 p-3 text-xs text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-300">
            <p className="font-medium">Complete all required checks before launching:</p>
            <ul className="mt-1 list-inside list-disc space-y-0.5 text-[11px] opacity-90">
              {failingChecks.map((check, i) => (
                <li key={i}>{check}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Action Gate Button */}
        <div className="flex items-center justify-end gap-3 border-t border-border/80 pt-3">
          <button
            type="button"
            onClick={handleStartInterview}
            disabled={!canStart || isStarting}
            className="inline-flex h-9 items-center justify-center rounded bg-foreground px-5 text-xs font-medium text-background hover:bg-foreground/90 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
          >
            {isStarting ? "Entering Lockdown Mode..." : "Enter Lockdown & Start Interview"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default PreFlightCheckModal;
