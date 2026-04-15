import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { motion, useReducedMotion } from "motion/react";
import PageLayout from "../../components/layout/PageLayout.jsx";
import ProfileSettings from "../../components/settings/ProfileSettings.jsx";
import { getLessons } from "../../api/lessons.js";
import { useLessonProgress } from "../../hooks/useLessonProgress.js";
import { useClass } from "../../context/ClassContext.jsx";
import {
  studentClassPath,
  STUDENT_CLASSES_ROUTE,
} from "../../utils/classScopePaths.js";

const spring = { type: "spring", stiffness: 100, damping: 20 };

function CurriculumAside({ activeClassId, done, total, shouldReduce }) {
  const curriculumTo = activeClassId
    ? studentClassPath(activeClassId, "curriculum")
    : STUDENT_CLASSES_ROUTE;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;

  if (!activeClassId) {
    return (
      <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50/80 p-5 md:p-6 lg:sticky lg:top-4">
        <p className="text-sm font-semibold text-gray-800">
          Curriculum progress
        </p>
        <p className="mt-2 text-sm leading-relaxed text-gray-600">
          Choose a class in the sidebar to see how many lessons you&apos;ve
          completed for that class.
        </p>
      </div>
    );
  }

  if (total === 0) {
    return (
      <div className="rounded-2xl border border-gray-200/90 bg-white p-5 shadow-sm md:p-6 lg:sticky lg:top-4">
        <p className="text-sm font-semibold text-gray-800">
          Curriculum progress
        </p>
        <p className="mt-2 text-sm leading-relaxed text-gray-600">
          There are no lessons in this class yet. When your teacher adds
          lessons, your progress will show here.
        </p>
        <Link
          to={curriculumTo}
          className="mt-4 inline-flex text-sm font-semibold text-brand-600 hover:text-brand-700 hover:underline"
        >
          Open curriculum →
        </Link>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200/90 bg-white shadow-sm lg:sticky lg:top-4">
      <div
        className="h-1 bg-gradient-to-r from-brand-500 via-brand-400 to-brand-600"
        aria-hidden
      />
      <div className="p-5 md:p-6">
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
          This class
        </p>
        <p className="mt-2 text-sm font-semibold text-gray-900">
          Curriculum progress
        </p>
        <p className="mt-3 tabular-nums text-4xl font-bold text-gray-900">
          {pct}%
        </p>
        <p className="mt-1 text-sm text-gray-600">
          <span className="font-medium text-gray-800">{done}</span>
          <span className="text-gray-400"> / </span>
          {total} {total === 1 ? "lesson" : "lessons"} complete
        </p>
        <div className="mt-4 h-2.5 w-full overflow-hidden rounded-full bg-gray-100">
          {pct > 0 && (
            <motion.div
              className={`h-2.5 rounded-full ${pct === 100 ? "bg-green-600" : "bg-brand-600"}`}
              initial={shouldReduce ? false : { width: 0 }}
              animate={{ width: `${pct}%` }}
              transition={{
                ...spring,
                stiffness: 60,
                damping: 18,
                delay: 0.12,
              }}
            />
          )}
        </div>
        <Link
          to={curriculumTo}
          className="mt-5 inline-flex items-center gap-1 text-sm font-semibold text-brand-600 hover:text-brand-700 hover:underline"
        >
          View lessons
          <span aria-hidden>→</span>
        </Link>
      </div>
    </div>
  );
}

export default function StudentSettings() {
  const shouldReduce = useReducedMotion();
  const { activeClassId } = useClass();
  const { data: lessons = [] } = useQuery({
    queryKey: ["lessons", activeClassId],
    queryFn: () => getLessons(activeClassId || undefined),
    enabled: Boolean(activeClassId),
  });
  const { lessonIds: completed } = useLessonProgress();
  const done = lessons.filter((l) => completed.includes(String(l._id))).length;
  const total = lessons.length;

  const aside = (
    <CurriculumAside
      activeClassId={activeClassId}
      done={done}
      total={total}
      shouldReduce={shouldReduce}
    />
  );

  return (
    <PageLayout fullWidth>
      <div className="mx-auto w-full max-w-5xl pb-24 sm:pb-28 md:pb-32">
        <header className="border-b border-gray-100 pb-5 md:pb-6">
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 md:text-3xl">
            Account settings
          </h1>
          <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-gray-600 md:text-base">
            Your name and sign-in details. Curriculum stats on the right reflect
            the class selected in the sidebar.
          </p>
        </header>

        <div className="mt-8 md:mt-10">
          <ProfileSettings aside={aside} />
        </div>
      </div>
    </PageLayout>
  );
}
