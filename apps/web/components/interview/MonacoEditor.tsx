"use client";

import React, { useEffect, useState } from "react";
import Editor, { loader, type OnMount } from "@monaco-editor/react";

// Configure CDN path so Monaco web workers load reliably from CDN
if (typeof window !== "undefined") {
  loader.config({
    paths: {
      vs: "https://cdn.jsdelivr.net/npm/monaco-editor@0.45.0/min/vs",
    },
  });
}

interface MonacoEditorProps {
  language: string;
  value: string;
  onChange: (value: string) => void;
  fontSize?: number;
  readOnly?: boolean;
  onPaste?: (pastedText: string) => void;
}

export function MonacoEditor({
  language,
  value,
  onChange,
  fontSize = 14,
  readOnly = false,
  onPaste,
}: MonacoEditorProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleEditorMount: OnMount = (editor) => {
    // Focus editor on mount if active
    editor.updateOptions({
      tabSize: 4,
      fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', Menlo, monospace",
      fontLigatures: true,
      cursorBlinking: "smooth",
      smoothScrolling: true,
    });

    if (onPaste) {
      editor.onDidPaste((e) => {
        const model = editor.getModel();
        if (model) {
          const pastedText = model.getValueInRange(e.range);
          onPaste(pastedText);
        }
      });
    }
  };

  if (!mounted) {
    return (
      <div className="relative h-full w-full overflow-hidden rounded-2xl border border-zinc-800 bg-[#1e1e1e] p-4 font-mono text-sm text-zinc-400">
        <div className="flex items-center gap-2 mb-2 text-xs text-zinc-500">
          <span className="inline-block h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          Initializing editor...
        </div>
        <textarea
          readOnly={readOnly}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-[calc(100%-2rem)] w-full resize-none bg-transparent font-mono text-xs text-zinc-300 outline-none"
        />
      </div>
    );
  }

  return (
    <div className="relative h-full w-full overflow-hidden rounded-2xl border border-zinc-800 bg-[#1e1e1e]">
      <Editor
        height="100%"
        width="100%"
        language={language}
        value={value}
        onChange={(val) => onChange(val ?? "")}
        theme="vs-dark"
        onMount={handleEditorMount}
        loading={
          <div className="flex h-full items-center justify-center font-mono text-sm text-zinc-400">
            <span className="mr-2 inline-block h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            Initializing code editor...
          </div>
        }
        options={{
          fontSize,
          lineNumbers: "on",
          lineNumbersMinChars: 3,
          minimap: { enabled: false },
          scrollBeyondLastLine: false,
          automaticLayout: true,
          readOnly,
          padding: { top: 12, bottom: 12 },
          renderLineHighlight: "all",
          bracketPairColorization: { enabled: true },
        }}
      />
    </div>
  );
}

export default MonacoEditor;
