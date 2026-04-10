import { useCallback, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'motion/react';
import PageLayout from '../../components/layout/PageLayout.jsx';
import { getLessons } from '../../api/lessons.js';
import { useLessonProgress } from '../../hooks/useLessonProgress.js';
import { useClass } from '../../context/ClassContext.jsx';

const spring = { type: 'spring', stiffness: 100, damping: 20 };
const snappy = { type: 'spring', stiffness: 280, damping: 26 };

const sectionVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.06 } },
};

const cardVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: spring },
};

export default function Curriculum() {
  const shouldReduce = useReducedMotion();
  const { lessonIds: completed } = useLessonProgress();
  const { activeClassId, classes, isLoading: classesLoading } = useClass();

  const { data: lessons = [], isLoading } = useQuery({
    queryKey: ['lessons', activeClassId],
    queryFn: () => getLessons(activeClassId || undefined),
    enabled: Boolean(activeClassId),
  });
  const weeks = [...new Set(lessons.map((l) => l.weekNumber))].sort((a, b) => a - b);

  /** Week numbers that are collapsed (hidden lesson grid). Empty set = all expanded. */
  const [collapsedWeeks, setCollapsedWeeks] = useState(() => new Set());
  const toggleWeekCollapsed = useCallback((week) => {
    setCollapsedWeeks((prev) => {
      const next = new Set(prev);
      if (next.has(week)) next.delete(week);
      else next.add(week);
      return next;
    });
  }, []);

  const totalComplete = lessons.filter((l) => completed.includes(l._id)).length;
  const progress = lessons.length > 0 ? Math.round((totalComplete / lessons.length) * 100) : 0;

  if (!classesLoading && classes.length === 0) {
    return (
      <PageLayout fullWidth>
        <div className="card mx-auto max-w-lg px-4 pt-16 pb-24 text-center sm:pb-28 md:pt-20 md:pb-32">
          <p className="mb-3 text-5xl">📖</p>
          <h1 className="mb-2 text-xl font-semibold text-gray-800">My Curriculum</h1>
          <h2 className="mb-2 text-lg font-medium text-gray-700">Not enrolled in any class</h2>
          <p className="text-sm text-gray-500">Ask your teacher to enroll you in a class — then your curriculum will appear here.</p>
        </div>
      </PageLayout>
    );
  }

  if (!activeClassId) {
    return (
      <PageLayout fullWidth>
        <div className="card mx-auto max-w-lg px-4 pt-16 pb-24 text-center sm:pb-28 md:pt-20 md:pb-32">
          <p className="mb-3 text-5xl">📖</p>
          <h1 className="mb-2 text-xl font-semibold text-gray-800">My Curriculum</h1>
          <h2 className="mb-2 text-lg font-medium text-gray-700">Pick a class first</h2>
          <p className="text-sm text-gray-500">Use the class selector in the sidebar to choose which class to view.</p>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout fullWidth>
      {isLoading ? (
        <LoadingSkeleton />
      ) : (
        <div className="space-y-6 pb-24 sm:space-y-8 sm:pb-28 md:pb-32">
          <header className="border-b border-gray-200/80 pb-5 md:pb-6">
            <h1 className="text-2xl font-bold tracking-tight text-gray-900 md:text-3xl">My Curriculum</h1>
            <p className="mt-1.5 max-w-2xl text-sm text-gray-600 md:text-base">
              Work through lessons week by week. Open a card to read the lesson and mark it complete as you go.
            </p>
          </header>

          {lessons.length > 0 && (
            <motion.section
              initial={shouldReduce ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ ...spring, delay: 0.02 }}
              className="overflow-hidden rounded-2xl border border-gray-200/90 bg-white shadow-sm"
              aria-label="Course progress"
            >
              <div className="flex flex-col gap-5 p-5 sm:flex-row sm:items-center sm:justify-between sm:gap-8 md:p-6">
                <div className="min-w-0 shrink-0 sm:w-44 md:w-52">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Overall</p>
                  <p className="mt-1 tabular-nums text-3xl font-bold text-gray-900 md:text-4xl">{progress}%</p>
                  <p className="mt-1 text-sm text-gray-600">
                    <span className="font-medium text-gray-800">{totalComplete}</span>
                    <span className="text-gray-400"> / </span>
                    {lessons.length} {lessons.length === 1 ? 'lesson' : 'lessons'}
                  </p>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="mb-2 flex items-center justify-between gap-3 text-xs text-gray-500">
                    <span>Progress</span>
                    <span className="tabular-nums">{totalComplete === lessons.length ? 'Complete' : 'In progress'}</span>
                  </div>
                  <div className="h-3 w-full overflow-hidden rounded-full bg-gray-100">
                    {progress > 0 && (
                      <motion.div
                        className={`h-3 rounded-full ${progress === 100 ? 'bg-green-600' : 'bg-brand-600'}`}
                        initial={shouldReduce ? false : { width: 0 }}
                        animate={{ width: `${progress}%` }}
                        transition={{ ...spring, delay: 0.2, stiffness: 60, damping: 18 }}
                      />
                    )}
                  </div>
                </div>
              </div>
            </motion.section>
          )}

          {lessons.length === 0 ? (
            <motion.div
              initial={shouldReduce ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              className="rounded-2xl border border-dashed border-gray-200 bg-white/90 py-16 text-center md:py-20"
            >
              <p className="mb-2 text-5xl">📖</p>
              <h2 className="text-xl font-semibold text-gray-800">No lessons yet</h2>
              <p className="mt-1 text-gray-500">Your teacher hasn&apos;t added any lessons to this class yet. Check back soon!</p>
            </motion.div>
          ) : (
            <div className="space-y-6 md:space-y-8">
              {weeks.map((week, weekIdx) => {
                const weekLessons = lessons
                  .filter((l) => l.weekNumber === week)
                  .sort((a, b) => a.orderIndex - b.orderIndex);
                const weekComplete = weekLessons.filter((l) => completed.includes(l._id)).length;
                const weekPct =
                  weekLessons.length > 0 ? Math.round((weekComplete / weekLessons.length) * 100) : 0;

                const weekCollapsed = collapsedWeeks.has(week);
                const weekPanelId = `curriculum-week-${week}-lessons`;

                return (
                  <motion.section
                    key={week}
                    initial={shouldReduce ? false : { opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ ...spring, delay: 0.04 + weekIdx * 0.04 }}
                    className="overflow-hidden rounded-2xl border border-gray-200/90 bg-white shadow-sm"
                    aria-labelledby={`curriculum-week-${week}-title`}
                  >
                    <div className="border-b border-gray-100 bg-gray-50/80">
                      <button
                        type="button"
                        onClick={() => toggleWeekCollapsed(week)}
                        aria-labelledby={`curriculum-week-${week}-title`}
                        className="flex w-full flex-col gap-3 px-4 py-4 text-left transition-colors hover:bg-gray-100/60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-brand-600 sm:flex-row sm:items-center sm:justify-between sm:px-5 sm:py-4 md:px-6"
                        aria-expanded={!weekCollapsed}
                        aria-controls={weekPanelId}
                      >
                        <div className="flex min-w-0 items-start gap-3">
                          <span
                            className="mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-gray-500"
                            aria-hidden
                          >
                            <motion.span
                              animate={{ rotate: weekCollapsed ? -90 : 0 }}
                              transition={shouldReduce ? { duration: 0 } : { type: 'spring', stiffness: 320, damping: 28 }}
                              className="inline-block text-sm leading-none"
                            >
                              ▼
                            </motion.span>
                          </span>
                          <div className="min-w-0">
                            <h2
                              id={`curriculum-week-${week}-title`}
                              className="text-lg font-bold text-gray-900 md:text-xl"
                            >
                              Week {week}
                            </h2>
                            <p className="mt-0.5 text-sm text-gray-600">
                              {weekComplete} of {weekLessons.length}{' '}
                              {weekLessons.length === 1 ? 'lesson' : 'lessons'} complete
                              <span className="text-gray-400"> · </span>
                              <span className="tabular-nums font-medium text-gray-700">{weekPct}%</span>
                            </p>
                          </div>
                        </div>
                        <div
                          className="pointer-events-none w-full pl-9 sm:max-w-xs sm:flex-1 sm:pl-0 md:max-w-sm"
                          aria-hidden
                        >
                          <div className="h-2 overflow-hidden rounded-full bg-gray-200/80">
                            {weekPct > 0 && (
                              <motion.div
                                className={`h-2 rounded-full ${weekPct === 100 ? 'bg-green-500' : 'bg-brand-500'}`}
                                initial={shouldReduce ? false : { width: 0 }}
                                animate={{ width: `${weekPct}%` }}
                                transition={{ ...spring, stiffness: 70, damping: 18 }}
                              />
                            )}
                          </div>
                        </div>
                      </button>
                    </div>

                    {!weekCollapsed && (
                    <div className="p-4 sm:p-5 md:p-6" id={weekPanelId} role="region">
                      <motion.div
                        variants={shouldReduce ? undefined : sectionVariants}
                        initial={shouldReduce ? false : 'hidden'}
                        animate="visible"
                        className="grid gap-3 sm:grid-cols-2 sm:gap-4 xl:grid-cols-3"
                      >
                        {weekLessons.map((lesson) => {
                          const done = completed.includes(lesson._id);
                          return (
                            <motion.div
                              key={lesson._id}
                              className="flex min-h-0"
                              variants={shouldReduce ? undefined : cardVariants}
                              whileHover={shouldReduce ? undefined : { y: -2, transition: snappy }}
                            >
                              <Link
                                to={`/student/lessons/${lesson._id}`}
                                className={`group flex min-h-[8.5rem] w-full flex-col rounded-xl border p-4 transition-all hover:border-brand-200 hover:shadow-md md:min-h-[9rem] md:p-5 ${
                                  done
                                    ? 'border-green-200/90 bg-green-50/60 hover:border-green-300'
                                    : 'border-gray-200/90 bg-white hover:bg-gray-50/80'
                                }`}
                              >
                                <div className="flex items-start justify-between gap-2">
                                  <span className="inline-flex shrink-0 rounded-md bg-gray-100 px-2 py-0.5 text-xs font-semibold text-gray-600">
                                    #{lesson.orderIndex}
                                  </span>
                                  {done ? (
                                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-green-100 text-sm text-green-700">
                                      ✓
                                    </span>
                                  ) : (
                                    <span className="text-xs font-medium text-gray-400">Open →</span>
                                  )}
                                </div>
                                <h3
                                  className={`mt-3 line-clamp-2 text-base font-semibold leading-snug transition-colors group-hover:text-brand-700 md:text-[1.05rem] ${
                                    done ? 'text-green-900' : 'text-gray-900'
                                  }`}
                                >
                                  {lesson.title}
                                </h3>
                                {lesson.className ? (
                                  <p className="mt-1 truncate text-xs text-gray-500">{lesson.className}</p>
                                ) : null}
                                {lesson.content ? (
                                  <p className="mt-2 line-clamp-2 flex-1 text-sm leading-relaxed text-gray-600">
                                    {lesson.content.replace(/[#*`]/g, '').slice(0, 120)}
                                    …
                                  </p>
                                ) : (
                                  <div className="flex-1" />
                                )}
                                <div className="mt-3 border-t border-gray-100 pt-3">
                                  <span
                                    className={`text-xs font-semibold ${
                                      done ? 'text-green-800' : 'text-brand-600 group-hover:underline'
                                    }`}
                                  >
                                    {done ? 'Completed — review' : 'Start lesson'}
                                  </span>
                                </div>
                              </Link>
                            </motion.div>
                          );
                        })}
                      </motion.div>
                    </div>
                    )}
                  </motion.section>
                );
              })}
            </div>
          )}
        </div>
      )}
    </PageLayout>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-6 pb-24 sm:space-y-8 sm:pb-28 md:pb-32">
      <div className="border-b border-gray-100 pb-5">
        <div className="h-9 w-64 animate-pulse rounded-lg bg-gray-200" />
        <div className="mt-3 h-4 max-w-xl animate-pulse rounded bg-gray-200" />
      </div>
      <div className="h-28 animate-pulse rounded-2xl border border-gray-100 bg-gray-100/80" />
      <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white">
        <div className="h-20 animate-pulse bg-gray-100/80" />
        <div className="grid gap-3 p-4 sm:grid-cols-2 sm:gap-4 xl:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-36 animate-pulse rounded-xl border border-gray-100 bg-gray-50" />
          ))}
        </div>
      </div>
    </div>
  );
}
