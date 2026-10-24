import { describe, expect, it } from "vitest";
import {
  buildPairingUrl,
  calculateDualCamIntegrityBonus,
  generatePairToken,
  isSecondaryCameraActive,
} from "./dualCam";

describe("Dual-Camera Secondary Device Proctoring Engine", () => {
  it("generates an 8-character token", () => {
    const token = generatePairToken();
    expect(token).toHaveLength(8);
    expect(typeof token).toBe("string");
  });

  it("builds the mobile pairing URL correctly", () => {
    const url = buildPairingUrl("int_123", "TOKENXYZ", "https://vyoman.ai");
    expect(url).toContain("https://vyoman.ai/proctor/pair");
    expect(url).toContain("interviewId=int_123");
    expect(url).toContain("token=TOKENXYZ");
  });

  it("determines secondary camera active state based on heartbeat timestamp", () => {
    const nowIso = new Date().toISOString();
    expect(isSecondaryCameraActive(nowIso, 5000)).toBe(true);

    const oldIso = new Date(Date.now() - 15000).toISOString();
    expect(isSecondaryCameraActive(oldIso, 5000)).toBe(false);
    expect(isSecondaryCameraActive(undefined)).toBe(false);
  });

  it("calculates integrity bonus based on desk angle confidence", () => {
    expect(calculateDualCamIntegrityBonus("streaming_active", 90)).toBe(10);
    expect(calculateDualCamIntegrityBonus("streaming_active", 60)).toBe(5);
    expect(calculateDualCamIntegrityBonus("disconnected", 90)).toBe(0);
  });
});
