import { describe, expect, it } from "vitest";
import { executeCode } from "./runner";
import type { TestCase } from "./types";

describe("Coding Sandbox Runner", () => {
  it("executes JavaScript code and returns standard output and execution time", async () => {
    const code = `
      function add(a, b) { return a + b; }
      console.log("Result is:", add(10, 25));
    `;

    const result = await executeCode("javascript", code);
    expect(result.success).toBe(true);
    expect(result.output).toContain("Result is: 35");
    expect(result.executionTimeMs).toBeGreaterThanOrEqual(0);
  });

  it("evaluates test cases correctly (both passing and failing cases)", async () => {
    const code = `
      function solution(nums, target) {
        if (target === 9) return [0, 1];
        return [];
      }
    `;

    const testCases: TestCase[] = [
      {
        id: "case-1",
        name: "Target 9",
        input: "[2, 7, 11, 15], 9",
        expectedOutput: "[0, 1]",
      },
      {
        id: "case-2",
        name: "Target 6",
        input: "[3, 2, 4], 6",
        expectedOutput: "[1, 2]",
      },
    ];

    const result = await executeCode("javascript", code, testCases);
    expect(result.success).toBe(true);
    expect(result.testCases).toBeDefined();
    expect(result.testCases?.length).toBe(2);

    // Case 1 should pass
    expect(result.testCases?.[0].passed).toBe(true);
    expect(result.testCases?.[0].actualOutput).toBe("[0,1]");

    // Case 2 should fail
    expect(result.testCases?.[1].passed).toBe(false);
    expect(result.testCases?.[1].actualOutput).toBe("[]");
  });

  it("handles syntax and runtime errors gracefully without throwing", async () => {
    const badCode = `
      const x = null;
      x.someMethod();
    `;

    const result = await executeCode("javascript", badCode);
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
    expect(result.error).toMatch(/Cannot read propert|null/);
  });

  it("handles simulated multi-language execution (Python)", async () => {
    const pythonCode = `
def solution(nums, target):
    return [0, 1]
    `;

    const testCases: TestCase[] = [
      {
        id: "py-1",
        name: "Py Case",
        input: "[2, 7, 11, 15], 9",
        expectedOutput: "[0, 1]",
      },
    ];

    const result = await executeCode("python", pythonCode, testCases);
    expect(result.success).toBe(true);
    expect(result.testCases).toBeDefined();
    expect(result.testCases?.[0].passed).toBe(true);
  });
});
