import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence, useReducedMotion } from "motion/react";
import Editor from "@monaco-editor/react";
import PageLayout from "../../components/layout/PageLayout.jsx";
import CodeHintPanel from "../../components/ai/CodeHintPanel.jsx";
import { getAssignments } from "../../api/assignments.js";
import {
  submitAssignment,
  saveSubmissionDraft,
  retractSubmission,
} from "../../api/submissions.js";
import { runCode } from "../../api/exercises.js";
import { useClass } from "../../context/ClassContext.jsx";

// ─── animation variants ────────────────────────────────────────────────────
const listVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.07, delayChildren: 0.05 },
  },
};
const itemVariants = {
  hidden: { opacity: 0, y: 16, filter: "blur(4px)" },
  visible: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { type: "spring", stiffness: 120, damping: 20 },
  },
};

const LANGUAGES = [
  { value: "javascript", label: "JavaScript" },
  { value: "python", label: "Python" },
  { value: "typescript", label: "TypeScript" },
  { value: "java", label: "Java" },
  { value: "cpp", label: "C++" },
  { value: "c", label: "C" },
  { value: "go", label: "Go" },
  { value: "rust", label: "Rust" },
];

const STARTER = {
  javascript: "// Write your solution here\n\n",
  python: "# Write your solution here\n\n",
  typescript: "// Write your solution here\n\n",
  java: "public class Solution {\n    public static void main(String[] args) {\n        // Write your solution here\n    }\n}\n",
  cpp: "#include <iostream>\nusing namespace std;\n\nint main() {\n    // Write your solution here\n    return 0;\n}\n",
  c: "#include <stdio.h>\n\nint main() {\n    // Write your solution here\n    return 0;\n}\n",
  go: 'package main\n\nimport "fmt"\n\nfunc main() {\n    // Write your solution here\n    fmt.Println("Hello!")\n}\n',
  rust: 'fn main() {\n    // Write your solution here\n    println!("Hello!");\n}\n',
};

