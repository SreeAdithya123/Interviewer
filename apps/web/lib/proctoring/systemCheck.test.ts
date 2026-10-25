import { describe, expect, it } from "vitest";
import {
  INITIAL_SYSTEM_CHECK_STATUS,
  isPreFlightReadyToStart,
  type SystemCheckStatus,
} from "./systemCheck";

describe("Pre-Flight System Check & Hardware Gate", () => {
  it("blocks starting when checks are pending or unacknowledged", () => {
    const ready = isPreFlightReadyToStart(INITIAL_SYSTEM_CHECK_STATUS);
    expect(ready.canStart).toBe(false);
    expect(ready.failingChecks.length).toBeGreaterThan(0);
    expect(ready.failingChecks).toContain("Internet connection");
    expect(ready.failingChecks).toContain("Webcam permission & video stream");
    expect(ready.failingChecks).toContain("Microphone permission & audio stream");
  });

  it("blocks starting when an external display is detected", () => {
    const statusWithExternalMonitor: SystemCheckStatus = {
      internet: { status: "passed", latencyMs: 45, isOnline: true, message: "OK" },
      display: { status: "failed", hasExternalDisplay: true, screenCount: 2, message: "External display detected" },
      camera: { status: "passed", hasPermission: true, isExternal: false, deviceName: "Cam", devicesCount: 1, message: "OK" },
      microphone: { status: "passed", hasPermission: true, deviceName: "Mic", audioDetected: true, audioLevelPct: 40, message: "OK" },
      lockscreen: { status: "passed", isFullscreen: false, acknowledged: true, message: "OK" },
    };

    const ready = isPreFlightReadyToStart(statusWithExternalMonitor);
    expect(ready.canStart).toBe(false);
    expect(ready.failingChecks).toContain("Single display verification (disconnect external monitors)");
  });

  it("blocks starting when camera or mic permission is missing", () => {
    const noCameraStatus: SystemCheckStatus = {
      internet: { status: "passed", latencyMs: 50, isOnline: true, message: "OK" },
      display: { status: "passed", hasExternalDisplay: false, screenCount: 1, message: "OK" },
      camera: { status: "failed", hasPermission: false, isExternal: false, deviceName: null, devicesCount: 0, message: "Denied" },
      microphone: { status: "passed", hasPermission: true, deviceName: "Mic", audioDetected: true, audioLevelPct: 45, message: "OK" },
      lockscreen: { status: "passed", isFullscreen: false, acknowledged: true, message: "OK" },
    };

    const ready = isPreFlightReadyToStart(noCameraStatus);
    expect(ready.canStart).toBe(false);
    expect(ready.failingChecks).toContain("Webcam permission & video stream");
  });

  it("allows starting ONLY when all checks are green and lockdown is acknowledged", () => {
    const allPassedStatus: SystemCheckStatus = {
      internet: { status: "passed", latencyMs: 38, isOnline: true, message: "OK" },
      display: { status: "passed", hasExternalDisplay: false, screenCount: 1, message: "Single display verified" },
      camera: { status: "passed", hasPermission: true, isExternal: false, deviceName: "Integrated Webcam", devicesCount: 1, message: "Active" },
      microphone: { status: "passed", hasPermission: true, deviceName: "Built-in Mic", audioDetected: true, audioLevelPct: 35, message: "Active" },
      lockscreen: { status: "passed", isFullscreen: true, acknowledged: true, message: "Lockdown Ready" },
      facialIdentity: { status: "passed", isVerified: true, similarityPct: 96, message: "Verified" },
    };

    const ready = isPreFlightReadyToStart(allPassedStatus);
    expect(ready.canStart).toBe(true);
    expect(ready.failingChecks.length).toBe(0);
  });

  it("blocks starting when facial identity verification fails", () => {
    const facialFailStatus: SystemCheckStatus = {
      internet: { status: "passed", latencyMs: 38, isOnline: true, message: "OK" },
      display: { status: "passed", hasExternalDisplay: false, screenCount: 1, message: "Single display verified" },
      camera: { status: "passed", hasPermission: true, isExternal: false, deviceName: "Integrated Webcam", devicesCount: 1, message: "Active" },
      microphone: { status: "passed", hasPermission: true, deviceName: "Built-in Mic", audioDetected: true, audioLevelPct: 35, message: "Active" },
      lockscreen: { status: "passed", isFullscreen: true, acknowledged: true, message: "Lockdown Ready" },
      facialIdentity: { status: "failed", isVerified: false, similarityPct: 42, message: "Mismatch" },
    };

    const ready = isPreFlightReadyToStart(facialFailStatus);
    expect(ready.canStart).toBe(false);
    expect(ready.failingChecks).toContain("Facial identity verification (ensure face is visible or enroll baseline photo)");
  });
});
