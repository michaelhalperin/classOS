import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { motion, useReducedMotion } from "motion/react";
import PageLayout from "../../components/layout/PageLayout.jsx";
import { getLessons } from "../../api/lessons.js";
import { getAssignments } from "../../api/assignments.js";
import { getSubmissions } from "../../api/submissions.js";
import { useLessonProgress } from "../../hooks/useLessonProgress.js";
import { useClass } from "../../context/ClassContext.jsx";

const spring = { type: "spring", stiffness: 100, damping: 20 };

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.07, delayChildren: 0.05 },
  },
};
const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: spring },
};

export default function StudentProgress() {
  const shouldReduce = useReducedMotion();
  const { activeClassId, classes, isLoading: classesLoading } = useClass();
  const { lessonIds: completedIds } = useLessonProgress();

  const { data: lessons = [], isLoading: lessonsLoading } = useQuery({
    queryKey: ["lessons", activeClassId],
    queryFn: () => getLessons(activeClassId || undefined),
    enabled: Boolean(activeClassId),
  });

  const { data: assignments = [], isLoading: assignmentsLoading } = useQuery({
    queryKey: ["assignments", activeClassId],
    queryFn: () => getAssignments(activeClassId || undefined),
    enabled: Boolean(activeClassId),
  });

  const { data: submissions = [], isLoading: submissionsLoading } = useQuery({
    queryKey: ["my-submissions"],
    queryFn: () => getSubmissions(),
  });

  const isLoading = lessonsLoading || assignmentsLoading || submissionsLoading;

  if (!classesLoading && classes.length === 0) {
    return (
      <PageLayout fullWidth>
        <div className="card mx-auto max-w-lg px-4 pt-16 pb-24 text-center sm:pb-28 md:pt-20 md:pb-32">
          <p className="mb-3 text-5xl">📊</p>
          <h1 className="mb-2 text-xl font-semibold text-gray-800">
            My Progress
          </h1>
          <h2 className="mb-2 text-lg font-medium text-gray-700">
            Not enrolled in any class
          </h2>
          <p className="text-gray-500 text-sm">
            Ask your teacher to enroll you in a class.
          </p>
        </div>
      </PageLayout>
    );
  }

  if (!activeClassId) {
    return (
      <PageLayout fullWidth>
        <div className="card mx-auto max-w-lg px-4 pt-16 pb-24 text-center sm:pb-28 md:pt-20 md:pb-32">
          <p className="mb-3 text-5xl">📊</p>
          <h1 className="mb-2 text-xl font-semibold text-gray-800">
            My Progress
          </h1>
          <h2 className="mb-2 text-lg font-medium text-gray-700">
            Pick a class first
          </h2>
          <p className="text-gray-500 text-sm">
            Use the class selector in the top bar.
          </p>
        </div>
      </PageLayout>
    );
  }

  // ── derived stats ──────────────────────────────────────────────────────────
  const totalLessons = lessons.length;
  const completedLessons = lessons.filter((l) =>
    completedIds.includes(l._id),
  ).length;
  const lessonPct =
    totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;

  // Submissions scoped to this class's assignments
  const classAssignmentIds = new Set(assignments.map((a) => a._id));
  const mySubmissions = submissions.filter((s) => {
    const aid = s.assignmentId?._id || s.assignmentId;
    return classAssignmentIds.has(aid);
  });

  const totalAssignments = assignments.length;
  const submittedCount = assignments.filter((a) =>
    Boolean(a.submission?.submittedAt),
  ).length;
  const gradedSubs = mySubmissions.filter((s) => s.grade != null);
  const avgGrade =
    gradedSubs.length > 0
      ? Math.round(
          gradedSubs.reduce((sum, s) => sum + s.grade, 0) / gradedSubs.length,
        )
      : null;

  const pendingAssignments = assignments.filter(
    (a) =>
      !a.submission?.submittedAt &&
      a.dueDate &&
      new Date(a.dueDate) >= new Date(),
  );
  const overdueAssignments = assignments.filter(
    (a) =>
      !a.submission?.submittedAt &&
      a.dueDate &&
      new Date(a.dueDate) < new Date(),
  );

  // Grade distribution from graded submissions
  const gradeDistribution = [
    { label: "A (90–100)", min: 90, max: 100, color: "bg-green-500" },
    { label: "B (80–89)", min: 80, max: 89, color: "bg-blue-500" },
    { label: "C (70–79)", min: 70, max: 79, color: "bg-yellow-500" },
    { label: "D (60–69)", min: 60, max: 69, color: "bg-orange-500" },
    { label: "F (<60)", min: 0, max: 59, color: "bg-red-500" },
  ].map((bucket) => ({
    ...bucket,
    count: gradedSubs.filter(
      (s) => s.grade >= bucket.min && s.grade <= bucket.max,
    ).length,
  }));
  const maxBucketCount = Math.max(...gradeDistribution.map((b) => b.count), 1);
  const hasGradeColumn = gradedSubs.length > 0;

  // Assignments sorted by due date with submission info
  const assignmentTimeline = [...assignments]
    .filter((a) => a.dueDate)
    .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));

  return (
    <PageLayout fullWidth>
      {isLoading ? (
        <LoadingSkeleton />
      ) : (
        <motion.div
          variants={shouldReduce ? undefined : containerVariants}
          initial={shouldReduce ? false : "hidden"}
          animate="visible"
          className="space-y-4 md:space-y-5 pb-24 sm:pb-28 md:pb-32"
        >
          <header className="border-b border-gray-100 pb-4 md:pb-5">
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">
              My Progress
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              Lessons, assignments, and grades for your selected class
            </p>
          </header>

          {/* ── Stat cards — denser, full width ─────────────────── */}
          <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
            <StatCard
              label="Lessons Done"
              value={`${completedLessons}/${totalLessons}`}
              sub={`${lessonPct}% complete`}
              color="brand"
              shouldReduce={shouldReduce}
            />
            <StatCard
              label="Submitted"
              value={`${submittedCount}/${totalAssignments}`}
              sub="assignments"
              color="purple"
              shouldReduce={shouldReduce}
            />
            <StatCard
              label="Avg Grade"
              value={avgGrade != null ? `${avgGrade}` : "—"}
              sub={avgGrade != null ? gradeLabel(avgGrade) : "no grades yet"}
              color={
                avgGrade == null
                  ? "gray"
                  : avgGrade >= 90
                    ? "green"
                    : avgGrade >= 70
                      ? "yellow"
                      : "red"
              }
              shouldReduce={shouldReduce}
            />
            <StatCard
              label="Overdue"
              value={overdueAssignments.length}
              sub={
                overdueAssignments.length === 0
                  ? "all caught up!"
                  : "need attention"
              }
              color={overdueAssignments.length === 0 ? "green" : "red"}
              shouldReduce={shouldReduce}
            />
          </div>

          <div className="grid gap-3 md:gap-5 lg:grid-cols-12 lg:items-start">
            {/* ── Primary column: lessons + timeline + alerts ───── */}
            <div
              className={`flex flex-col gap-3 md:gap-5 ${
                hasGradeColumn
                  ? "lg:col-span-7 xl:col-span-8"
                  : "lg:col-span-12"
              }`}
            >
              <motion.div
                variants={shouldReduce ? undefined : itemVariants}
                className="card p-4 md:p-5"
              >
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <h2 className="font-semibold text-gray-800">
                    Lesson Progress
                  </h2>
                  <Link
                    to="/student/curriculum"
                    className="text-sm font-medium text-brand-600 hover:underline"
                  >
                    Curriculum →
                  </Link>
                </div>
                <div className="mb-4 flex items-center gap-3">
                  <div className="h-3 flex-1 overflow-hidden rounded-full bg-gray-200">
                    <motion.div
                      className="h-3 rounded-full bg-brand-600"
                      initial={shouldReduce ? false : { width: 0 }}
                      animate={{ width: `${lessonPct}%` }}
                      transition={{
                        ...spring,
                        stiffness: 60,
                        damping: 18,
                        delay: 0.4,
                      }}
                    />
                  </div>
                  <span className="w-10 text-right text-sm font-semibold text-brand-700">
                    {lessonPct}%
                  </span>
                </div>

                {lessons.length > 0 && (
                  <div className="space-y-2">
                    {[...new Set(lessons.map((l) => l.weekNumber))]
                      .sort((a, b) => a - b)
                      .map((week) => {
                        const wl = lessons.filter((l) => l.weekNumber === week);
                        const wDone = wl.filter((l) =>
                          completedIds.includes(l._id),
                        ).length;
                        const pct = Math.round((wDone / wl.length) * 100);
                        return (
                          <div
                            key={week}
                            className="flex items-center gap-2 text-sm sm:gap-3"
                          >
                            <span className="w-14 shrink-0 text-gray-500 sm:w-16">
                              Week {week}
                            </span>
                            <div className="h-2 flex-1 overflow-hidden rounded-full bg-gray-100">
                              <motion.div
                                className={`h-2 rounded-full ${pct === 100 ? "bg-green-500" : "bg-brand-400"}`}
                                initial={shouldReduce ? false : { width: 0 }}
                                animate={{ width: `${pct}%` }}
                                transition={{
                                  ...spring,
                                  stiffness: 60,
                                  damping: 18,
                                  delay: 0.5,
                                }}
                              />
                            </div>
                            <span className="w-[3.25rem] text-right text-xs text-gray-500 sm:w-16">
                              {wDone}/{wl.length}
                            </span>
                          </div>
                        );
                      })}
                  </div>
                )}
              </motion.div>

              {assignmentTimeline.length > 0 && (
                <motion.div
                  variants={shouldReduce ? undefined : itemVariants}
                  className="card p-4 md:p-5"
                >
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                    <h2 className="font-semibold text-gray-800">Assignments</h2>
                    <Link
                      to="/student/homework"
                      className="text-sm font-medium text-brand-600 hover:underline"
                    >
                      Homework →
                    </Link>
                  </div>
                  <div className="divide-y divide-gray-50">
                    {assignmentTimeline.map((a) => {
                      const sub = a.submission;
                      const isSubmitted = Boolean(sub?.submittedAt);
                      const hasGrade = sub?.grade != null;
                      const isOverdue =
                        !isSubmitted && new Date(a.dueDate) < new Date();

                      return (
                        <div
                          key={a._id}
                          className="flex items-center gap-3 py-2.5 first:pt-0"
                        >
                          <div
                            className={`h-2.5 w-2.5 shrink-0 rounded-full ${
                              hasGrade
                                ? "bg-green-500"
                                : isSubmitted
                                  ? "bg-yellow-400"
                                  : isOverdue
                                    ? "bg-red-400"
                                    : "bg-gray-300"
                            }`}
                          />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium text-gray-800">
                              {a.title}
                            </p>
                            <p className="text-xs text-gray-400">
                              Due{" "}
                              {new Date(a.dueDate).toLocaleDateString("en-US", {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                              })}
                            </p>
                          </div>
                          <div className="shrink-0 text-right">
                            {hasGrade ? (
                              <span
                                className={`text-sm font-bold ${sub.grade >= 70 ? "text-green-600" : "text-red-500"}`}
                              >
                                {sub.grade}
                                <span className="text-xs font-normal text-gray-400">
                                  /100
                                </span>
                              </span>
                            ) : isSubmitted ? (
                              <span className="rounded-full border border-yellow-200 bg-yellow-50 px-2 py-0.5 text-xs text-yellow-700">
                                Grading
                              </span>
                            ) : isOverdue ? (
                              <span className="rounded-full border border-red-200 bg-red-50 px-2 py-0.5 text-xs text-red-600">
                                Overdue
                              </span>
                            ) : (
                              <span className="text-xs text-gray-400">
                                Pending
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </motion.div>
              )}

              {(pendingAssignments.length > 0 ||
                overdueAssignments.length > 0) && (
                <div className="grid gap-3 sm:grid-cols-2">
                  {overdueAssignments.length > 0 && (
                    <motion.div
                      variants={shouldReduce ? undefined : itemVariants}
                      className="card border-l-4 border-l-red-400 p-4 md:p-5"
                    >
                      <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-red-600">
                        <span aria-hidden>⚠</span> Overdue (
                        {overdueAssignments.length})
                      </h3>
                      <ul className="space-y-1.5 text-sm text-gray-700">
                        {overdueAssignments.map((a) => (
                          <li key={a._id}>
                            <span className="font-medium">{a.title}</span>
                            <span className="ml-1.5 text-xs text-gray-400">
                              {new Date(a.dueDate).toLocaleDateString("en-US", {
                                month: "short",
                                day: "numeric",
                              })}
                            </span>
                          </li>
                        ))}
                      </ul>
                      <Link
                        to="/student/homework"
                        className="mt-3 block text-sm font-medium text-red-600 hover:underline"
                      >
                        Submit now →
                      </Link>
                    </motion.div>
                  )}

                  {pendingAssignments.length > 0 && (
                    <motion.div
                      variants={shouldReduce ? undefined : itemVariants}
                      className="card border-l-4 border-l-brand-400 p-4 md:p-5"
                    >
                      <h3 className="mb-2 text-sm font-semibold text-gray-800">
                        Upcoming ({pendingAssignments.length})
                      </h3>
                      <ul className="space-y-1.5">
                        {pendingAssignments.slice(0, 6).map((a) => (
                          <li
                            key={a._id}
                            className="flex items-center justify-between gap-2 text-sm text-gray-700"
                          >
                            <span className="truncate font-medium">
                              {a.title}
                            </span>
                            <span className="shrink-0 text-xs text-gray-400">
                              {new Date(a.dueDate).toLocaleDateString("en-US", {
                                month: "short",
                                day: "numeric",
                              })}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </motion.div>
                  )}
                </div>
              )}
            </div>

            {/* ── Secondary column: grades at a glance ─────────── */}
            {hasGradeColumn && (
              <div className="flex flex-col gap-3 md:gap-5 lg:col-span-5 xl:col-span-4">
                <motion.div
                  variants={shouldReduce ? undefined : itemVariants}
                  className="card p-4 md:p-5"
                >
                  <h2 className="mb-3 font-semibold text-gray-800">
                    Grade distribution
                  </h2>
                  <div className="space-y-2">
                    {gradeDistribution.map((bucket) => (
                      <div
                        key={bucket.label}
                        className="flex items-center gap-2 text-sm"
                      >
                        <span className="w-24 shrink-0 text-xs text-gray-500 sm:w-28">
                          {bucket.label}
                        </span>
                        <div className="h-4 min-h-[1rem] flex-1 overflow-hidden rounded-full bg-gray-100">
                          {bucket.count > 0 ? (
                            <motion.div
                              className={`flex h-4 min-w-0 items-center justify-end rounded-full pr-1.5 ${bucket.color}`}
                              initial={shouldReduce ? false : { width: 0 }}
                              animate={{
                                width: `${(bucket.count / maxBucketCount) * 100}%`,
                              }}
                              transition={{
                                ...spring,
                                stiffness: 60,
                                damping: 18,
                                delay: 0.5,
                              }}
                            >
                              <span className="text-[10px] font-medium text-white">
                                {bucket.count}
                              </span>
                            </motion.div>
                          ) : null}
                        </div>
                      </div>
                    ))}
                  </div>
                </motion.div>

                <motion.div
                  variants={shouldReduce ? undefined : itemVariants}
                  className="card p-4 md:p-5"
                >
                  <h2 className="mb-3 font-semibold text-gray-800">
                    Graded work
                  </h2>
                  <div className="divide-y divide-gray-50">
                    {gradedSubs
                      .sort(
                        (a, b) =>
                          new Date(b.submittedAt) - new Date(a.submittedAt),
                      )
                      .map((sub) => {
                        const assignmentTitle =
                          sub.assignmentId?.title || "Assignment";
                        return (
                          <div
                            key={sub._id}
                            className="flex items-center gap-3 py-2.5 first:pt-0"
                          >
                            <div
                              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-xs font-bold ${
                                sub.grade >= 90
                                  ? "bg-green-100 text-green-700"
                                  : sub.grade >= 80
                                    ? "bg-blue-100 text-blue-700"
                                    : sub.grade >= 70
                                      ? "bg-yellow-100 text-yellow-700"
                                      : "bg-red-100 text-red-700"
                              }`}
                            >
                              {sub.grade}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-medium text-gray-800">
                                {assignmentTitle}
                              </p>
                              {sub.feedback && (
                                <p className="mt-0.5 truncate text-xs text-gray-500">
                                  {sub.feedback}
                                </p>
                              )}
                            </div>
                            <span className="shrink-0 text-xs text-gray-400">
                              {new Date(sub.submittedAt).toLocaleDateString(
                                "en-US",
                                {
                                  month: "short",
                                  day: "numeric",
                                },
                              )}
                            </span>
                          </div>
                        );
                      })}
                  </div>
                  <Link
                    to="/student/homework"
                    className="mt-3 block text-sm font-medium text-brand-600 hover:underline"
                  >
                    All homework →
                  </Link>
                </motion.div>
              </div>
            )}
          </div>

          {lessons.length === 0 && assignments.length === 0 && (
            <motion.div
              variants={shouldReduce ? undefined : itemVariants}
              className="rounded-xl border border-dashed border-gray-200 bg-white/80 py-16 text-center"
            >
              <p className="mb-2 text-4xl">📊</p>
              <p className="text-gray-500">
                No lessons or assignments yet for this class.
              </p>
            </motion.div>
          )}
        </motion.div>
      )}
    </PageLayout>
  );
}

function gradeLabel(grade) {
  if (grade >= 90) return "A — Excellent";
  if (grade >= 80) return "B — Good";
  if (grade >= 70) return "C — Average";
  if (grade >= 60) return "D — Below avg";
  return "F — Needs work";
}

function StatCard({ label, value, sub, color, shouldReduce }) {
  const colors = {
    brand: "text-brand-700",
    purple: "text-purple-700",
    green: "text-green-600",
    yellow: "text-yellow-600",
    red: "text-red-600",
    gray: "text-gray-500",
  };
  return (
    <motion.div
      variants={shouldReduce ? undefined : itemVariants}
      whileHover={
        shouldReduce
          ? undefined
          : {
              y: -2,
              transition: { type: "spring", stiffness: 300, damping: 28 },
            }
      }
      className="card p-3 sm:p-4"
    >
      <p className="text-sm text-gray-500">{label}</p>
      <p className={`text-2xl font-bold mt-1 ${colors[color]}`}>{value}</p>
      <p className="text-xs text-gray-400 mt-0.5">{sub}</p>
    </motion.div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-4 pb-24 sm:pb-28 md:pb-32">
      <div className="h-10 max-w-xs animate-pulse rounded-lg bg-gray-200" />
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="card h-24 animate-pulse p-4">
            <div className="h-3 w-1/2 rounded bg-gray-200" />
            <div className="mt-3 h-6 w-1/3 rounded bg-gray-200" />
          </div>
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-12">
        <div className="card h-48 animate-pulse lg:col-span-8" />
        <div className="card h-48 animate-pulse lg:col-span-4" />
      </div>
    </div>
  );
}
