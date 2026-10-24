"use client";

import React, { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import {
  SUPPORTED_LANGUAGES,
  type SupportedLanguage,
  type TestCase,
  type ExecutionResult,
} from "@/lib/sandbox/types";
import { executeCode } from "@/lib/sandbox/runner";
import { TestCasesPanel } from "./TestCasesPanel";

// Dynamic import with ssr: false ensures Monaco never runs during SSR
const MonacoEditor = dynamic(() => import("./MonacoEditor"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center rounded-2xl border border-zinc-800 bg-[#1e1e1e] font-mono text-sm text-zinc-400">
      <span className="mr-2 inline-block h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      Loading Monaco Editor...
    </div>
  ),
});

interface CodingSandboxProps {
  initialLanguage?: SupportedLanguage;
  onCodeChange?: (code: string, language: SupportedLanguage) => void;
  defaultTestCases?: TestCase[];
  onPaste?: (pastedText: string) => void;
}

const DEFAULT_SAMPLE_TEST_CASES: TestCase[] = [
  {
    id: "case-1",
    name: "Standard Target",
    input: "[2, 7, 11, 15], 9",
    expectedOutput: "[0, 1]",
  },
  {
    id: "case-2",
    name: "Duplicates",
    input: "[3, 2, 4], 6",
    expectedOutput: "[1, 2]",
  },
  {
    id: "case-3",
    name: "Negative Numbers",
    input: "[-1, -2, -3, -4, -5], -8",
    expectedOutput: "[2, 4]",
  },
];

export function CodingSandbox({
  initialLanguage = "python",
  onCodeChange,
  defaultTestCases = DEFAULT_SAMPLE_TEST_CASES,
  onPaste,
}: CodingSandboxProps) {
  const [language, setLanguage] = useState<SupportedLanguage>(initialLanguage);
  const [code, setCode] = useState<string>(() => {
    const config = SUPPORTED_LANGUAGES.find((l) => l.id === initialLanguage);
    return config?.defaultCode ?? "";
  });
  const [testCases] = useState<TestCase[]>(defaultTestCases);
  const [executionResult, setExecutionResult] = useState<ExecutionResult | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [fontSize, setFontSize] = useState(13);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Sync with parent whenever code changes
  useEffect(() => {
    onCodeChange?.(code, language);
  }, [code, language, onCodeChange]);

  const handleLanguageChange = (newLang: SupportedLanguage) => {
    setLanguage(newLang);
    const config = SUPPORTED_LANGUAGES.find((l) => l.id === newLang);
    if (config) {
      setCode(config.defaultCode);
    }
    setExecutionResult(null);
  };

  const handleReset = () => {
    const config = SUPPORTED_LANGUAGES.find((l) => l.id === language);
    if (config) {
      setCode(config.defaultCode);
    }
    setExecutionResult(null);
  };

  const handleRunCode = async () => {
    setIsRunning(true);
    try {
      const res = await executeCode(language, code, testCases);
      setExecutionResult(res);
    } catch (err: unknown) {
      setExecutionResult({
        success: false,
        error: err instanceof Error ? err.message : "Execution failed unexpectedly.",
        executionTimeMs: 0,
      });
    } finally {
      setIsRunning(false);
    }
  };

  const currentLangConfig = SUPPORTED_LANGUAGES.find((l) => l.id === language);

  if (!mounted) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center rounded-3xl border border-zinc-800 bg-zinc-950 p-6 font-mono text-sm text-zinc-400 shadow-xl">
        <span className="mb-3 inline-block h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        Preparing live coding sandbox...
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col rounded-3xl border border-zinc-800 bg-zinc-950 p-3 shadow-xl">
      {/* Top Toolbar */}
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2 border-b border-zinc-800/80 px-2 pb-2">
        <div className="flex items-center gap-2">
          <label htmlFor="language-select" className="font-body text-xs font-medium text-zinc-400">
            Language:
          </label>
          <select
            id="language-select"
            value={language}
            onChange={(e) => handleLanguageChange(e.target.value as SupportedLanguage)}
            className="rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-1 font-body text-xs font-semibold text-white outline-none transition focus:border-primary"
          >
            {SUPPORTED_LANGUAGES.map((lang) => (
              <option key={lang.id} value={lang.id}>
                {lang.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          {/* Font size toggle */}
          <div className="flex items-center gap-1 text-xs text-zinc-400">
            <span>A</span>
            <input
              type="range"
              min={11}
              max={18}
              value={fontSize}
              onChange={(e) => setFontSize(Number(e.target.value))}
              className="h-1.5 w-16 cursor-pointer accent-primary"
              title="Font size"
            />
            <span className="text-sm font-semibold">A</span>
          </div>

          <button
            type="button"
            onClick={handleReset}
            className="rounded-xl border border-zinc-800 px-2.5 py-1 font-body text-xs text-zinc-400 transition hover:bg-zinc-800 hover:text-white"
          >
            Reset
          </button>
        </div>
      </div>

      {/* Editor & Console Split */}
      <div className="flex flex-1 flex-col gap-2 overflow-hidden sm:min-h-[460px]">
        {/* Monaco Editor Frame */}
        <div className="min-h-[280px] flex-1">
          <MonacoEditor
            language={currentLangConfig?.monacoLanguage ?? "python"}
            value={code}
            onChange={setCode}
            fontSize={fontSize}
            onPaste={onPaste}
          />
        </div>

        {/* Test Cases & Execution Results Frame */}
        <div className="h-[210px] shrink-0">
          <TestCasesPanel
            testCases={testCases}
            executionResult={executionResult}
            isRunning={isRunning}
            onRunCode={handleRunCode}
          />
        </div>
      </div>
    </div>
  );
}

export default CodingSandbox;
