"use client";

import React, { useState } from "react";
import type { ExecutionResult, TestCase } from "@/lib/sandbox/types";

interface TestCasesPanelProps {
  testCases: TestCase[];
  executionResult: ExecutionResult | null;
  isRunning: boolean;
  onRunCode: () => void;
}

export function TestCasesPanel({
  testCases,
  executionResult,
  isRunning,
  onRunCode,
}: TestCasesPanelProps) {
  const [activeTab, setActiveTab] = useState<"testcases" | "console">("testcases");
  const [selectedCaseIndex, setSelectedCaseIndex] = useState(0);

  const displayCases = executionResult?.testCases ?? testCases;
  const currentCase = displayCases[selectedCaseIndex] ?? displayCases[0];

  const allPassed =
    displayCases.length > 0 &&
    displayCases.every((tc) => tc.passed === true);

  return (
    <div className="flex h-full flex-col rounded-2xl border border-zinc-800 bg-zinc-950 font-sans text-zinc-200">
      {/* Header bar */}
      <div className="flex items-center justify-between border-b border-zinc-800/80 px-4 py-2.5">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab("testcases")}
            className={`rounded-lg px-3 py-1 font-body text-xs font-medium transition-colors ${
              activeTab === "testcases"
                ? "bg-zinc-800 text-white"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            Test Cases ({displayCases.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("console")}
            className={`rounded-lg px-3 py-1 font-body text-xs font-medium transition-colors ${
              activeTab === "console"
                ? "bg-zinc-800 text-white"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            Console Output
          </button>
        </div>

        <div className="flex items-center gap-3">
          {executionResult && (
            <div className="flex items-center gap-2 text-xs">
              {allPassed ? (
                <span className="flex items-center gap-1 font-semibold text-emerald-400">
                  <span className="h-2 w-2 rounded-full bg-emerald-400" />
                  All Passed
                </span>
              ) : (
                <span className="flex items-center gap-1 font-semibold text-rose-400">
                  <span className="h-2 w-2 rounded-full bg-rose-400" />
                  Some Tests Failed
                </span>
              )}
              <span className="text-zinc-500 font-mono">({executionResult.executionTimeMs}ms)</span>
            </div>
          )}

          <button
            type="button"
            onClick={onRunCode}
            disabled={isRunning}
            className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-1.5 font-body text-xs font-semibold text-white shadow-sm transition hover:bg-emerald-500 active:scale-95 disabled:opacity-50"
          >
            {isRunning ? (
              <>
                <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" />
                Running...
              </>
            ) : (
              <>
                <span>▶</span> Run Code
              </>
            )}
          </button>
        </div>
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto p-4 text-xs">
        {activeTab === "testcases" && (
          <div>
            {/* Case selector pills */}
            <div className="mb-3 flex flex-wrap gap-2">
              {displayCases.map((tc, index) => {
                const isSelected = index === selectedCaseIndex;
                const statusColor =
                  tc.passed === true
                    ? "border-emerald-500/50 text-emerald-300 bg-emerald-950/30"
                    : tc.passed === false
                      ? "border-rose-500/50 text-rose-300 bg-rose-950/30"
                      : "border-zinc-800 text-zinc-400 bg-zinc-900";

                return (
                  <button
                    key={tc.id || index}
                    type="button"
                    onClick={() => setSelectedCaseIndex(index)}
                    className={`rounded-lg border px-3 py-1 font-mono text-xs transition ${statusColor} ${
                      isSelected ? "ring-2 ring-primary/60 font-semibold" : ""
                    }`}
                  >
                    Case {index + 1}
                    {tc.passed === true && " ✓"}
                    {tc.passed === false && " ✗"}
                  </button>
                );
              })}
            </div>

            {/* Selected case details */}
            {currentCase && (
              <div className="space-y-3 font-mono">
                <div>
                  <span className="font-body text-[11px] uppercase tracking-wider text-zinc-500">
                    Input:
                  </span>
                  <div className="mt-1 rounded-xl border border-zinc-800 bg-zinc-900 p-2.5 text-zinc-200">
                    {currentCase.input}
                  </div>
                </div>

                <div>
                  <span className="font-body text-[11px] uppercase tracking-wider text-zinc-500">
                    Expected Output:
                  </span>
                  <div className="mt-1 rounded-xl border border-zinc-800 bg-zinc-900 p-2.5 text-zinc-200">
                    {currentCase.expectedOutput}
                  </div>
                </div>

                {currentCase.actualOutput !== undefined && (
                  <div>
                    <span className="font-body text-[11px] uppercase tracking-wider text-zinc-500">
                      Actual Output:
                    </span>
                    <div
                      className={`mt-1 rounded-xl border p-2.5 ${
                        currentCase.passed
                          ? "border-emerald-700/50 bg-emerald-950/20 text-emerald-200"
                          : "border-rose-700/50 bg-rose-950/20 text-rose-200"
                      }`}
                    >
                      {currentCase.actualOutput}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {activeTab === "console" && (
          <div className="h-full font-mono text-xs">
            {executionResult?.error ? (
              <div className="rounded-xl border border-rose-800/40 bg-rose-950/20 p-3 text-rose-300">
                <p className="font-semibold">Runtime / Syntax Error:</p>
                <pre className="mt-1 whitespace-pre-wrap">{executionResult.error}</pre>
              </div>
            ) : executionResult?.output ? (
              <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-3 text-zinc-300">
                <pre className="whitespace-pre-wrap">{executionResult.output}</pre>
              </div>
            ) : (
              <p className="text-center text-zinc-500 py-6">
                Click &quot;Run Code&quot; to execute your solution and view standard output.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default TestCasesPanel;
