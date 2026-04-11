import Editor from "@monaco-editor/react";

const LANGUAGE_MAP = {
  javascript: "javascript",
  python: "python",
  java: "java",
  cpp: "cpp",
  c: "c",
  typescript: "typescript",
  go: "go",
  rust: "rust",
};

export default function CodeEditor({
  language = "javascript",
  value,
  onChange,
  height = "400px",
  readOnly = false,
}) {
  return (
    <div className="rounded-lg overflow-hidden border border-gray-200">
      <Editor
        height={height}
        language={LANGUAGE_MAP[language] || "javascript"}
        value={value}
        onChange={onChange}
        theme="vs-dark"
        options={{
          fontSize: 14,
          minimap: { enabled: false },
          scrollBeyondLastLine: false,
          lineNumbers: "on",
          renderLineHighlight: "all",
          automaticLayout: true,
          padding: { top: 12, bottom: 12 },
          readOnly,
          tabSize: 2,
          wordWrap: "on",
        }}
      />
    </div>
  );
}