// ─── main page ─────────────────────────────────────────────────────────────
export default function Homework() {
  const qc = useQueryClient();
  const [activeId, setActiveId] = useState(null);
  const { activeClassId, classes, isLoading: classesLoading } = useClass();

  const { data: assignments = [], isLoading } = useQuery({
    queryKey: ["assignments", activeClassId],
    queryFn: () => getAssignments(activeClassId || undefined),
    enabled: Boolean(activeClassId),
  });

  const pending = assignments.filter((a) => !a.submission?.submittedAt);
  const submitted = assignments.filter((a) =>
    Boolean(a.submission?.submittedAt),
  );

  if (!classesLoading && classes.length === 0) {
    return (
      <PageLayout fullWidth>
        <div className="card mx-auto max-w-lg px-4 pt-16 pb-24 text-center sm:pb-28 md:pt-20 md:pb-32">
          <p className="mb-3 text-3xl">📝</p>
          <h1 className="mb-2 text-xl font-semibold text-gray-800">Homework</h1>
          <h2 className="mb-2 text-lg font-medium text-gray-700">
            Not enrolled in any class
          </h2>
          <p className="text-sm text-gray-500">
            Ask your teacher to add you to a class — your assignments will show
            up here.
          </p>
        </div>
      </PageLayout>
    );
  }

  if (!activeClassId) {
    return (
      <PageLayout fullWidth>
        <div className="card mx-auto max-w-lg px-4 pt-16 pb-24 text-center sm:pb-28 md:pt-20 md:pb-32">
          <p className="mb-3 text-3xl">📝</p>
          <h1 className="mb-2 text-xl font-semibold text-gray-800">Homework</h1>
          <h2 className="mb-2 text-lg font-medium text-gray-700">
            Pick a class first
          </h2>
          <p className="text-sm text-gray-500">
            Use the class selector in the sidebar to choose which class to view.
          </p>
        </div>
      </PageLayout>
    );
  }

  const hasSubmitted = submitted.length > 0;

  return (
    <PageLayout fullWidth>
      {isLoading ? (
        <LoadingSkeleton />
      ) : (
        <div className="space-y-4 pb-24 sm:pb-28 md:pb-32 md:space-y-5">
          <header className="border-b border-gray-100 pb-4 md:pb-5">
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">
              Homework
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              Open assignments and submitted work for your selected class
            </p>
          </header>

          {assignments.length === 0 ? (
            <div className="rounded-xl border border-dashed border-gray-200 bg-white/80 py-16 text-center md:py-20">
              <p className="mb-2 text-5xl">📝</p>
              <p className="text-gray-500">
                No assignments yet — check back soon!
              </p>
            </div>
          ) : (
            <div
              className={
                hasSubmitted
                  ? "grid gap-5 md:gap-6 lg:grid-cols-12 lg:items-start"
                  : "space-y-5"
              }
            >
              {/* ── Open assignments ─────────────────────────────── */}
              <section
                className={hasSubmitted ? "lg:col-span-7 xl:col-span-8" : ""}
              >
                <div className="mb-3 flex items-center gap-3 md:mb-4">
                  <h2 className="text-base font-semibold text-gray-900 md:text-lg">
                    Open Assignments
                  </h2>
                  <span className="rounded-full bg-brand-100 px-2.5 py-0.5 text-xs font-medium text-brand-700">
                    {pending.length}
                  </span>
                </div>

                {pending.length === 0 ? (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.97 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="card p-5 text-center md:p-6"
                  >
                    <p className="mb-2 text-3xl">🎉</p>
                    <p className="font-semibold text-gray-800">
                      All caught up!
                    </p>
                    <p className="mt-1 text-sm text-gray-500">
                      No pending assignments right now.
                    </p>
                  </motion.div>
                ) : (
                  <motion.div
                    variants={listVariants}
                    initial="hidden"
                    animate="visible"
                    className="space-y-3 md:space-y-4"
                  >
                    {pending.map((a) => (
                      <motion.div key={a._id} variants={itemVariants} layout>
                        <AssignmentCard
                          assignment={a}
                          expanded={activeId === a._id}
                          onToggle={() =>
                            setActiveId(activeId === a._id ? null : a._id)
                          }
                          onSuccess={() => {
                            qc.invalidateQueries({ queryKey: ["assignments"] });
                            setActiveId(null);
                          }}
                        />
                      </motion.div>
                    ))}
                  </motion.div>
                )}
              </section>

              {/* ── Submitted ──────────────────────────────────── */}
              {hasSubmitted && (
                <section className="lg:col-span-5 xl:col-span-4">
                  <div className="mb-3 flex items-center gap-3 md:mb-4">
                    <h2 className="text-base font-semibold text-gray-900 md:text-lg">
                      Submitted
                    </h2>
                    <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-600">
                      {submitted.length}
                    </span>
                  </div>
                  <motion.div
                    variants={listVariants}
                    initial="hidden"
                    animate="visible"
                    className="space-y-3"
                  >
                    {submitted.map((a) => (
                      <motion.div key={a._id} variants={itemVariants}>
                        <SubmittedCard assignment={a} />
                      </motion.div>
                    ))}
                  </motion.div>
                </section>
              )}
            </div>
          )}
        </div>
      )}
    </PageLayout>
  );
}

// ─── assignment card (collapsed / expanded) ────────────────────────────────
function AssignmentCard({ assignment, expanded, onToggle, onSuccess }) {
  const isOverdue =
    assignment.dueDate && new Date(assignment.dueDate) < new Date();

  return (
    <div
      className={`card transition-shadow duration-200 overflow-hidden ${expanded ? "shadow-lg" : "hover:shadow-md"}`}
    >
      {/* Header row */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-semibold text-gray-900">{assignment.title}</h3>
            {assignment.lessonId?.title && (
              <span className="text-xs bg-brand-50 text-brand-600 px-2 py-0.5 rounded-full">
                {assignment.lessonId.title}
              </span>
            )}
            {isOverdue && (
              <span className="text-xs bg-red-50 text-red-500 px-2 py-0.5 rounded-full font-medium">
                Overdue
              </span>
            )}
          </div>
          {assignment.dueDate && (
            <p className="text-xs text-gray-400 mt-1">
              Due{" "}
              {new Date(assignment.dueDate).toLocaleDateString("en-US", {
                month: "long",
                day: "numeric",
                year: "numeric",
              })}
            </p>
          )}
        </div>

        <motion.button
          onClick={onToggle}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.97 }}
          transition={{ type: "spring", stiffness: 400, damping: 25 }}
          className={`shrink-0 btn text-sm py-1.5 px-4 ${expanded ? "btn-secondary" : "btn-primary"}`}
        >
          {expanded ? "Collapse" : "Open & Submit"}
        </motion.button>
      </div>

      {/* Expanded IDE submission form */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            key="ide-form"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ type: "spring", stiffness: 200, damping: 30 }}
            className="overflow-hidden"
          >
            <div className="mt-5 pt-5 border-t border-gray-100">
              <IDESubmissionForm
                assignment={assignment}
                onSuccess={onSuccess}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── browser-side JS runner (no API needed) ───────────────────────────────
