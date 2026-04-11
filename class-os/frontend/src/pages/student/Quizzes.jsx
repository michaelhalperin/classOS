import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { motion, AnimatePresence, useReducedMotion } from "motion/react";
import PageLayout from "../../components/layout/PageLayout.jsx";
import { useClass } from "../../context/ClassContext.jsx";
import {
  getQuizzes,
  getQuizAttempts,
  submitQuizAttempt,
} from "../../api/quizzes.js";

const spring = { type: "spring", stiffness: 100, damping: 20 };

export default function StudentQuizzes() {
  const shouldReduce = useReducedMotion();
  const { activeClassId, classes, isLoading: classesLoading } = useClass();

  // view: 'list' | 'take' | 'review'
  const [view, setView] = useState("list");
  const [activeQuiz, setActiveQuiz] = useState(null);
  const [activeResult, setActiveResult] = useState(null); // attempt result after submitting

  const { data: rawQuizzes, isLoading } = useQuery({
    queryKey: ["student-quizzes", activeClassId],
    queryFn: () => getQuizzes({}),
    enabled: !classesLoading && classes.length > 0,
  });
  const quizzes = Array.isArray(rawQuizzes) ? rawQuizzes : [];

  function startQuiz(quiz) {
    setActiveQuiz(quiz);
    setActiveResult(null);
    setView("take");
  }

  function reviewQuiz(quiz, attempt) {
    setActiveQuiz(quiz);
    setActiveResult(attempt);
    setView("review");
  }

  function backToList() {
    setView("list");
    setActiveQuiz(null);
    setActiveResult(null);
  }

  if (!classesLoading && classes.length === 0) {
    return (
      <PageLayout fullWidth>
        <div className="card mx-auto max-w-lg px-4 pt-16 pb-24 text-center sm:pb-28 md:pt-20 md:pb-32">
          <p className="mb-3 text-5xl">📝</p>
          <h1 className="mb-2 text-xl font-semibold text-gray-800">Quizzes</h1>
          <h2 className="mb-2 text-lg font-medium text-gray-700">
            Not enrolled in any class
          </h2>
          <p className="text-sm text-gray-500">
            Ask your teacher to enroll you.
          </p>
        </div>
      </PageLayout>
    );
  }

  // ── Take view ────────────────────────────────────────────────────────────────
  if (view === "take" && activeQuiz) {
    return (
      <PageLayout fullWidth>
        <div className="pb-24 sm:pb-28 md:pb-32">
          <div className="mb-4 flex flex-wrap items-start justify-between gap-3 border-b border-gray-100 pb-4 md:mb-6 md:pb-5">
            <div className="min-w-0">
              <h1 className="text-xl font-bold tracking-tight text-gray-900 md:text-2xl">
                {activeQuiz.title}
              </h1>
              <p className="mt-1 text-sm text-gray-500">
                Answer all questions, then submit.
              </p>
            </div>
            <button
              type="button"
              onClick={backToList}
              className="btn-secondary shrink-0"
            >
              ← Back to Quizzes
            </button>
          </div>
          <TakeView
            quiz={activeQuiz}
            onDone={(result) => {
              setActiveResult(result);
              setView("review");
            }}
            onCancel={backToList}
          />
        </div>
      </PageLayout>
    );
  }

  // ── Review view ──────────────────────────────────────────────────────────────
  if (view === "review" && activeQuiz) {
    return (
      <PageLayout fullWidth>
        <div className="pb-24 sm:pb-28 md:pb-32">
          <div className="mb-4 flex flex-wrap items-start justify-between gap-3 border-b border-gray-100 pb-4 md:mb-6 md:pb-5">
            <div className="min-w-0">
              <h1 className="text-xl font-bold tracking-tight text-gray-900 md:text-2xl">
                {activeQuiz.title}
              </h1>
              <p className="mt-1 text-sm text-gray-500">Review your attempt</p>
            </div>
            <button
              type="button"
              onClick={backToList}
              className="btn-secondary shrink-0"
            >
              ← Back to Quizzes
            </button>
          </div>
          <ReviewView
            quiz={activeQuiz}
            result={activeResult}
            onBack={backToList}
          />
        </div>
      </PageLayout>
    );
  }

  // ── List view ─────────────────────────────────────────────────────────────────
  return (
    <PageLayout fullWidth>
      {isLoading ? (
        <LoadingSkeleton />
      ) : quizzes.length === 0 ? (
        <motion.div
          initial={shouldReduce ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl border border-dashed border-gray-200 bg-white/80 py-16 text-center md:py-20 pb-24 sm:pb-28 md:pb-32"
        >
          <p className="mb-2 text-5xl">📝</p>
          <h2 className="text-xl font-semibold text-gray-800">
            No quizzes yet
          </h2>
          <p className="mt-1 text-gray-500">
            Your teacher hasn&apos;t published any quizzes for this class.
          </p>
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
                    transition: { staggerChildren: 0.07 },
                  },
                }
          }
          initial={shouldReduce ? false : "hidden"}
          animate="visible"
          className="space-y-4 md:space-y-5 pb-24 sm:pb-28 md:pb-32"
        >
          <header className="border-b border-gray-100 pb-4 md:pb-5">
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">
              Quizzes
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              {quizzes.length} {quizzes.length === 1 ? "quiz" : "quizzes"} ·
              start or review your attempts
            </p>
          </header>

          <div className="grid gap-4 md:grid-cols-2 md:gap-5 xl:grid-cols-2">
            {quizzes.map((quiz) => (
              <QuizCard
                key={quiz._id}
                quiz={quiz}
                onStart={() => startQuiz(quiz)}
                onReview={(attempt) => reviewQuiz(quiz, attempt)}
              />
            ))}
          </div>
        </motion.div>
      )}
    </PageLayout>
  );
}

