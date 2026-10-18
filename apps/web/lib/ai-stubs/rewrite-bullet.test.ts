import { describe, expect, it } from "vitest";
import { applyMetricAnswer, rewriteBullet } from "./rewrite-bullet";

// BUILD_SPEC Part 4.3: "AI bullet rewriting ... must never invent numbers.
// If a bullet lacks a metric, it asks the student a specific question."
// BUILD_SPEC Part 7 Phase 3 acceptance criterion: "bullet rewriting never
// adds a number that wasn't in the input or the student's answer (write a
// test with fixtures for this)." This is that test, run against the
// current mock (lib/ai-stubs/rewrite-bullet.ts); the real Gemini-backed
// version must keep passing the same contract.

function numbersIn(text: string): string[] {
  return text.match(/\d+/g) ?? [];
}

describe("rewriteBullet", () => {
  it("asks a specific follow-up question when the bullet has no number", async () => {
    const result = await rewriteBullet("Helped improve the signup flow for new users");
    expect(result.kind).toBe("needs_metric");
    if (result.kind === "needs_metric") {
      expect(result.question.length).toBeGreaterThan(0);
    }
  });

  it("asks for a metric on an empty bullet instead of fabricating one", async () => {
    const result = await rewriteBullet("   ");
    expect(result.kind).toBe("needs_metric");
  });

  it("rewrites a bullet that already has a number, keeping that exact number and introducing no other digits", async () => {
    const input = "Reduced page load time by 40%";
    const result = await rewriteBullet(input);
    expect(result.kind).toBe("rewritten");
    if (result.kind === "rewritten") {
      const inputNumbers = numbersIn(input);
      const outputNumbers = numbersIn(result.text);
      // Every number in the output must have existed in the input — the
      // rewrite must never invent a new one.
      for (const n of outputNumbers) {
        expect(inputNumbers).toContain(n);
      }
      // The input's own number must survive the rewrite, not be dropped.
      expect(outputNumbers).toContain("40");
    }
  });

  it("applyMetricAnswer folds the student's own answer in and never invents a different number", async () => {
    const bullet = "Led the onboarding redesign project";
    const metricAnswer = "reached 500 new users";
    const result = await applyMetricAnswer(bullet, metricAnswer);
    expect(result.kind).toBe("rewritten");
    if (result.kind === "rewritten") {
      const outputNumbers = numbersIn(result.text);
      const allowedNumbers = numbersIn(bullet + " " + metricAnswer);
      for (const n of outputNumbers) {
        expect(allowedNumbers).toContain(n);
      }
      expect(outputNumbers).toContain("500");
    }
  });
});