function runJavaScriptInBrowser(code) {
  const logs = [];
  const errors = [];

  // Capture console.log output
  const origLog = console.log;
  const origError = console.error;
  const origWarn = console.warn;

  console.log = (...args) => logs.push(args.map(String).join(" "));
  console.error = (...args) => errors.push(args.map(String).join(" "));
  console.warn = (...args) => logs.push("[warn] " + args.map(String).join(" "));

  let stderr = "";
  try {
    // eslint-disable-next-line no-new-func
    new Function(code)();
  } catch (e) {
    stderr = e.toString();
  } finally {
    console.log = origLog;
    console.error = origError;
    console.warn = origWarn;
  }

  const errorOutput = errors.join("\n");
  return {
    stdout: logs.join("\n"),
    stderr: stderr || errorOutput,
    compile_output: "",
    status: stderr || errorOutput ? "Runtime Error" : "Accepted",
    time: null,
  };
}

// ─── IDE submission form ───────────────────────────────────────────────────
function IDESubmissionForm({ assignment, onSuccess }) {
  const qc = useQueryClient();
  const shouldReduce = useReducedMotion();
  const sub = assignment.submission;
  const finalized = Boolean(sub?.submittedAt);

  const [language, setLanguage] = useState("javascript");
  const [code, setCode] = useState(() => initialCodeFromAssignment(assignment));
  const [githubLink, setGithubLink] = useState(sub?.draftGithubLink || "");
  const [output, setOutput] = useState(null);
  const [activeTab, setActiveTab] = useState("code"); // 'code' | 'output'
  const [draftSavedAt, setDraftSavedAt] = useState(sub?.draftUpdatedAt || null);

  const handleLanguageChange = (lang) => {
    setLanguage(lang);
    setCode(STARTER[lang] || "");
    setOutput(null);
  };

  // Run code — JS runs instantly in the browser, other languages go to Judge0
  const runMutation = useMutation({
    mutationFn: async () => {
      if (language === "javascript") {
        // Instant, no network call needed
        return runJavaScriptInBrowser(code);
      }
      return runCode({ code, language });
    },
    onSuccess: (data) => {
      setOutput(data);
      setActiveTab("output");
    },
  });

  const draftMutation = useMutation({
    mutationFn: (payload) => saveSubmissionDraft(payload),
    onSuccess: (data) => {
      setDraftSavedAt(data.draftUpdatedAt);
      qc.invalidateQueries({ queryKey: ["assignments"] });
    },
  });

  // Submit assignment
  const submitMutation = useMutation({
    mutationFn: () =>
      submitAssignment({
        assignmentId: assignment._id,
        content: code,
        githubLink: githubLink.trim() || undefined,
      }),
    onSuccess,
  });

  useEffect(() => {
    if (finalized) return;
    const t = setTimeout(() => {
      if (!code.trim() && !githubLink.trim()) return;
      draftMutation.mutate({
        assignmentId: assignment._id,
        content: code,
        githubLink: githubLink.trim(),
      });
    }, 1200);
    return () => clearTimeout(t);
  }, [code, githubLink, assignment._id, finalized]);

  const displaySaved = draftSavedAt || sub?.draftUpdatedAt;

  const hasStdout = output?.stdout?.trim();
  const hasError = output?.stderr?.trim() || output?.compile_output?.trim();
  const statusOk = output?.status === "Accepted";

  return (
    <div className="space-y-5">
      {/* Instructions panel */}
      <div className="rounded-xl bg-gradient-to-br from-brand-50 to-indigo-50 border border-brand-100 p-4">
        <p className="text-xs font-semibold text-brand-700 uppercase tracking-wide mb-2">
          Instructions
        </p>
        <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
          {assignment.instructions}
        </p>
      </div>

      {/* IDE shell */}
      <div className="rounded-xl border border-gray-200 overflow-hidden shadow-sm">
        {/* IDE top bar */}
        <div className="bg-gray-900 flex items-center justify-between gap-3 px-4 py-2.5">
          {/* Traffic lights */}
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-red-500 opacity-80" />
            <span className="w-3 h-3 rounded-full bg-yellow-400 opacity-80" />
            <span className="w-3 h-3 rounded-full bg-green-500 opacity-80" />
          </div>

          {/* Tabs */}
          <div className="flex gap-1">
            {["code", "output"].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-3 py-1 rounded-md text-xs font-medium transition-colors capitalize ${
                  activeTab === tab
                    ? "bg-gray-700 text-white"
                    : "text-gray-400 hover:text-gray-200"
                }`}
              >
                {tab}
                {tab === "output" && output && (
                  <span
                    className={`ml-1.5 inline-block w-1.5 h-1.5 rounded-full ${statusOk && !hasError ? "bg-green-400" : "bg-red-400"}`}
                  />
                )}
              </button>
            ))}
          </div>

          {/* Language selector */}
          <select
            value={language}
            onChange={(e) => handleLanguageChange(e.target.value)}
            className="bg-gray-800 text-gray-200 text-xs rounded-md px-2 py-1 border border-gray-700 focus:outline-none focus:ring-1 focus:ring-brand-500"
          >
            {LANGUAGES.map((l) => (
              <option key={l.value} value={l.value}>
                {l.label}
              </option>
            ))}
          </select>
        </div>

        {/* Editor / Output pane */}
        <AnimatePresence mode="wait">
          {activeTab === "code" ? (
            <motion.div
              key="editor"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              <Editor
                height="380px"
                language={language}
                value={code}
                onChange={(val) => setCode(val || "")}
                theme="vs-dark"
                options={{
                  fontSize: 14,
                  minimap: { enabled: false },
                  scrollBeyondLastLine: false,
                  lineNumbers: "on",
                  automaticLayout: true,
                  padding: { top: 12, bottom: 12 },
                  tabSize: 2,
                  wordWrap: "on",
                  suggestOnTriggerCharacters: true,
                  quickSuggestions: true,
                }}
              />
              <div className="mt-3">
                <CodeHintPanel
                  code={code}
                  language={language}
                  lessonId={assignment.lessonId?._id || assignment.lessonId}
                  assignmentId={assignment._id}
                />
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="output"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="bg-gray-950 h-[380px] overflow-auto font-mono text-sm p-4"
            >
              {output === null ? (
                <p className="text-gray-500 text-center mt-16">
                  Run your code to see output here
                </p>
              ) : (
                <div className="space-y-3">
                  {/* Status badge */}
                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${
                        statusOk && !hasError
                          ? "bg-green-900/50 text-green-300 border border-green-700"
                          : "bg-red-900/50 text-red-300 border border-red-700"
                      }`}
                    >
                      <span>{statusOk && !hasError ? "✓" : "✗"}</span>
                      {output.status}
                    </span>
                    {output.time && (
                      <span className="text-xs text-gray-500">
                        {output.time}s
                      </span>
                    )}
                  </div>

                  {hasStdout && (
                    <div>
                      <p className="text-xs text-gray-500 mb-1">stdout</p>
                      <pre className="text-green-300 whitespace-pre-wrap">
                        {output.stdout}
                      </pre>
                    </div>
                  )}
                  {output?.stderr?.trim() && (
                    <div>
                      <p className="text-xs text-gray-500 mb-1">stderr</p>
                      <pre className="text-red-400 whitespace-pre-wrap">
                        {output.stderr}
                      </pre>
                    </div>
                  )}
                  {output?.compile_output?.trim() && (
                    <div>
                      <p className="text-xs text-gray-500 mb-1">compiler</p>
                      <pre className="text-yellow-400 whitespace-pre-wrap">
                        {output.compile_output}
                      </pre>
                    </div>
                  )}
                  {!hasStdout && !hasError && (
                    <p className="text-gray-500">(no output)</p>
                  )}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* IDE bottom bar — run button */}
        <div className="bg-gray-900 border-t border-gray-800 px-4 py-2.5 flex items-center justify-between gap-3">
          <span className="text-xs text-gray-500 font-mono">
            {code.split("\n").length} lines
          </span>
          <motion.button
            onClick={() => {
              setActiveTab("code");
              runMutation.mutate();
            }}
            disabled={runMutation.isPending || !code.trim()}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.96 }}
            transition={{ type: "spring", stiffness: 400, damping: 25 }}
            className="flex items-center gap-2 px-4 py-1.5 rounded-lg bg-green-600 hover:bg-green-500 text-white text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {runMutation.isPending ? (
              <>
                <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Running…
              </>
            ) : (
              <>
                <span>▶</span>
                Run Code
              </>
            )}
          </motion.button>
        </div>
      </div>

      {runMutation.isError && (
        <motion.div
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700"
        >
          {runMutation.error?.response?.data?.message ||
            "Failed to run code — check your Judge0 API key in the backend .env."}
        </motion.div>
      )}

      {/* GitHub link + submit */}
      <div className="space-y-3 pt-1">
        <div>
          <label className="label">
            GitHub Link{" "}
            <span className="text-gray-400 font-normal">(optional)</span>
          </label>
          <input
            type="url"
            value={githubLink}
            onChange={(e) => setGithubLink(e.target.value)}
            className="input"
            placeholder="https://github.com/you/repo"
          />
        </div>

        {submitMutation.isError && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-sm text-red-600"
          >
            {submitMutation.error?.response?.data?.message ||
              "Submission failed — please try again."}
          </motion.p>
        )}

        <motion.button
          onClick={() => submitMutation.mutate()}
          disabled={submitMutation.isPending || !code.trim()}
          whileHover={{ scale: 1.01, y: -1 }}
          whileTap={{ scale: 0.98 }}
          transition={{ type: "spring", stiffness: 400, damping: 25 }}
          className="btn-primary w-full py-3 text-base"
        >
          <AnimatePresence mode="wait">
            {submitMutation.isPending ? (
              <motion.span
                key="submitting"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex items-center justify-center gap-2"
              >
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Submitting…
              </motion.span>
            ) : (
              <motion.span
                key="idle"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                Submit Assignment
              </motion.span>
            )}
          </AnimatePresence>
        </motion.button>

        {!finalized && (
          <div className="text-xs text-gray-500 text-center min-h-[1.35rem] flex items-center justify-center">
            <AnimatePresence mode="wait">
              {draftMutation.isPending ? (
                <motion.span
                  key="draft-saving"
                  initial={shouldReduce ? false : { opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={shouldReduce ? undefined : { opacity: 0, y: -4 }}
                  transition={{ type: "spring", stiffness: 320, damping: 28 }}
                  className="text-brand-600"
                >
                  Saving draft…
                </motion.span>
              ) : displaySaved ? (
                <motion.span
                  key={`draft-saved-${displaySaved}`}
                  initial={shouldReduce ? false : { opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={shouldReduce ? undefined : { opacity: 0, y: -4 }}
                  transition={{ type: "spring", stiffness: 320, damping: 28 }}
                >
                  Draft saved{" "}
                  {new Date(displaySaved).toLocaleTimeString("en-US", {
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                </motion.span>
              ) : (
                <motion.span
                  key="draft-hint"
                  initial={shouldReduce ? false : { opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={shouldReduce ? undefined : { opacity: 0 }}
                  className="text-gray-400"
                >
                  Draft saves automatically while you type
                </motion.span>
              )}
            </AnimatePresence>
          </div>
        )}
        <p className="text-xs text-gray-400 text-center">
          Your code will be submitted as-is. You can run it first to verify it
          works.
        </p>
      </div>
    </div>
  );
}

function initialCodeFromAssignment(assignment) {
  const s = assignment.submission;
  if (!s) return STARTER.javascript;
  if (s.submittedAt) return s.content || STARTER.javascript;
  if (s.draftContent) return s.draftContent;
  return STARTER.javascript;
}

// ─── submitted card ────────────────────────────────────────────────────────
function SubmittedCard({ assignment }) {
  const sub = assignment.submission;
  const hasGrade = sub?.grade != null;
  const [expanded, setExpanded] = useState(false);
  const qc = useQueryClient();

  const retractMutation = useMutation({
    mutationFn: () => retractSubmission(sub._id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["assignments"] }),
  });

  const hasDetails = sub.feedback || sub.content || sub.githubLink;

  return (
    <div
      className={`card border-l-4 transition-shadow duration-200 overflow-hidden ${
        hasGrade ? "border-l-green-400" : "border-l-yellow-400"
      } ${expanded ? "shadow-md" : "hover:shadow-sm"}`}
    >
      {/* ── Always-visible header row ─────────────────────── */}
      <button
        onClick={() => hasDetails && setExpanded((v) => !v)}
        className={`w-full text-left flex items-center justify-between gap-4 ${hasDetails ? "cursor-pointer" : "cursor-default"}`}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-semibold text-gray-900">{assignment.title}</h3>
            {assignment.lessonId?.title && (
              <span className="text-xs bg-brand-50 text-brand-600 px-2 py-0.5 rounded-full">
                {assignment.lessonId.title}
              </span>
            )}
          </div>
          <p className="text-xs text-gray-400 mt-0.5">
            Submitted{" "}
            {new Date(sub.submittedAt).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            })}
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          {/* Grade badge */}
          {hasGrade ? (
            <div className="text-right">
              <span
                className={`text-2xl font-bold ${sub.grade >= 70 ? "text-green-600" : "text-red-500"}`}
              >
                {sub.grade}
              </span>
              <span className="text-sm text-gray-400">/100</span>
            </div>
          ) : (
            <span className="text-xs bg-yellow-50 text-yellow-700 border border-yellow-200 px-2.5 py-1 rounded-full font-medium">
              Awaiting grade
            </span>
          )}

          {/* Retract button — only shown for ungraded submissions */}
          {!hasGrade && (
            <motion.button
              onClick={(e) => {
                e.stopPropagation();
                if (
                  window.confirm(
                    "Retract this submission? It will go back to draft so you can edit and re-submit.",
                  )
                ) {
                  retractMutation.mutate();
                }
              }}
              disabled={retractMutation.isPending}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              transition={{ type: "spring", stiffness: 400, damping: 25 }}
              className="text-xs px-2.5 py-1 rounded-full border border-gray-200 text-gray-500 hover:border-red-300 hover:text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
              title="Retract submission to edit and re-submit"
            >
              {retractMutation.isPending ? "…" : "Retract"}
            </motion.button>
          )}

          {/* Chevron */}
          {hasDetails && (
            <motion.span
              animate={{ rotate: expanded ? 180 : 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
              className="text-gray-400 text-sm select-none"
            >
              ▼
            </motion.span>
          )}
        </div>
      </button>

      {/* ── Collapsible details ───────────────────────────── */}
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            key="details"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ type: "spring", stiffness: 220, damping: 28 }}
            className="overflow-hidden"
          >
            <div className="mt-4 pt-4 border-t border-gray-100 space-y-4">
              {/* Feedback */}
              {sub.feedback && (
                <div>
                  <p className="text-xs font-semibold text-gray-500 mb-1.5">
                    Teacher feedback
                  </p>
                  <p className="text-sm text-gray-700 bg-brand-50 rounded-lg p-3 border border-brand-100 leading-relaxed">
                    {sub.feedback}
                  </p>
                </div>
              )}

              {/* Submitted code */}
              {sub.content && (
                <div>
                  <p className="text-xs font-semibold text-gray-500 mb-2">
                    Submitted code
                  </p>
                  <div className="rounded-lg overflow-hidden border border-gray-200">
                    <Editor
                      height="220px"
                      value={sub.content}
                      theme="vs-dark"
                      options={{
                        readOnly: true,
                        fontSize: 13,
                        minimap: { enabled: false },
                        scrollBeyondLastLine: false,
                        lineNumbers: "on",
                        automaticLayout: true,
                        padding: { top: 10, bottom: 10 },
                      }}
                    />
                  </div>
                </div>
              )}

              {/* GitHub link */}
              {sub.githubLink && (
                <a
                  href={sub.githubLink}
                  target="_blank"
                  rel="noreferrer"
                  className="text-sm text-brand-600 hover:underline flex items-center gap-1.5"
                  onClick={(e) => e.stopPropagation()}
                >
                  🔗 {sub.githubLink}
                </a>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── loading skeleton ──────────────────────────────────────────────────────
function LoadingSkeleton() {
  return (
    <div className="space-y-4 pb-24 sm:pb-28 md:pb-32">
      <div className="h-10 max-w-xs animate-pulse rounded-lg bg-gray-200" />
      <div className="grid gap-4 lg:grid-cols-12">
        <div className="space-y-3 lg:col-span-8">
          {[1, 2].map((i) => (
            <div key={i} className="card animate-pulse p-4">
              <div className="flex justify-between gap-4">
                <div className="flex-1 space-y-2">
                  <div className="h-5 w-2/3 rounded bg-gray-200" />
                  <div className="h-3 w-1/3 rounded bg-gray-200" />
                </div>
                <div className="h-8 w-24 shrink-0 rounded-lg bg-gray-200" />
              </div>
            </div>
          ))}
        </div>
        <div className="hidden space-y-3 lg:col-span-4 lg:block">
          <div className="card h-32 animate-pulse p-4" />
        </div>
      </div>
    </div>
  );
}
