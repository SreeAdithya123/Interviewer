"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Camera, CameraOff, AlertTriangle, Eye, UserCheck, Users, ShieldAlert } from "lucide-react";
import type { ProctoringEventType } from "@/lib/proctoring/types";
import { compareFaceEmbeddings } from "@/lib/proctoring/faceVerification";

interface FaceProctorProps {
  enabled?: boolean;
  onVisualInfraction?: (type: ProctoringEventType, description: string) => void;
  className?: string;
  isCompact?: boolean;
  baselineEmbedding?: number[] | null;
}

type FaceStatus =
  | "verified"
  | "looking_away"
  | "no_face"
  | "multiple_faces"
  | "permission_denied"
  | "initializing"
  | "impersonation_suspected";

export function FaceProctor({
  enabled = true,
  onVisualInfraction,
  className = "",
  isCompact = false,
  baselineEmbedding,
}: FaceProctorProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [status, setStatus] = useState<FaceStatus>("initializing");
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);

  // Failure count tracking to prevent transient blinks from causing false positives
  const noFaceCountRef = useRef(0);
  const lookingAwayCountRef = useRef(0);
  const multiFaceCountRef = useRef(0);
  const impersonationCountRef = useRef(0);

  // Initialize webcam
  useEffect(() => {
    if (!enabled) return;

    let mounted = true;

    async function initCamera() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 320 },
            height: { ideal: 240 },
            facingMode: "user",
          },
          audio: false,
        });

        if (!mounted) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        streamRef.current = stream;
        setHasPermission(true);

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => {});
        }
        setStatus("verified");
      } catch (err) {
        if (!mounted) return;
        setHasPermission(false);
        setStatus("permission_denied");
      }
    }

    initCamera();

    return () => {
      mounted = false;
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
    };
  }, [enabled]);

  // Periodic frame analyzer (lightweight luminance and spatial bounding)
  const analyzeFrame = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.readyState !== 4) return;

    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;

    const width = 80;
    const height = 60;
    canvas.width = width;
    canvas.height = height;

    ctx.drawImage(video, 0, 0, width, height);

    try {
      const imgData = ctx.getImageData(0, 0, width, height);
      const data = imgData.data;

      let skinPixels = 0;
      let xSum = 0;
      let leftCluster = 0;
      let rightCluster = 0;

      // Color/luminance heuristics for facial area presence and horizontal center of mass
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];

        // Standard normalized RGB skin-tone / facial luminance filter
        const isSkinLike =
          r > 60 &&
          g > 40 &&
          b > 20 &&
          r > g &&
          r > b &&
          r - g > 15 &&
          Math.abs(r - g) > 15;

        if (isSkinLike) {
          skinPixels++;
          const pixelIndex = i / 4;
          const x = pixelIndex % width;
          xSum += x;

          if (x < width * 0.35) leftCluster++;
          if (x > width * 0.65) rightCluster++;
        }
      }

      const totalPixels = width * height;
      const skinRatio = skinPixels / totalPixels;

      // 1. Check if a person is in frame (at least 6% of pixels match face/head area)
      if (skinRatio < 0.05) {
        noFaceCountRef.current++;
        if (noFaceCountRef.current >= 3) {
          setStatus("no_face");
          if (noFaceCountRef.current === 3) {
            onVisualInfraction?.(
              "face_not_visible",
              "Candidate face not detected in webcam feed.",
            );
          }
        }
      } else {
        noFaceCountRef.current = 0;

        // 2. Check for multiple individuals (both far left and far right clusters active simultaneously)
        const bothSidesHigh = leftCluster > totalPixels * 0.08 && rightCluster > totalPixels * 0.08;
        if (bothSidesHigh) {
          multiFaceCountRef.current++;
          if (multiFaceCountRef.current >= 3) {
            setStatus("multiple_faces");
            if (multiFaceCountRef.current === 3) {
              onVisualInfraction?.(
                "multiple_faces_detected",
                "Multiple individuals detected in proctored camera frame.",
              );
            }
          }
        } else {
          multiFaceCountRef.current = 0;

          // 3. Check gaze / head pose direction (center of mass)
          const centerX = xSum / (skinPixels || 1);
          const normalizedOffset = Math.abs(centerX - width / 2) / (width / 2);

          if (normalizedOffset > 0.45) {
            lookingAwayCountRef.current++;
            if (lookingAwayCountRef.current >= 3) {
              setStatus("looking_away");
              if (lookingAwayCountRef.current === 3) {
                onVisualInfraction?.(
                  "looking_away",
                  "Candidate repeatedly looking away from the assessment screen.",
                );
              }
            }
          } else {
            lookingAwayCountRef.current = 0;

            // 4. Biometric identity check against baseline embedding
            if (baselineEmbedding && baselineEmbedding.length === 128) {
              const liveVector: number[] = [];
              const step = Math.max(1, Math.floor(data.length / (4 * 128)));
              for (let s = 0; s < 128; s++) {
                const idx = (s * step * 4) % data.length;
                const lum = (0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2]) / 255;
                liveVector.push(lum - 0.5);
              }
              let norm = 0;
              for (const v of liveVector) norm += v * v;
              const mag = Math.max(0.0001, Math.sqrt(norm));
              const sampleEmbedding = liveVector.map((v) => v / mag);

              const matchResult = compareFaceEmbeddings(baselineEmbedding, sampleEmbedding, 0.78);
              if (!matchResult.isMatch) {
                impersonationCountRef.current++;
                if (impersonationCountRef.current >= 4) {
                  setStatus("impersonation_suspected");
                  if (impersonationCountRef.current === 4) {
                    onVisualInfraction?.(
                      "impersonation_suspected",
                      `Candidate identity mismatch: Facial features deviate from registered baseline photo (${matchResult.similarityPct}% match).`,
                    );
                  }
                  return;
                }
              } else {
                impersonationCountRef.current = 0;
                setStatus("verified");
              }
            } else {
              setStatus("verified");
            }
          }
        }
      }
    } catch {
      // Ignored
    }
  }, [baselineEmbedding, onVisualInfraction]);

  // Run frame analysis every 1.5 seconds
  useEffect(() => {
    if (!enabled || !hasPermission) return;

    const interval = setInterval(() => {
      analyzeFrame();
    }, 1500);

    return () => clearInterval(interval);
  }, [enabled, hasPermission, analyzeFrame]);

  return (
    <div
      className={`relative overflow-hidden rounded-2xl border bg-zinc-950 shadow-soft transition-all ${
        status === "verified"
          ? "border-emerald-500/40"
          : status === "looking_away"
            ? "border-amber-500/50"
            : status === "impersonation_suspected"
              ? "border-destructive ring-2 ring-destructive/40 animate-pulse"
              : status === "no_face" || status === "multiple_faces"
                ? "border-destructive animate-pulse"
                : "border-border"
      } ${className}`}
    >
      {/* Hidden processing canvas */}
      <canvas ref={canvasRef} className="hidden" aria-hidden="true" />

      {/* Video Element */}
      {hasPermission ? (
        <video
          ref={videoRef}
          muted
          playsInline
          autoPlay
          className="h-full w-full object-cover -scale-x-100"
        />
      ) : (
        <div className="flex h-full w-full min-h-[90px] flex-col items-center justify-center bg-zinc-900/90 p-2 text-center">
          <CameraOff className="h-5 w-5 text-muted-foreground" />
          <span className="mt-1 font-body text-[10px] text-muted-foreground">
            {hasPermission === false ? "Camera Blocked" : "Starting camera..."}
          </span>
        </div>
      )}

      {/* Proctoring Status Pill Overlay */}
      <div className="absolute bottom-1.5 left-1.5 right-1.5 flex items-center justify-between rounded-lg bg-black/70 px-2 py-0.5 backdrop-blur-sm">
        <div className="flex items-center gap-1.5">
          {status === "verified" && (
            <>
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="font-body text-[10px] font-semibold text-emerald-400">
                AI Proctor Active
              </span>
            </>
          )}

          {status === "looking_away" && (
            <>
              <Eye className="h-3 w-3 text-amber-400" />
              <span className="font-body text-[10px] font-semibold text-amber-400">
                Gaze Warning
              </span>
            </>
          )}

          {status === "no_face" && (
            <>
              <AlertTriangle className="h-3 w-3 text-destructive" />
              <span className="font-body text-[10px] font-semibold text-destructive">
                No Face Visible
              </span>
            </>
          )}

          {status === "multiple_faces" && (
            <>
              <Users className="h-3 w-3 text-destructive" />
              <span className="font-body text-[10px] font-semibold text-destructive">
                Multi-Person Flag
              </span>
            </>
          )}

          {status === "impersonation_suspected" && (
            <>
              <ShieldAlert className="h-3 w-3 text-destructive animate-pulse" />
              <span className="font-body text-[10px] font-semibold text-destructive">
                Identity Mismatch
              </span>
            </>
          )}

          {status === "permission_denied" && (
            <>
              <CameraOff className="h-3 w-3 text-zinc-400" />
              <span className="font-body text-[10px] text-zinc-400">
                Audio/Screen Monitored
              </span>
            </>
          )}

          {status === "initializing" && (
            <span className="font-body text-[10px] text-zinc-400">Calibrating...</span>
          )}
        </div>

        <span className="font-mono text-[9px] text-zinc-400 uppercase tracking-wider">
          LIVE
        </span>
      </div>
    </div>
  );
}

export default FaceProctor;
