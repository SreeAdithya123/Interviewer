"use client";

import React from "react";
import Editor, { type OnMount } from "@monaco-editor/react";

interface MonacoEditorProps {
  language: string;
  value: string;
  onChange: (value: string) => void;
  fontSize?: number;
  readOnly?: boolean;
}

export function MonacoEditor({
  language,
  value,
  onChange,
  fontSize = 14,
  readOnly = false,
}: MonacoEditorProps) {
  const handleEditorMount: OnMount = (editor) => {
    // Focus editor on mount if active
    editor.updateOptions({
      tabSize: 4,
      fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', Menlo, monospace",
      fontLigatures: true,
      cursorBlinking: "smooth",
      smoothScrolling: true,
    });
  };

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
