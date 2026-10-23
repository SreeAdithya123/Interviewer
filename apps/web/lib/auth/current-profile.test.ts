import { describe, it, expect } from "vitest";
import { profileNeedsOnboarding, type Profile } from "./current-profile";

describe("profileNeedsOnboarding", () => {
  it("returns false if profile is null", () => {
    expect(profileNeedsOnboarding(null)).toBe(false);
  });

  it("returns false for college_admin regardless of onboarded_at", () => {
    const admin: Pick<Profile, "role" | "college_id" | "onboarded_at"> = {
      role: "college_admin",
      college_id: "college-123",
      onboarded_at: null,
    };
    expect(profileNeedsOnboarding(admin)).toBe(false);
  });

  it("returns false for platform_admin regardless of onboarded_at", () => {
    const platformAdmin: Pick<Profile, "role" | "college_id" | "onboarded_at"> = {
      role: "platform_admin",
      college_id: null,
      onboarded_at: null,
    };
    expect(profileNeedsOnboarding(platformAdmin)).toBe(false);
  });

  it("returns true for a newly signed up student whose onboarded_at is null", () => {
    const newStudent: Pick<Profile, "role" | "college_id" | "onboarded_at"> = {
      role: "student",
      college_id: null,
      onboarded_at: null,
    };
    expect(profileNeedsOnboarding(newStudent)).toBe(true);
  });

  it("returns false for an independent student who completed onboarding", () => {
    const independentStudent: Pick<Profile, "role" | "college_id" | "onboarded_at"> = {
      role: "student",
      college_id: null,
      onboarded_at: "2026-10-23T22:30:00Z",
    };
    expect(profileNeedsOnboarding(independentStudent)).toBe(false);
  });

  it("returns false for a college student who redeemed an invitation code", () => {
    const collegeStudent: Pick<Profile, "role" | "college_id" | "onboarded_at"> = {
      role: "student",
      college_id: "college-sasi-id",
      onboarded_at: "2026-10-23T22:30:00Z",
    };
    expect(profileNeedsOnboarding(collegeStudent)).toBe(false);
  });
});
