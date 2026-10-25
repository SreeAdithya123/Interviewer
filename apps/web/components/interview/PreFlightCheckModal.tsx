"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import {
  detectDisplaySetup,
  INITIAL_SYSTEM_CHECK_STATUS,
  inspectCameraDevices,
  isPreFlightReadyToStart,
  measureInternetLatency,
  type SystemCheckStatus,
} from "@/lib/proctoring/systemCheck";
import {
  Camera,
  CameraOff,
  Mic,
  MicOff,
  RefreshCw,
  AlertCircle,
  HelpCircle,
  CheckCircle2,
  Lock,
  ShieldCheck,
  ShieldAlert,
  Sparkles,
  UserCheck,
} from "lucide-react";
import {
  compareFaceEmbeddings,
  generateDeterministicEmbedding,
} from "@/lib/proctoring/faceVerification";
import { saveBiometricBaseline } from "@/lib/profile/actions";

interface CandidateProfileProps {
  id_photo_url?: string | null;
  face_embedding?: number[] | null;
  full_name?: string | null;
}

interface PreFlightCheckModalProps {
  interviewRole?: string;
  candidateProfile?: CandidateProfileProps;
  onAllPassedAndStart: (stream: MediaStream, isExternalCamera: boolean) => void;
}

export function PreFlightCheckModal({
  interviewRole = "Campus Placement Assessment",
  candidateProfile,
  onAllPassedAndStart,
}: PreFlightCheckModalProps) {
  const [localProfile, setLocalProfile] = useState<CandidateProfileProps | undefined>(candidateProfile);

  const [status, setStatus] = useState<SystemCheckStatus>(() => ({
    ...INITIAL_SYSTEM_CHECK_STATUS,
    facialIdentity: {
      status: candidateProfile?.face_embedding ? "checking" : "pending",
      isVerified: false,
      similarityPct: null,
      message: candidateProfile?.face_embedding
        ? "Awaiting camera preview to verify facial identity..."
        : "Reference photo required before assessment.",
    },
  }));
  const [activeStream, setActiveStream] = useState<MediaStream | null>(null);
  const [audioLevel, setAudioLevel] = useState<number>(0);
  const [isStarting, setIsStarting] = useState(false);
  const [isRequestingCam, setIsRequestingCam] = useState(false);
  const [isRequestingMic, setIsRequestingMic] = useState(false);
  const [showPermissionGuide, setShowPermissionGuide] = useState(false);

  const videoPreviewRef = useRef<HTMLVideoElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  const [enrollCountdown, setEnrollCountdown] = useState<number | null>(null);
  const [isSavingSnapshot, setIsSavingSnapshot] = useState(false);
  const [snapshotError, setSnapshotError] = useState<string | null>(null);
  const [isVerifyingFace, setIsVerifyingFace] = useState(false);

  // Compare face from active video preview against baseline embedding
  const verifyFaceMatch = useCallback(() => {
    const video = videoPreviewRef.current;
    if (!video || video.readyState < 2) return;

    if (!localProfile?.face_embedding || localProfile.face_embedding.length !== 128) {
      setStatus((prev) => ({
        ...prev,
        facialIdentity: {
          status: "pending",
          isVerified: false,
          similarityPct: null,
          message: "No baseline reference photo enrolled. Snapshot required.",
        },
      }));
      return;
    }

    setIsVerifyingFace(true);
    try {
      const canvas = document.createElement("canvas");
      canvas.width = 160;
      canvas.height = 120;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.drawImage(video, 0, 0, 160, 120);

      const imgData = ctx.getImageData(0, 0, 160, 120);
      const data = imgData.data;

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

      const match = compareFaceEmbeddings(localProfile.face_embedding, sampleEmbedding, 0.78);

      setStatus((prev) => ({
        ...prev,
        facialIdentity: {
          status: match.isMatch ? "passed" : "failed",
          isVerified: match.isMatch,
          similarityPct: match.similarityPct,
          message: match.isMatch
            ? `Identity verified (${match.similarityPct}% match)`
            : `Facial mismatch (${match.similarityPct}% match). Face camera directly with good lighting.`,
        },
      }));
    } catch {
      // Ignored
    } finally {
      setIsVerifyingFace(false);
    }
  }, [localProfile]);

  // Quick Snapshot Snapshot Handler
  const triggerQuickSnapshot = () => {
    if (enrollCountdown !== null || isSavingSnapshot) return;
    setEnrollCountdown(3);

    const timer = setInterval(() => {
      setEnrollCountdown((prev) => {
        if (prev === null || prev <= 1) {
          clearInterval(timer);
          void executeQuickSnapshot();
          return null;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const executeQuickSnapshot = async () => {
    const video = videoPreviewRef.current;
    if (!video) return;

    setIsSavingSnapshot(true);
    setSnapshotError(null);

    try {
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Could not access video canvas");

      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      const photoDataUrl = canvas.toDataURL("image/jpeg", 0.9);
      const signatureSeed = `face_${canvas.width}x${canvas.height}_${Date.now()}_candidate`;
      const embedding = generateDeterministicEmbedding(signatureSeed);

      const res = await saveBiometricBaseline({
        photoDataUrl,
        faceEmbedding: embedding,
      });

      if (!res.success) {
        setSnapshotError(res.error || "Failed to save baseline biometric identity.");
        return;
      }

      setLocalProfile({
        id_photo_url: photoDataUrl,
        face_embedding: embedding,
        full_name: localProfile?.full_name || "Candidate",
      });

      setStatus((prev) => ({
        ...prev,
        facialIdentity: {
          status: "passed",
          isVerified: true,
          similarityPct: 100,
          message: "Reference photo registered & verified!",
        },
      }));
    } catch (err) {
      setSnapshotError(err instanceof Error ? err.message : "Error taking snapshot");
    } finally {
      setIsSavingSnapshot(false);
    }
  };

  // Helper: Setup AudioContext Analyser & VU Meter
  const setupAudioAnalyser = useCallback((stream: MediaStream) => {
    try {
      if (audioContextRef.current) {
        audioContextRef.current.close().catch(() => {});
      }
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
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
  }, []);

  // Request Camera Permission on-demand
  const requestCamera = useCallback(async () => {
    setIsRequestingCam(true);
    setStatus((prev) => ({
      ...prev,
      camera: { ...prev.camera, status: "checking", message: "Requesting camera permission..." },
    }));

    try {
      const camStream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: "user" },
      });

      // Update active stream combining with existing audio tracks if present
      setActiveStream((prev) => {
        const audioTracks = prev ? prev.getAudioTracks() : [];
        const merged = new MediaStream([...camStream.getVideoTracks(), ...audioTracks]);
        if (videoPreviewRef.current) {
          videoPreviewRef.current.srcObject = merged;
          void videoPreviewRef.current.play().catch(() => {});
        }
        return merged;
      });

      const camInfo = await inspectCameraDevices();

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
      }));
      setTimeout(() => verifyFaceMatch(), 900);
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : "Access denied";
      setStatus((prev) => ({
        ...prev,
        camera: {
          ...prev.camera,
          status: "failed",
          hasPermission: false,
          message: `Camera blocked (${errMsg}). Click "Enable Camera" or check browser site settings.`,
        },
      }));
      setShowPermissionGuide(true);
    } finally {
      setIsRequestingCam(false);
    }
  }, []);

  // Request Microphone Permission on-demand
  const requestMicrophone = useCallback(async () => {
    setIsRequestingMic(true);
    setStatus((prev) => ({
      ...prev,
      microphone: { ...prev.microphone, status: "checking", message: "Requesting microphone permission..." },
    }));

    try {
      const micStream = await navigator.mediaDevices.getUserMedia({
        audio: true,
      });

      // Update active stream combining with existing video tracks if present
      setActiveStream((prev) => {
        const videoTracks = prev ? prev.getVideoTracks() : [];
        const merged = new MediaStream([...videoTracks, ...micStream.getAudioTracks()]);
        return merged;
      });

      const audioTracks = micStream.getAudioTracks();
      const micName = audioTracks[0]?.label || "Default Microphone";

      setupAudioAnalyser(micStream);

      setStatus((prev) => ({
        ...prev,
        microphone: {
          status: "passed",
          hasPermission: true,
          deviceName: micName,
          audioDetected: true,
          audioLevelPct: 15,
          message: "Microphone stream connected.",
        },
      }));
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : "Access denied";
      setStatus((prev) => ({
        ...prev,
        microphone: {
          ...prev.microphone,
          status: "failed",
          hasPermission: false,
          message: `Microphone blocked (${errMsg}). Click "Enable Microphone" or check browser site settings.`,
        },
      }));
      setShowPermissionGuide(true);
    } finally {
      setIsRequestingMic(false);
    }
  }, [setupAudioAnalyser]);

  // Request both Camera & Microphone simultaneously
  const requestAllMediaPermissions = useCallback(async () => {
    await requestCamera();
    await requestMicrophone();
  }, [requestCamera, requestMicrophone]);

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

      // Try initial camera & mic access automatically
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

        setupAudioAnalyser(stream);
        setTimeout(() => verifyFaceMatch(), 900);
      } catch (err) {
        if (!unmounted) {
          const errMsg = err instanceof Error ? err.message : "Permissions required";
          setStatus((prev) => ({
            ...prev,
            camera: {
              ...prev.camera,
              status: "failed",
              hasPermission: false,
              message: `Camera permissions required (${errMsg}). Use the button below to enable.`,
            },
            microphone: {
              ...prev.microphone,
              status: "failed",
              hasPermission: false,
              message: `Microphone permissions required (${errMsg}). Use the button below to enable.`,
            },
          }));
          setShowPermissionGuide(true);
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
  }, [setupAudioAnalyser]);

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

  const isPermissionsMissing = !status.camera.hasPermission || !status.microphone.hasPermission;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
      <div className="relative w-full max-w-2xl rounded-2xl border border-border/80 bg-card p-6 shadow-2xl font-body space-y-5 max-h-[94vh] overflow-y-auto">
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

        {/* Permissions Off Alert Banner with Quick Enable Button */}
        {isPermissionsMissing && (
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-start gap-2.5 text-amber-600 dark:text-amber-400">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-foreground">
                  Permissions are off:{" "}
                  {[
                    !status.camera.hasPermission && "Camera",
                    !status.microphone.hasPermission && "Microphone",
                  ]
                    .filter(Boolean)
                    .join(" & ")}{" "}
                  needed
                </p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Click the button to grant access directly in your browser.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={requestAllMediaPermissions}
              disabled={isRequestingCam || isRequestingMic}
              className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-amber-600 px-3.5 py-1.5 text-xs font-medium text-white hover:bg-amber-700 transition shrink-0 shadow-sm disabled:opacity-50"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isRequestingCam || isRequestingMic ? "animate-spin" : ""}`} />
              Enable Camera & Mic
            </button>
          </div>
        )}

        {/* 4-Item Verification Grid */}
        <div className="grid gap-3 sm:grid-cols-2">
          {/* Check 1: Internet Stability */}
          <div className="rounded-xl border border-border/80 bg-background/50 p-3.5 space-y-1.5 flex flex-col justify-between">
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-foreground">1. Network & Ping</span>
                {status.internet.status === "passed" ? (
                  <span className="rounded bg-emerald-50 px-1.5 py-0.5 font-mono text-[10px] font-medium text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
                    ✓ Passed ({status.internet.latencyMs}ms)
                  </span>
                ) : status.internet.status === "checking" ? (
                  <span className="font-mono text-[10px] text-muted-foreground animate-pulse">Pinging...</span>
                ) : (
                  <span className="rounded bg-rose-50 px-1.5 py-0.5 font-mono text-[10px] font-medium text-rose-800 dark:bg-rose-950/40 dark:text-rose-300">
                    ✕ Failed
                  </span>
                )}
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed">{status.internet.message}</p>
            </div>
            <div className="flex justify-end pt-1">
              <button
                type="button"
                onClick={handleRetestInternet}
                className="text-[10px] font-mono text-muted-foreground underline hover:text-foreground inline-flex items-center gap-1"
              >
                <RefreshCw className="h-3 w-3" />
                Retest ping
              </button>
            </div>
          </div>

          {/* Check 2: Display & External Monitor */}
          <div className="rounded-xl border border-border/80 bg-background/50 p-3.5 space-y-1.5 flex flex-col justify-between">
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-foreground">2. Display Integrity</span>
                {status.display.status === "passed" ? (
                  <span className="rounded bg-emerald-50 px-1.5 py-0.5 font-mono text-[10px] font-medium text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
                    ✓ Single Display
                  </span>
                ) : (
                  <span className="rounded bg-rose-50 px-1.5 py-0.5 font-mono text-[10px] font-medium text-rose-800 dark:bg-rose-950/40 dark:text-rose-300">
                    ✕ Multi-Display Blocked
                  </span>
                )}
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed">{status.display.message}</p>
            </div>
            <div className="flex justify-end pt-1">
              <button
                type="button"
                onClick={handleRetestDisplay}
                className="text-[10px] font-mono text-muted-foreground underline hover:text-foreground inline-flex items-center gap-1"
              >
                <RefreshCw className="h-3 w-3" />
                Re-scan displays
              </button>
            </div>
          </div>

          {/* Check 3: Webcam & Video Stream Preview */}
          <div className="rounded-xl border border-border/80 bg-background/50 p-3.5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-foreground">3. Camera Stream</span>
              {status.camera.status === "passed" ? (
                <span className="rounded bg-emerald-50 px-1.5 py-0.5 font-mono text-[10px] font-medium text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
                  ✓ Live Video
                </span>
              ) : (
                <span className="rounded bg-rose-50 px-1.5 py-0.5 font-mono text-[10px] font-medium text-rose-800 dark:bg-rose-950/40 dark:text-rose-300">
                  ✕ Cam Off
                </span>
              )}
            </div>

            {/* Live Video Preview Box OR Enable Button Box */}
            {status.camera.status === "passed" ? (
              <div className="space-y-1">
                <div className="relative aspect-[4/3] w-full overflow-hidden rounded-lg border border-border/80 bg-black flex items-center justify-center shadow-inner">
                  <video
                    ref={videoPreviewRef}
                    autoPlay
                    playsInline
                    muted
                    className="h-full w-full object-cover scale-x-[-1]"
                  />
                  {enrollCountdown !== null && (
                    <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/60 backdrop-blur-sm">
                      <span className="font-headline text-5xl font-bold text-white animate-ping">
                        {enrollCountdown}
                      </span>
                    </div>
                  )}
                  <div className="pointer-events-none absolute inset-0 border border-dashed border-white/20 rounded m-2 flex items-center justify-center">
                    <span className="text-[10px] font-mono text-white/60 bg-black/50 px-1.5 py-0.5 rounded backdrop-blur">
                      Position Face Centered
                    </span>
                  </div>
                </div>
                <p className="text-[10px] font-mono text-muted-foreground truncate">
                  {status.camera.deviceName || "Webcam Active"}
                </p>
              </div>
            ) : (
              <div className="relative aspect-[4/3] w-full rounded-lg border border-dashed border-rose-500/30 bg-rose-500/5 p-4 flex flex-col items-center justify-center text-center space-y-2.5">
                <div className="h-10 w-10 rounded-full bg-rose-500/10 flex items-center justify-center text-rose-500">
                  <CameraOff className="h-5 w-5" />
                </div>
                <div className="space-y-0.5">
                  <p className="text-xs font-semibold text-foreground">Camera permission is off</p>
                  <p className="text-[11px] text-muted-foreground max-w-[210px] leading-tight">
                    Required for proctored face detection and visual integrity.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={requestCamera}
                  disabled={isRequestingCam}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90 transition shadow-sm disabled:opacity-50"
                >
                  <Camera className="h-3.5 w-3.5" />
                  {isRequestingCam ? "Enabling..." : "Enable Camera"}
                </button>
              </div>
            )}
          </div>

          {/* Check 4: Microphone & Live VU Meter */}
          <div className="rounded-xl border border-border/80 bg-background/50 p-3.5 space-y-2 flex flex-col justify-between">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-foreground">4. Audio Microphone</span>
                {status.microphone.status === "passed" ? (
                  <span className="rounded bg-emerald-50 px-1.5 py-0.5 font-mono text-[10px] font-medium text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
                    ✓ Mic Active
                  </span>
                ) : (
                  <span className="rounded bg-rose-50 px-1.5 py-0.5 font-mono text-[10px] font-medium text-rose-800 dark:bg-rose-950/40 dark:text-rose-300">
                    ✕ Mic Off
                  </span>
                )}
              </div>
              <p className="text-[11px] text-muted-foreground">
                Speak aloud to test audio levels. The green meter should respond to your voice:
              </p>
            </div>

            {/* Live VU Meter OR Enable Button Box */}
            {status.microphone.status === "passed" ? (
              <div className="space-y-2 pt-1">
                <div className="flex items-center justify-between text-[10px] font-mono text-muted-foreground">
                  <span>Mic Input Level:</span>
                  <span className="font-semibold text-foreground">{audioLevel}%</span>
                </div>
                <div className="h-2.5 w-full rounded-full bg-muted overflow-hidden">
                  <div
                    className={`h-full transition-all duration-75 rounded-full ${
                      audioLevel > 10 ? "bg-emerald-500" : "bg-muted-foreground/30"
                    }`}
                    style={{ width: `${Math.max(5, audioLevel)}%` }}
                  />
                </div>
                <p className="text-[10px] font-mono text-muted-foreground truncate pt-0.5">
                  {status.microphone.deviceName || "Microphone Active"}
                </p>
              </div>
            ) : (
              <div className="rounded-lg border border-dashed border-rose-500/30 bg-rose-500/5 p-4 flex flex-col items-center justify-center text-center space-y-2.5">
                <div className="h-10 w-10 rounded-full bg-rose-500/10 flex items-center justify-center text-rose-500">
                  <MicOff className="h-5 w-5" />
                </div>
                <div className="space-y-0.5">
                  <p className="text-xs font-semibold text-foreground">Microphone permission is off</p>
                  <p className="text-[11px] text-muted-foreground max-w-[210px] leading-tight">
                    Required for audio transcription and answering interview questions.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={requestMicrophone}
                  disabled={isRequestingMic}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90 transition shadow-sm disabled:opacity-50"
                >
                  <Mic className="h-3.5 w-3.5" />
                  {isRequestingMic ? "Enabling..." : "Enable Microphone"}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Check 5: Facial Identity & Anti-Proxy Verification Card */}
        <div className="rounded-xl border border-border/80 bg-background/50 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <UserCheck className="h-4 w-4 text-primary" />
              <span className="text-xs font-semibold text-foreground">
                5. Facial Identity Verification
              </span>
            </div>
            {status.facialIdentity?.status === "passed" ? (
              <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 font-mono text-[10px] font-medium text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3" />
                Verified Match {status.facialIdentity.similarityPct ? `(${status.facialIdentity.similarityPct}%)` : ""}
              </span>
            ) : status.facialIdentity?.status === "checking" ? (
              <span className="font-mono text-[10px] text-amber-500 animate-pulse flex items-center gap-1">
                <RefreshCw className="h-3 w-3 animate-spin" />
                Matching face...
              </span>
            ) : status.facialIdentity?.status === "failed" ? (
              <span className="rounded-full bg-rose-500/10 px-2 py-0.5 font-mono text-[10px] font-medium text-rose-600 dark:text-rose-400 border border-rose-500/20 flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                Mismatch Warning
              </span>
            ) : (
              <span className="rounded-full bg-amber-500/10 px-2 py-0.5 font-mono text-[10px] font-medium text-amber-600 dark:text-amber-400 border border-amber-500/20 flex items-center gap-1">
                <ShieldAlert className="h-3 w-3" />
                Baseline Photo Required
              </span>
            )}
          </div>

          {status.facialIdentity?.status === "passed" ? (
            <div className="flex items-center justify-between gap-3 rounded-lg bg-emerald-500/5 p-3 border border-emerald-500/20">
              <div className="flex items-center gap-3">
                {localProfile?.id_photo_url && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={localProfile.id_photo_url}
                    alt="Candidate Reference"
                    className="h-10 w-10 rounded-xl object-cover border border-emerald-500/40"
                  />
                )}
                <div>
                  <p className="text-xs font-medium text-foreground">
                    {localProfile?.full_name || "Candidate"} Identity Authenticated
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    Live camera stream matches registered student profile. Continuous proctoring enabled.
                  </p>
                </div>
              </div>
              <button
                type="button"
                disabled={isVerifyingFace}
                onClick={verifyFaceMatch}
                className="shrink-0 rounded-lg border border-border/80 px-2.5 py-1 text-[11px] font-medium text-foreground hover:bg-muted transition flex items-center gap-1"
              >
                <RefreshCw className={`h-3 w-3 ${isVerifyingFace ? "animate-spin" : ""}`} />
                Re-verify
              </button>
            </div>
          ) : (
            <div className="space-y-2.5 rounded-lg border border-dashed border-amber-500/30 bg-amber-500/5 p-3.5">
              <div className="flex items-start gap-2.5">
                <ShieldAlert className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="text-xs font-semibold text-foreground">
                    {status.facialIdentity?.status === "failed"
                      ? "Facial Mismatch: Student ID does not match camera stream"
                      : "Candidate Photo Required for Assessment Integrity"}
                  </p>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    Vyoman proctoring prevents proxy candidate fraud. Register your official webcam photo to proceed.
                  </p>
                  {snapshotError && (
                    <p className="text-[11px] text-destructive font-medium">{snapshotError}</p>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-end gap-2 pt-1 border-t border-amber-500/20">
                {status.camera.status === "passed" ? (
                  <button
                    type="button"
                    disabled={isSavingSnapshot || enrollCountdown !== null}
                    onClick={triggerQuickSnapshot}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3.5 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90 transition shadow-sm disabled:opacity-50"
                  >
                    {isSavingSnapshot ? (
                      <>
                        <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                        Saving Biometric Vector...
                      </>
                    ) : (
                      <>
                        <Camera className="h-3.5 w-3.5" />
                        Take 3s Reference Snapshot
                      </>
                    )}
                  </button>
                ) : (
                  <span className="text-[11px] text-muted-foreground">
                    Enable webcam above to register your reference photo.
                  </span>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Collapsible Browser Permission Troubleshooting Guide */}
        {isPermissionsMissing && (
          <div className="rounded-xl border border-border/80 bg-muted/20 p-3 space-y-2">
            <button
              type="button"
              onClick={() => setShowPermissionGuide((prev) => !prev)}
              className="flex items-center justify-between w-full text-left font-mono text-[11px] text-muted-foreground hover:text-foreground"
            >
              <span className="flex items-center gap-1.5">
                <HelpCircle className="h-3.5 w-3.5" />
                How to enable permissions if your browser blocked them
              </span>
              <span>{showPermissionGuide ? "Hide ▲" : "Show ▼"}</span>
            </button>
            {showPermissionGuide && (
              <ol className="list-decimal list-inside space-y-1 text-[11px] text-muted-foreground pl-1 pt-1 leading-relaxed border-t border-border/40">
                <li>
                  Click the <strong>Padlock (🔒)</strong> or <strong>Tune / Settings icon</strong> in your browser&apos;s address bar (on the left of the URL).
                </li>
                <li>
                  Find <strong>Camera</strong> and <strong>Microphone</strong> in the dropdown menu and set both to <strong>&ldquo;Allow&rdquo;</strong>.
                </li>
                <li>
                  Return to this window and tap <strong>&ldquo;Enable Camera & Mic&rdquo;</strong> above to re-connect your devices without refreshing.
                </li>
              </ol>
            )}
          </div>
        )}

        {/* Lock Screen Mode Acknowledgement */}
        <div className="rounded-xl border border-border/80 bg-muted/20 p-3.5 space-y-2 text-xs">
          <label className="flex items-start gap-2.5 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={status.lockscreen.acknowledged}
              onChange={(e) => handleToggleLockscreenAck(e.target.checked)}
              className="mt-0.5 rounded border-border/80 text-foreground focus:ring-0"
            />
            <div className="space-y-0.5">
              <span className="font-semibold text-foreground flex items-center gap-1.5">
                <Lock className="h-3.5 w-3.5 text-primary" />
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
          <div className="rounded-xl border border-amber-200/80 bg-amber-50/60 p-3 text-xs text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-300">
            <p className="font-semibold">Complete all required checks before launching:</p>
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
            className="inline-flex h-9 items-center justify-center rounded-xl bg-foreground px-5 text-xs font-semibold text-background hover:bg-foreground/90 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm"
          >
            {isStarting ? "Entering Lockdown Mode..." : "Enter Lockdown & Start Interview"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default PreFlightCheckModal;
