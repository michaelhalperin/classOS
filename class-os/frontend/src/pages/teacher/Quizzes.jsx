import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence, useReducedMotion } from "motion/react";
import PageLayout from "../../components/layout/PageLayout.jsx";
import { useClass } from "../../context/ClassContext.jsx";
import { getLessons } from "../../api/lessons.js";
import { generateQuizFromLesson } from "../../api/ai.js";
import {
  getQuizzes,
  createQuiz,
  updateQuiz,
  deleteQuiz,
  getQuizAttempts,
} from "../../api/quizzes.js";

const spring = { type: "spring", stiffness: 100, damping: 20 };

const BLANK_QUESTION = () => ({
  text: "",
  type: "mcq",
  options: ["", "", "", ""],
  correctAnswer: "",
  explanation: "",
  points: 1,
});

const BLANK_QUIZ = (lessonId = "") => ({
  lessonId,
  title: "",
  description: "",
  questions: [BLANK_QUESTION()],
  isPublished: false,
});

export default function Quizzes() {
  const shouldReduce = useReducedMotion();
  const { activeClassId, classes, isLoading: classesLoading } = useClass();
  const qc = useQueryClient();

  // 'list' | 'new' | 'edit'
  const [view, setView] = useState("list");
  const [editingQuiz, setEditingQuiz] = useState(null);
  const [attemptsModal, setAttemptsModal] = useState(null);

  const { data: lessons = [] } = useQuery({
    queryKey: ["lessons", activeClassId],
    queryFn: () => getLessons(activeClassId),
    enabled: Boolean(activeClassId),
  });

  const { data: rawQuizzes, isLoading } = useQuery({
    queryKey: ["quizzes", activeClassId],
    queryFn: () => getQuizzes({ classId: activeClassId }),
    enabled: Boolean(activeClassId),
  });
  const quizzes = Array.isArray(rawQuizzes) ? rawQuizzes : [];

  const deleteMut = useMutation({
    mutationFn: deleteQuiz,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["quizzes"] }),
  });

  const togglePublishMut = useMutation({
    mutationFn: ({ id, isPublished }) => updateQuiz(id, { isPublished }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["quizzes"] }),
  });

  function openNew() {
    setEditingQuiz(BLANK_QUIZ(lessons[0]?._id || ""));
    setView("new");
  }

  function openEdit(quiz) {
    setEditingQuiz(quiz);
    setView("edit");
  }

  function backToList() {
    setView("list");
    setEditingQuiz(null);
  }

  function handleSaved() {
    qc.invalidateQueries({ queryKey: ["quizzes"] });
    backToList();
  }

  if (!classesLoading && classes.length === 0) {
    return (
      <PageLayout fullWidth>
        <div className="card mx-auto max-w-lg px-4 py-16 text-center">
          <p className="mb-4 text-gray-600">Create a class first.</p>
        </div>
      </PageLayout>
    );
  }

  // ── Editor view (new or edit) ────────────────────────────────────────────
  if (view === "new" || view === "edit") {
    return (
      <PageLayout fullWidth>
        <div className="space-y-6 pb-24 sm:space-y-7 sm:pb-28 md:pb-32">
          <header className="flex flex-col gap-4 border-b border-gray-100 pb-5 md:flex-row md:items-center md:justify-between md:pb-6">
            <div className="min-w-0">
              <h1 className="text-2xl font-bold tracking-tight text-gray-900 md:text-3xl">
                {view === "new" ? "New Quiz" : "Edit Quiz"}
              </h1>
              <p className="mt-1 max-w-2xl text-sm text-gray-600">
                Link a lesson, add questions (or generate with AI), then publish
                when ready.
              </p>
            </div>
            <button
              type="button"
              onClick={backToList}
              className="btn-secondary shrink-0"
            >
              ← Back to Quizzes
            </button>
          </header>
          <QuizEditorInline
            quiz={editingQuiz}
            lessons={lessons}
            onCancel={backToList}
            onSaved={handleSaved}
          />
        </div>
      </PageLayout>
    );
  }

  // ── List view ─────────────────────────────────────────────────────────────
  return (
    <PageLayout fullWidth>
      <div className="space-y-6 pb-24 sm:space-y-7 sm:pb-28 md:pb-32">
        <header className="flex flex-col gap-4 border-b border-gray-100 pb-5 md:flex-row md:items-center md:justify-between md:pb-6">
          <div className="min-w-0">
            <h1 className="text-2xl font-bold tracking-tight text-gray-900 md:text-3xl">
              Quizzes
            </h1>
            <p className="mt-1 max-w-2xl text-sm text-gray-600">
              Build multiple-choice and short-answer quizzes; students see only
              published quizzes.
            </p>
          </div>
          <button
            type="button"
            onClick={openNew}
            className="btn-primary shrink-0"
          >
            + New Quiz
          </button>
        </header>

        {isLoading ? (
          <LoadingSkeleton />
        ) : quizzes.length === 0 ? (
          <motion.div
            initial={shouldReduce ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="card text-center py-24"
          >
            <p className="text-5xl mb-4">📝</p>
            <h2 className="text-xl font-semibold text-gray-700">
              No quizzes yet
            </h2>
            <p className="text-gray-400 mt-1 mb-6">
              Create a quiz and publish it so students can take it.
            </p>
            <button onClick={openNew} className="btn-primary">
              Create First Quiz
            </button>
          </motion.div>
        ) : (
          <motion.div
            variants={
              shouldReduce
                ? undefined
                : {
                    hidden: { opacity: 0 },
                    visible: {
                      opacity: 1,
                      transition: { staggerChildren: 0.06 },
                    },
                  }
            }
            initial={shouldReduce ? false : "hidden"}
            animate="visible"
            className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3"
          >
            {quizzes.map((quiz) => (
              <motion.div
                key={quiz._id}
                variants={
                  shouldReduce
                    ? undefined
                    : {
                        hidden: { opacity: 0, y: 12 },
                        visible: { opacity: 1, y: 0, transition: spring },
                      }
                }
                className="card flex h-full flex-col"
              >
                <div className="flex min-h-0 flex-1 flex-col gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-semibold text-gray-900 line-clamp-2">
                        {quiz.title}
                      </h3>
                      <span
                        className={`shrink-0 text-xs px-2 py-0.5 rounded-full font-medium ${
                          quiz.isPublished
                            ? "bg-green-100 text-green-700"
                            : "bg-gray-100 text-gray-500"
                        }`}
                      >
                        {quiz.isPublished ? "Published" : "Draft"}
                      </span>
                    </div>
                    {quiz.lessonId?.title && (
                      <p className="mt-1 text-xs text-brand-600 line-clamp-1">
                        {quiz.lessonId.title}
                      </p>
                    )}
                    <p className="mt-2 line-clamp-2 text-sm text-gray-500">
                      <span className="font-medium text-gray-700">
                        {quiz.questions?.length || 0}
                      </span>{" "}
                      question{quiz.questions?.length !== 1 ? "s" : ""}
                      {quiz.description ? ` · ${quiz.description}` : ""}
                    </p>
                  </div>

                  <div className="flex shrink-0 flex-wrap items-center justify-end gap-2 border-t border-gray-100 pt-3">
                    <button
                      onClick={() => setAttemptsModal(quiz._id)}
                      className="btn-secondary text-sm py-1.5 px-3"
                    >
                      Results
                    </button>
                    <button
                      onClick={() =>
                        togglePublishMut.mutate({
                          id: quiz._id,
                          isPublished: !quiz.isPublished,
                        })
                      }
                      className={`text-sm py-1.5 px-3 rounded-lg font-medium transition-colors ${
                        quiz.isPublished
                          ? "bg-yellow-100 text-yellow-700 hover:bg-yellow-200"
                          : "bg-green-100 text-green-700 hover:bg-green-200"
                      }`}
                    >
                      {quiz.isPublished ? "Unpublish" : "Publish"}
                    </button>
                    <button
                      onClick={() => openEdit(quiz)}
                      className="btn-secondary text-sm py-1.5 px-3"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => {
                        if (
                          window.confirm(
                            `Delete "${quiz.title}"? This also removes all student attempts.`,
                          )
                        ) {
                          deleteMut.mutate(quiz._id);
                        }
                      }}
                      className="rounded-lg px-3 py-1.5 text-sm text-red-500 transition-colors hover:bg-red-50"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}

        {/* Attempts modal — stays as modal since it's just a read-only results overlay */}
        <AnimatePresence>
          {attemptsModal && (
            <AttemptsModal
              quizId={attemptsModal}
              onClose={() => setAttemptsModal(null)}
            />
          )}
        </AnimatePresence>
      </div>
    </PageLayout>
  );
}

// ── Quiz editor (inline page) ─────────────────────────────────────────────────
function QuizEditorInline({ quiz, lessons, onCancel, onSaved }) {
  const isNew = !quiz._id;
  const [form, setForm] = useState({
    lessonId: quiz.lessonId?._id || quiz.lessonId || "",
    title: quiz.title || "",
    description: quiz.description || "",
    questions:
      quiz.questions?.length > 0
        ? quiz.questions.map((q) => ({ ...q }))
        : [BLANK_QUESTION()],
    isPublished: quiz.isPublished || false,
  });
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiError, setAiError] = useState("");
  const [questionCount, setQuestionCount] = useState(8);

  const mutation = useMutation({
    mutationFn: () => (isNew ? createQuiz(form) : updateQuiz(quiz._id, form)),
    onSuccess: onSaved,
  });

  const setQ = (idx, field, value) =>
    setForm((f) => ({
      ...f,
      questions: f.questions.map((q, i) =>
        i === idx ? { ...q, [field]: value } : q,
      ),
    }));

  const addQuestion = () =>
    setForm((f) => ({ ...f, questions: [...f.questions, BLANK_QUESTION()] }));

  const removeQuestion = (idx) =>
    setForm((f) => ({
      ...f,
      questions: f.questions.filter((_, i) => i !== idx),
    }));

  const handleAiGenerate = async () => {
    if (!form.lessonId) {
      setAiError("Choose a lesson first.");
      return;
    }
    setAiError("");
    setAiGenerating(true);
    try {
      const data = await generateQuizFromLesson(form.lessonId, questionCount);
      setForm((f) => ({
        ...f,
        title: f.title || data.title,
        description: f.description || data.description,
        questions: data.questions.length > 0 ? data.questions : f.questions,
      }));
    } catch (e) {
      setAiError(
        e.response?.data?.message ||
          "AI generation failed. Check your API key.",
      );
    } finally {
      setAiGenerating(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 200, damping: 26 }}
      className="space-y-6"
    >
      {/* Basic info */}
      <div className="card space-y-5">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <h2 className="font-semibold text-gray-800">Quiz Details</h2>
          {/* AI generate strip */}
          <div className="flex items-center gap-2 flex-wrap">
            <label className="text-sm text-gray-500">Questions:</label>
            <select
              value={questionCount}
              onChange={(e) => setQuestionCount(Number(e.target.value))}
              className="input text-sm py-1 px-2 w-20"
            >
              {[4, 6, 8, 10, 12].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
            <button
              onClick={handleAiGenerate}
              disabled={aiGenerating || !form.lessonId}
              className="flex items-center gap-2 px-4 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium transition-colors disabled:opacity-50"
            >
              {aiGenerating ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Generating…
                </>
              ) : (
                <>
                  <span>✨</span> Generate with AI
                </>
              )}
            </button>
          </div>
        </div>
        {aiError && <p className="text-sm text-red-600">{aiError}</p>}
        {aiGenerating && (
          <div className="rounded-xl bg-purple-50 border border-purple-200 px-4 py-3 text-sm text-purple-700 flex items-center gap-2">
            <span className="w-4 h-4 border-2 border-purple-500 border-t-transparent rounded-full animate-spin shrink-0" />
            Reading lesson content and writing questions… this takes ~10
            seconds.
          </div>
        )}
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="label">Title *</label>
            <input
              className="input"
              value={form.title}
              onChange={(e) =>
                setForm((f) => ({ ...f, title: e.target.value }))
              }
              placeholder="Week 1 Quiz"
              autoFocus
            />
          </div>
          <div>
            <label className="label">Lesson *</label>
            <select
              className="input"
              value={form.lessonId}
              onChange={(e) =>
                setForm((f) => ({ ...f, lessonId: e.target.value }))
              }
            >
              <option value="">Choose lesson…</option>
              {lessons.map((l) => (
                <option key={l._id} value={l._id}>
                  W{l.weekNumber} · {l.title}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div>
          <label className="label">
            Description{" "}
            <span className="text-gray-400 font-normal">(optional)</span>
          </label>
          <input
            className="input"
            value={form.description}
            onChange={(e) =>
              setForm((f) => ({ ...f, description: e.target.value }))
            }
            placeholder="Brief description of this quiz"
          />
        </div>
      </div>

      {/* Questions */}
      <div className="card space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-gray-800">
            Questions{" "}
            <span className="text-sm text-gray-400 font-normal">
              ({form.questions.length})
            </span>
          </h2>
          <button
            onClick={addQuestion}
            className="btn-secondary text-sm py-1.5 px-3"
          >
            + Add Question
          </button>
        </div>

        <AnimatePresence initial={false}>
          {form.questions.map((q, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, height: 0, marginTop: 0 }}
              transition={{ type: "spring", stiffness: 260, damping: 26 }}
            >
              <QuestionEditor
                question={q}
                index={idx}
                total={form.questions.length}
                onChange={(field, value) => setQ(idx, field, value)}
                onRemove={() => removeQuestion(idx)}
              />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Publish + actions */}
      <div className="card flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <label className="flex items-center gap-3 cursor-pointer select-none">
          <button
            type="button"
            role="switch"
            aria-checked={form.isPublished}
            onClick={() =>
              setForm((f) => ({ ...f, isPublished: !f.isPublished }))
            }
            className={`relative w-10 h-6 rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 ${
              form.isPublished ? "bg-brand-600" : "bg-gray-300"
            }`}
          >
            <span
              className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                form.isPublished ? "translate-x-4" : ""
              }`}
            />
          </button>
          <span className="text-sm font-medium text-gray-700">
            {form.isPublished
              ? "Published — students can see this"
              : "Draft — not visible to students"}
          </span>
        </label>

        <div className="flex gap-3">
          {mutation.isError && (
            <p className="text-sm text-red-600 self-center">
              {mutation.error?.response?.data?.message || "Failed to save."}
            </p>
          )}
          <button onClick={onCancel} className="btn-secondary">
            Cancel
          </button>
          <button
            onClick={() => mutation.mutate()}
            disabled={
              mutation.isPending || !form.title.trim() || !form.lessonId
            }
            className="btn-primary"
          >
            {mutation.isPending
              ? "Saving…"
              : isNew
                ? "Create Quiz"
                : "Save Changes"}
          </button>
        </div>
      </div>
    </motion.div>
  );
}

// ── Question editor ───────────────────────────────────────────────────────────
function QuestionEditor({ question, index, total, onChange, onRemove }) {
  return (
    <div className="border border-gray-200 rounded-xl p-4 space-y-3 bg-gray-50/50">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
          Q{index + 1}
        </span>
        {total > 1 && (
          <button
            onClick={onRemove}
            className="text-xs text-red-500 hover:text-red-700"
          >
            Remove
          </button>
        )}
      </div>

      <div>
        <label className="label text-xs">Question *</label>
        <textarea
          rows={2}
          className="input resize-none text-sm"
          value={question.text}
          onChange={(e) => onChange("text", e.target.value)}
          placeholder="What is the output of console.log(typeof null)?"
        />
      </div>

      <div className="flex gap-3 items-center flex-wrap">
        <div>
          <label className="label text-xs">Type</label>
          <select
            className="input text-sm py-1.5"
            value={question.type}
            onChange={(e) => {
              onChange("type", e.target.value);
              onChange("correctAnswer", "");
              if (e.target.value === "true_false") {
                onChange("options", ["True", "False"]);
              } else if (e.target.value === "mcq") {
                onChange("options", ["", "", "", ""]);
              } else {
                onChange("options", []);
              }
            }}
          >
            <option value="mcq">Multiple Choice</option>
            <option value="true_false">True / False</option>
            <option value="short">Short Answer</option>
          </select>
        </div>
        <div>
          <label className="label text-xs">Points</label>
          <input
            type="number"
            min={1}
            className="input text-sm py-1.5 w-20"
            value={question.points}
            onChange={(e) => onChange("points", Number(e.target.value) || 1)}
          />
        </div>
      </div>

      {/* MCQ options */}
      {question.type === "mcq" && (
        <div>
          <label className="label text-xs">
            Options (mark correct with radio)
          </label>
          <div className="space-y-2">
            {question.options.map((opt, oi) => (
              <div key={oi} className="flex items-center gap-2">
                <input
                  type="radio"
                  name={`correct-${index}`}
                  checked={question.correctAnswer === opt && opt !== ""}
                  onChange={() => onChange("correctAnswer", opt)}
                  className="accent-brand-600"
                />
                <input
                  type="text"
                  className="input text-sm flex-1"
                  value={opt}
                  onChange={(e) => {
                    const opts = question.options.map((o, i) =>
                      i === oi ? e.target.value : o,
                    );
                    onChange("options", opts);
                    if (question.correctAnswer === question.options[oi]) {
                      onChange("correctAnswer", e.target.value);
                    }
                  }}
                  placeholder={`Option ${oi + 1}`}
                />
              </div>
            ))}
            {question.options.length < 6 && (
              <button
                onClick={() => onChange("options", [...question.options, ""])}
                className="text-xs text-brand-600 hover:underline"
              >
                + Add option
              </button>
            )}
          </div>
        </div>
      )}

      {/* True/False */}
      {question.type === "true_false" && (
        <div>
          <label className="label text-xs">Correct Answer</label>
          <div className="flex gap-4">
            {["True", "False"].map((v) => (
              <label
                key={v}
                className="flex items-center gap-2 cursor-pointer text-sm"
              >
                <input
                  type="radio"
                  name={`tf-${index}`}
                  checked={
                    question.correctAnswer.toLowerCase() === v.toLowerCase()
                  }
                  onChange={() => onChange("correctAnswer", v.toLowerCase())}
                  className="accent-brand-600"
                />
                {v}
              </label>
            ))}
          </div>
        </div>
      )}

      {/* Short answer */}
      {question.type === "short" && (
        <div>
          <label className="label text-xs">
            Expected Answer{" "}
            <span className="text-gray-400 font-normal">
              (for reference — auto-grading is case-insensitive match)
            </span>
          </label>
          <input
            className="input text-sm"
            value={question.correctAnswer}
            onChange={(e) => onChange("correctAnswer", e.target.value)}
            placeholder="object"
          />
        </div>
      )}

      <div>
        <label className="label text-xs">
          Explanation{" "}
          <span className="text-gray-400 font-normal">
            (shown after answering, optional)
          </span>
        </label>
        <input
          className="input text-sm"
          value={question.explanation}
          onChange={(e) => onChange("explanation", e.target.value)}
          placeholder="null is actually an object due to a JS quirk…"
        />
      </div>
    </div>
  );
}

// ── Attempts modal ────────────────────────────────────────────────────────────
function AttemptsModal({ quizId, onClose }) {
  const { data: attempts = [], isLoading } = useQuery({
    queryKey: ["quiz-attempts", quizId],
    queryFn: () => getQuizAttempts(quizId),
  });

  const avg =
    attempts.length > 0
      ? Math.round(
          attempts.reduce((s, a) => s + (a.pct || 0), 0) / attempts.length,
        )
      : null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ scale: 0.97, opacity: 0, y: 12 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.97, opacity: 0, y: 12 }}
        transition={{ type: "spring", stiffness: 260, damping: 26 }}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden"
      >
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-gray-900">Quiz Results</h2>
            {avg != null && (
              <p className="text-sm text-gray-500 mt-0.5">
                {attempts.length} attempt{attempts.length !== 1 ? "s" : ""} ·
                Class avg {avg}%
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-xl"
          >
            ×
          </button>
        </div>

        <div className="max-h-[60vh] overflow-y-auto px-6 py-4">
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-10 bg-gray-100 rounded-lg animate-pulse"
                />
              ))}
            </div>
          ) : attempts.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              No attempts yet.
            </div>
          ) : (
            <div className="space-y-3">
              {attempts.map((a) => (
                <div key={a._id} className="flex items-center gap-4">
                  <div className="w-8 h-8 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center text-xs font-semibold shrink-0">
                    {a.studentId?.name?.[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800">
                      {a.studentId?.name}
                    </p>
                    <p className="text-xs text-gray-400">
                      {new Date(a.submittedAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <span
                      className={`text-sm font-bold ${
                        a.pct >= 80
                          ? "text-green-600"
                          : a.pct >= 60
                            ? "text-yellow-600"
                            : "text-red-600"
                      }`}
                    >
                      {a.pct}%
                    </span>
                    <span className="text-xs text-gray-400 ml-1">
                      ({a.score}/{a.maxScore})
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-gray-100 flex justify-end">
          <button onClick={onClose} className="btn-secondary">
            Close
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="grid gap-4 pb-12 sm:grid-cols-2 xl:grid-cols-3">
      {[1, 2, 3].map((i) => (
        <div key={i} className="card h-40 animate-pulse p-4">
          <div className="mb-2 h-5 w-2/3 rounded bg-gray-200" />
          <div className="h-4 w-1/3 rounded bg-gray-200" />
        </div>
      ))}
    </div>
  );
}