// ── Quiz card ─────────────────────────────────────────────────────────────────
function QuizCard({ quiz, onStart, onReview }) {
  const { data: attempts = [] } = useQuery({
    queryKey: ["my-quiz-attempt", quiz._id],
    queryFn: () => getQuizAttempts(quiz._id),
  });

  const myAttempt = attempts[0];
  const done = Boolean(myAttempt);

  return (
    <motion.div
      variants={{
        hidden: { opacity: 0, y: 12 },
        visible: { opacity: 1, y: 0, transition: spring },
      }}
      className="card flex h-full flex-col p-4 md:p-5"
    >
      <div className="flex flex-1 flex-col gap-4 sm:flex-row sm:items-start">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-semibold text-gray-900">{quiz.title}</h3>
            {done && (
              <span
                className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                  myAttempt.pct >= 80
                    ? "bg-green-100 text-green-700"
                    : myAttempt.pct >= 60
                      ? "bg-yellow-100 text-yellow-700"
                      : "bg-red-100 text-red-700"
                }`}
              >
                {myAttempt.pct}%
              </span>
            )}
          </div>
          {quiz.lessonId?.title && (
            <p className="text-xs text-brand-600 mt-0.5">
              {quiz.lessonId.title}
            </p>
          )}
          <p className="text-sm text-gray-500 mt-1">
            {quiz.questions?.length || 0} question
            {quiz.questions?.length !== 1 ? "s" : ""}
            {quiz.description ? ` · ${quiz.description}` : ""}
          </p>
          {done && (
            <p className="text-xs text-gray-400 mt-1">
              Score: {myAttempt.score}/{myAttempt.maxScore} ·{" "}
              {new Date(myAttempt.submittedAt).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
              })}
            </p>
          )}
        </div>

        <div className="shrink-0 sm:pt-0.5">
          {done ? (
            <button
              type="button"
              onClick={() => onReview(myAttempt)}
              className="btn-secondary w-full text-sm py-1.5 px-4 sm:w-auto"
            >
              Review
            </button>
          ) : (
            <button
              type="button"
              onClick={onStart}
              className="btn-primary w-full text-sm py-1.5 px-4 sm:w-auto"
            >
              Start Quiz
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// ── Take view (full page) ─────────────────────────────────────────────────────
function TakeView({ quiz, onDone, onCancel }) {
  const [answers, setAnswers] = useState(() =>
    (quiz.questions || []).reduce((acc, q) => ({ ...acc, [q._id]: "" }), {}),
  );
  const [currentQ, setCurrentQ] = useState(0);

  const mutation = useMutation({
    mutationFn: () => {
      const formatted = Object.entries(answers).map(([questionId, answer]) => ({
        questionId,
        answer,
      }));
      return submitQuizAttempt(quiz._id, formatted);
    },
    onSuccess: onDone,
  });

  const questions = quiz.questions || [];
  const q = questions[currentQ];
  const totalAnswered = questions.filter((q) => answers[q._id]?.trim()).length;
  const allAnswered = totalAnswered === questions.length;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={spring}
      className="mx-auto w-full max-w-3xl"
    >
      {/* Progress */}
      <div className="mb-6">
        <div className="flex items-center justify-between text-sm text-gray-500 mb-2">
          <span>
            Question {currentQ + 1} of {questions.length}
          </span>
          <span>
            {totalAnswered}/{questions.length} answered · {q.points} pt
            {q.points !== 1 ? "s" : ""}
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
          <motion.div
            className="bg-brand-500 h-2 rounded-full"
            animate={{ width: `${((currentQ + 1) / questions.length) * 100}%` }}
            transition={{ type: "spring", stiffness: 80, damping: 18 }}
          />
        </div>
        {/* Dot nav */}
        <div className="flex gap-1.5 mt-3 flex-wrap">
          {questions.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrentQ(i)}
              className={`w-2.5 h-2.5 rounded-full transition-colors ${
                i === currentQ
                  ? "bg-brand-600 scale-110"
                  : answers[questions[i]._id]?.trim()
                    ? "bg-brand-300"
                    : "bg-gray-200"
              }`}
            />
          ))}
        </div>
      </div>

      {/* Question card */}
      <div className="card">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentQ}
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -16 }}
            transition={{ type: "spring", stiffness: 280, damping: 28 }}
            className="space-y-5"
          >
            <p className="text-lg font-medium text-gray-900 leading-relaxed">
              {q.text}
            </p>

            {/* MCQ */}
            {q.type === "mcq" && (
              <div className="space-y-3">
                {q.options.map((opt, oi) => (
                  <button
                    key={oi}
                    onClick={() => setAnswers((a) => ({ ...a, [q._id]: opt }))}
                    className={`w-full text-left px-5 py-3.5 rounded-xl border-2 text-sm font-medium transition-all ${
                      answers[q._id] === opt
                        ? "border-brand-500 bg-brand-50 text-brand-700"
                        : "border-gray-200 hover:border-gray-300 hover:bg-gray-50 text-gray-700"
                    }`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            )}

            {/* True / False */}
            {q.type === "true_false" && (
              <div className="grid grid-cols-2 gap-4">
                {["true", "false"].map((v) => (
                  <button
                    key={v}
                    onClick={() => setAnswers((a) => ({ ...a, [q._id]: v }))}
                    className={`py-4 rounded-xl border-2 text-base font-semibold capitalize transition-all ${
                      answers[q._id] === v
                        ? "border-brand-500 bg-brand-50 text-brand-700"
                        : "border-gray-200 hover:border-gray-300 hover:bg-gray-50 text-gray-700"
                    }`}
                  >
                    {v}
                  </button>
                ))}
              </div>
            )}

            {/* Short answer */}
            {q.type === "short" && (
              <textarea
                rows={3}
                className="input resize-none text-base"
                value={answers[q._id] || ""}
                onChange={(e) =>
                  setAnswers((a) => ({ ...a, [q._id]: e.target.value }))
                }
                placeholder="Type your answer…"
                autoFocus
              />
            )}
          </motion.div>
        </AnimatePresence>

        {mutation.isError && (
          <p className="text-sm text-red-600 mt-4">
            Something went wrong. Please try again.
          </p>
        )}

        {/* Nav buttons */}
        <div className="flex items-center justify-between mt-8 pt-5 border-t border-gray-100">
          <button
            onClick={() => setCurrentQ((c) => Math.max(0, c - 1))}
            disabled={currentQ === 0}
            className="btn-secondary disabled:opacity-40"
          >
            ← Back
          </button>

          {currentQ < questions.length - 1 ? (
            <button
              onClick={() => setCurrentQ((c) => c + 1)}
              disabled={!answers[q._id]?.trim()}
              className="btn-primary disabled:opacity-50"
            >
              Next →
            </button>
          ) : (
            <button
              onClick={() => mutation.mutate()}
              disabled={mutation.isPending || !allAnswered}
              className="btn-primary disabled:opacity-50"
            >
              {mutation.isPending ? "Submitting…" : "Submit Quiz"}
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// ── Review view (full page) ───────────────────────────────────────────────────
function ReviewView({ quiz, result, onBack }) {
  const attempt = result?.attempt || result;
  const questions = result?.quiz?.questions || quiz.questions || [];

  const answerMap = {};
  if (attempt?.answers) {
    attempt.answers.forEach((a) => {
      answerMap[a.questionId?.toString()] = a;
    });
  }

  const score = attempt?.score ?? 0;
  const maxScore = attempt?.maxScore ?? 0;
  const pct = attempt?.pct ?? 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={spring}
      className="mx-auto w-full max-w-3xl space-y-5 md:space-y-6"
    >
      {/* Score banner */}
      <div
        className={`card text-center py-8 border-2 ${
          pct >= 80
            ? "border-green-300 bg-green-50"
            : pct >= 60
              ? "border-yellow-300 bg-yellow-50"
              : "border-red-300 bg-red-50"
        }`}
      >
        <p
          className={`text-6xl font-bold ${
            pct >= 80
              ? "text-green-600"
              : pct >= 60
                ? "text-yellow-600"
                : "text-red-600"
          }`}
        >
          {pct}%
        </p>
        <p className="text-gray-600 mt-2 text-lg">
          {score} / {maxScore} points
        </p>
        <p
          className={`mt-1 font-medium ${
            pct >= 80
              ? "text-green-700"
              : pct >= 60
                ? "text-yellow-700"
                : "text-red-700"
          }`}
        >
          {pct >= 80
            ? "Great job!"
            : pct >= 60
              ? "Good effort!"
              : "Keep practicing!"}
        </p>
      </div>

      {/* Per-question breakdown */}
      <div className="space-y-4">
        {questions.map((q, i) => {
          const ans = answerMap[q._id?.toString()];
          const isCorrect = ans?.isCorrect;
          const isShort = q.type === "short";

          return (
            <motion.div
              key={q._id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ ...spring, delay: i * 0.05 }}
              className={`card border-l-4 ${
                isShort
                  ? "border-l-gray-300"
                  : isCorrect
                    ? "border-l-green-400"
                    : "border-l-red-400"
              }`}
            >
              <div className="flex items-start gap-3">
                <span
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5 ${
                    isShort
                      ? "bg-gray-200 text-gray-600"
                      : isCorrect
                        ? "bg-green-500 text-white"
                        : "bg-red-500 text-white"
                  }`}
                >
                  {isShort ? "i" : isCorrect ? "✓" : "✗"}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900">{q.text}</p>
                  <p className="text-sm text-gray-500 mt-2">
                    Your answer:{" "}
                    <span
                      className={`font-medium ${
                        isShort
                          ? "text-gray-700"
                          : isCorrect
                            ? "text-green-700"
                            : "text-red-600"
                      }`}
                    >
                      {ans?.answer || "(no answer)"}
                    </span>
                  </p>
                  {!isShort && !isCorrect && q.correctAnswer && (
                    <p className="text-sm text-green-700 mt-1">
                      Correct answer:{" "}
                      <span className="font-medium">{q.correctAnswer}</span>
                    </p>
                  )}
                  {q.explanation && (
                    <p className="text-sm text-gray-500 mt-2 bg-gray-50 rounded-lg px-3 py-2 border border-gray-100 leading-relaxed">
                      {q.explanation}
                    </p>
                  )}
                </div>
                <span className="text-xs text-gray-400 shrink-0">
                  {ans?.pointsEarned ?? 0}/{q.points ?? 1} pt
                  {q.points !== 1 ? "s" : ""}
                </span>
              </div>
            </motion.div>
          );
        })}
      </div>

      <div className="flex justify-end pt-2">
        <button type="button" onClick={onBack} className="btn-primary px-8">
          Back to Quizzes
        </button>
      </div>
    </motion.div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-4 pb-24 sm:pb-28 md:pb-32">
      <div className="h-10 max-w-xs animate-pulse rounded-lg bg-gray-200" />
      <div className="grid gap-4 md:grid-cols-2">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="card h-28 animate-pulse p-4">
            <div className="mb-2 h-4 w-2/3 rounded bg-gray-200" />
            <div className="h-3 w-1/2 rounded bg-gray-200" />
          </div>
        ))}
      </div>
    </div>
  );
}
