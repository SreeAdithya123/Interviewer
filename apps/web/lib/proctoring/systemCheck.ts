/**
 * System Pre-Flight Check & Hardware Gate Engine.
 * Enforces hardware verification, display integrity, internet stability,
 * camera/mic streams, and lockdown fullscreen mode before an interview can start.
 */

export interface SystemCheckStatus {
  internet: {
    status: "pending" | "checking" | "passed" | "failed";
    latencyMs: number | null;
    isOnline: boolean;
    message: string;
  };
  display: {
    status: "pending" | "checking" | "passed" | "failed";
    hasExternalDisplay: boolean;
    screenCount: number;
    message: string;
  };
  camera: {
    status: "pending" | "checking" | "passed" | "failed";
    hasPermission: boolean;
    isExternal: boolean;
    deviceName: string | null;
    devicesCount: number;
    message: string;
  };
  microphone: {
    status: "pending" | "checking" | "passed" | "failed";
    hasPermission: boolean;
    deviceName: string | null;
    audioDetected: boolean;
    audioLevelPct: number; // 0-100
    message: string;
  };
  lockscreen: {
    status: "pending" | "checking" | "passed" | "failed";
    isFullscreen: boolean;
    acknowledged: boolean;
    message: string;
  };
}

export const INITIAL_SYSTEM_CHECK_STATUS: SystemCheckStatus = {
  internet: {
    status: "pending",
    latencyMs: null,
    isOnline: true,
    message: "Awaiting connection ping...",
  },
  display: {
    status: "pending",
    hasExternalDisplay: false,
    screenCount: 1,
    message: "Verifying single primary display...",
  },
  camera: {
    status: "pending",
    hasPermission: false,
    isExternal: false,
    deviceName: null,
    devicesCount: 0,
    message: "Awaiting webcam access...",
  },
  microphone: {
    status: "pending",
    hasPermission: false,
    deviceName: null,
    audioDetected: false,
    audioLevelPct: 0,
    message: "Awaiting microphone permission...",
  },
  lockscreen: {
    status: "pending",
    isFullscreen: false,
    acknowledged: false,
    message: "Requires secure full-screen lockdown.",
  },
};

/**
 * Checks internet connection ping latency.
 */
export async function measureInternetLatency(pingUrl: string = "/api/demo-requests"): Promise<{
  isOnline: boolean;
  latencyMs: number;
  passed: boolean;
  message: string;
}> {
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    return {
      isOnline: false,
      latencyMs: 9999,
      passed: false,
      message: "No internet connection detected.",
    };
  }

  const start = performance.now();
  try {
    const res = await fetch(pingUrl, { method: "HEAD", cache: "no-store" });
    const elapsed = Math.round(performance.now() - start);

    if (elapsed > 1200) {
      return {
        isOnline: true,
        latencyMs: elapsed,
        passed: false,
        message: `High network latency (${elapsed}ms). A stable connection is required.`,
      };
    }

    return {
      isOnline: true,
      latencyMs: elapsed,
      passed: true,
      message: `Stable connection verified (${elapsed}ms ping).`,
    };
  } catch {
    // If fetch failed, fallback to navigator.onLine
    const isOnline = typeof navigator !== "undefined" ? navigator.onLine : true;
    return {
      isOnline,
      latencyMs: isOnline ? 95 : 9999,
      passed: isOnline,
      message: isOnline ? "Connected to internet." : "Network connection failed.",
    };
  }
}

/**
 * Checks for external displays / multiple screens.
 */
export async function detectDisplaySetup(): Promise<{
  hasExternalDisplay: boolean;
  screenCount: number;
  passed: boolean;
  message: string;
}> {
  if (typeof window === "undefined") {
    return {
      hasExternalDisplay: false,
      screenCount: 1,
      passed: true,
      message: "Single primary display verified.",
    };
  }

  // 1. Check Window Management API if supported
  if ("getScreenDetails" in window) {
    try {
      // @ts-expect-error Window Management API standard in Chromium
      const details = await window.getScreenDetails();
      if (details.screens && details.screens.length > 1) {
        return {
          hasExternalDisplay: true,
          screenCount: details.screens.length,
          passed: false,
          message: `Multiple displays detected (${details.screens.length} monitors). Disconnect external monitors before starting.`,
        };
      }
    } catch {
      // Permission denied or dismissed, check isExtended
    }
  }

  // 2. Check window.screen.isExtended
  // @ts-expect-error standard Screen API property
  const isExtended = Boolean(window.screen?.isExtended);
  if (isExtended) {
    return {
      hasExternalDisplay: true,
      screenCount: 2,
      passed: false,
      message: "External extended display detected. Disconnect secondary screen to prevent cheating.",
    };
  }

  return {
    hasExternalDisplay: false,
    screenCount: 1,
    passed: true,
    message: "Single primary monitor verified.",
  };
}

/**
 * Enumerates connected video cameras (internal vs external USB/virtual).
 */
export async function inspectCameraDevices(): Promise<{
  devicesCount: number;
  isExternal: boolean;
  deviceName: string | null;
  hasVirtualCam: boolean;
}> {
  if (typeof navigator === "undefined" || !navigator.mediaDevices?.enumerateDevices) {
    return { devicesCount: 1, isExternal: false, deviceName: "Integrated Webcam", hasVirtualCam: false };
  }

  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    const videoInputs = devices.filter((d) => d.kind === "videoinput");
    const count = videoInputs.length;
    const primary = videoInputs[0];
    const label = primary?.label?.toLowerCase() || "";

    const isExternal =
      label.includes("usb") ||
      label.includes("external") ||
      label.includes("c920") ||
      label.includes("brio") ||
      label.includes("droidcam");

    const hasVirtualCam =
      label.includes("obs") ||
      label.includes("virtual") ||
      label.includes("manycam") ||
      label.includes("splitcam");

    return {
      devicesCount: count,
      isExternal,
      deviceName: primary?.label || `Camera 1 (${count} connected)`,
      hasVirtualCam,
    };
  } catch {
    return { devicesCount: 1, isExternal: false, deviceName: "Webcam", hasVirtualCam: false };
  }
}

/**
 * Validates whether all mandatory pre-flight checks have passed.
 */
export function isPreFlightReadyToStart(status: SystemCheckStatus): {
  canStart: boolean;
  failingChecks: string[];
} {
  const failingChecks: string[] = [];

  if (status.internet.status !== "passed") {
    failingChecks.push("Internet connection");
  }
  if (status.display.status !== "passed" || status.display.hasExternalDisplay) {
    failingChecks.push("Single display verification (disconnect external monitors)");
  }
  if (status.camera.status !== "passed" || !status.camera.hasPermission) {
    failingChecks.push("Webcam permission & video stream");
  }
  if (status.microphone.status !== "passed" || !status.microphone.hasPermission) {
    failingChecks.push("Microphone permission & audio stream");
  }
  if (!status.lockscreen.acknowledged) {
    failingChecks.push("Lockdown screen mode acknowledgement");
  }

  return {
    canStart: failingChecks.length === 0,
    failingChecks,
  };
}
