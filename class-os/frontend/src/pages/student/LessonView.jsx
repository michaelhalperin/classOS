import { useState, useEffect, useLayoutEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { useQuery } from "@tanstack/react-query";
import { useParams, Link } from "react-router-dom";
import { motion, AnimatePresence, useReducedMotion } from "motion/react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeSanitize from "rehype-sanitize";
import PageLayout, {
  useMainColumnScrollRef,
} from "../../components/layout/PageLayout.jsx";
import LessonTutor from "../../components/ai/LessonTutor.jsx";
import LessonDrills from "../../components/ai/LessonDrills.jsx";
import { getLesson, getLessons, trackLessonTime } from "../../api/lessons.js";
import { getExercises } from "../../api/exercises.js";
import { getQuestions } from "../../api/qna.js";
import { getLessonNotes } from "../../api/lessonNotes.js";
import LessonNotesDrawer from "../../components/lesson/LessonNotesDrawer.jsx";
import { useLessonProgress } from "../../hooks/useLessonProgress.js";
import { extractLessonH2Toc } from "../../utils/lessonToc.js";
import { fileIcon, formatBytes } from "../../utils/fileHelpers.js";

const spring = { type: "spring", stiffness: 100, damping: 20 };

const sectionVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.08 } },
};

const blockVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: spring },
};

export default function LessonView() {
  const shouldReduce = useReducedMotion();
  const { id } = useParams();
  const mainColumnScrollRef = useMainColumnScrollRef();

  const {
    isLessonDone,
    toggleLesson,
    setLessonCompleted,
    isLoading: progressLoading,
    isUpdating,
  } = useLessonProgress();
  const [tutorOpen, setTutorOpen] = useState(false);
  const [drillsOpen, setDrillsOpen] = useState(false);
  const [notesOpen, setNotesOpen] = useState(false);
  const [readProgress, setReadProgress] = useState(0);
  const [showBackTop, setShowBackTop] = useState(false);

  useEffect(() => {
    const el = mainColumnScrollRef?.current;
    if (!el) return;
    const onScroll = () => {
      const scrollable = el.scrollHeight - el.clientHeight;
      setReadProgress(
        scrollable > 0 ? Math.min(100, (el.scrollTop / scrollable) * 100) : 0,
      );
      setShowBackTop(el.scrollTop > 420);
    };
    onScroll();
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, [mainColumnScrollRef, id]);

  useEffect(() => {
    if (!id) return;
    const tick = () => {
      if (document.hidden) return;
      trackLessonTime(id, 30).catch(() => {});
    };
    const interval = setInterval(tick, 30000);
    return () => clearInterval(interval);
  }, [id]);

  const { data: lesson, isLoading } = useQuery({
    queryKey: ["lesson", id],
    queryFn: () => getLesson(id),
  });

  const { data: lessons = [] } = useQuery({
    queryKey: ["lessons"],
    queryFn: () => getLessons(),
  });

  const { data: exercises = [] } = useQuery({
    queryKey: ["exercises", id],
    queryFn: () => getExercises({ lessonId: id }),
    enabled: Boolean(id),
  });

  const { data: questions = [] } = useQuery({
    queryKey: ["questions", id],
    queryFn: () => getQuestions(id),
    enabled: Boolean(id),
  });

  const sortedLessons = [...lessons].sort((a, b) =>
    a.weekNumber !== b.weekNumber
      ? a.weekNumber - b.weekNumber
      : a.orderIndex - b.orderIndex,
  );

  const currentIndex = sortedLessons.findIndex((l) => l._id === id);
  const prevLesson = currentIndex > 0 ? sortedLessons[currentIndex - 1] : null;
  const nextLesson =
    currentIndex < sortedLessons.length - 1
      ? sortedLessons[currentIndex + 1]
      : null;

  const isDone = isLessonDone(id);

  const toggleComplete = () => toggleLesson(id);

  const h2Toc = useMemo(
    () => extractLessonH2Toc(lesson?.content || ""),
    [lesson?.content],
  );

  const objectivesTrim = lesson?.objectives?.trim() ?? "";
  const misconceptionTrim = lesson?.misconceptionWarnings?.trim() ?? "";
  const [objectivesOpen, setObjectivesOpen] = useState(false);
  const [misconceptionOpen, setMisconceptionOpen] = useState(false);
  const [lessonActionsOpen, setLessonActionsOpen] = useState(false);

  useLayoutEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    setObjectivesOpen(false);
    setMisconceptionOpen(false);
    setLessonActionsOpen(false);
  }, [id]);

  useEffect(() => {
    setNotesOpen(false);
  }, [id]);

  const { data: myLessonNotes } = useQuery({
    queryKey: ["lessonNotes", id],
    queryFn: () => getLessonNotes(id),
    enabled: Boolean(id),
  });
  const hasMyNotes = (myLessonNotes?.notes?.length ?? 0) > 0;

  const markdownComponents = useMemo(() => {
    const tocById = Object.fromEntries(h2Toc.map((h) => [h.text, h.id]));
    const counters = {};
    return {
      h2: ({ children, ...props }) => {
        const text =
          typeof children === "string" ? children : String(children ?? "");
        const stripped = text
          .replace(/\*\*([^*]+)\*\*/g, "$1")
          .replace(/\*([^*]+)\*/g, "$1")
          .replace(/`([^`]+)`/g, "$1")
          .trim();
        const id =
          tocById[stripped] ??
          `section-${(counters[stripped] = (counters[stripped] ?? 0) + 1)}`;
        return (
          <h2
            id={id}
            className="scroll-mt-40 text-xl font-bold text-gray-900 border-b border-gray-100 pb-2 mt-10 first:mt-2"
            {...props}
          >
            {children}
          </h2>
        );
      },
    };
  }, [h2Toc]);

  if (isLoading) {
    return (
      <PageLayout>
        <div className="max-w-3xl mx-auto animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-2/3" />
          <div className="h-4 bg-gray-200 rounded w-full" />
          <div className="h-4 bg-gray-200 rounded w-5/6" />
        </div>
      </PageLayout>
    );
  }

  if (!lesson) {
    return (
      <PageLayout>
        <motion.div
          initial={shouldReduce ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={spring}
          className="text-center py-20"
        >
          <p className="text-gray-500">Lesson not found.</p>
          <Link
            to="/student/curriculum"
            className="btn-primary mt-4 inline-flex"
          >
            Back to Curriculum
          </Link>
        </motion.div>
      </PageLayout>
    );
  }

  const readProgressBar = (
    <div
      className="pointer-events-none sticky top-0 z-40 h-0.5 shrink-0 bg-gray-200/80"
      aria-hidden
    >
      <div
        className="h-full bg-brand-600 transition-[width] duration-150 ease-out"
        style={{ width: `${readProgress}%` }}
      />
    </div>
  );

  return (
    <PageLayout mainStickyHeader={readProgressBar}>
      {showBackTop && (
        <button
          type="button"
          className="fixed bottom-24 right-6 z-40 flex h-11 w-11 items-center justify-center rounded-full border border-gray-200 bg-white text-lg text-gray-600 shadow-lg transition-colors hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700 sm:bottom-28"
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          aria-label="Back to top"
        >
          ↑
        </button>
      )}

      <motion.div
        className="mx-auto max-w-6xl px-0 sm:px-0"
        variants={shouldReduce ? undefined : sectionVariants}
        initial={shouldReduce ? false : "hidden"}
        animate="visible"
      >
        {/* Breadcrumb */}
        <motion.div
          variants={shouldReduce ? undefined : blockVariants}
          className="flex items-center gap-2 text-sm text-gray-400 mb-6"
        >
          <Link
            to="/student/curriculum"
            className="hover:text-brand-600 transition-colors"
          >
            Curriculum
          </Link>
          <span>›</span>
          <span className="text-gray-600">Week {lesson.weekNumber}</span>
          <span>›</span>
          <span className="text-gray-900 font-medium truncate">
            {lesson.title}
          </span>
        </motion.div>

        {/* Header */}
        <motion.div
          variants={shouldReduce ? undefined : blockVariants}
          className="mb-6"
        >
          <span className="text-xs font-medium text-brand-600 bg-brand-50 px-2 py-0.5 rounded-full">
            Week {lesson.weekNumber} · Lesson {lesson.orderIndex}
          </span>
          <h1 className="mt-2 text-3xl font-bold text-gray-900 leading-tight">
            {lesson.title}
          </h1>
          {objectivesTrim && (
            <details
              className="mt-4 group rounded-lg border border-brand-100 bg-brand-50/50 open:shadow-sm"
              open={objectivesOpen}
              onToggle={(e) => setObjectivesOpen(e.currentTarget.open)}
            >
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-sm text-brand-800 marker:content-none [&::-webkit-details-marker]:hidden">
                <span className="text-xs font-semibold uppercase tracking-wide text-brand-700">
                  Objectives
                </span>
                <span className="shrink-0 text-xs font-medium text-brand-600">
                  <span className="group-open:hidden">Open</span>
                  <span className="hidden group-open:inline">Close</span>
                </span>
              </summary>
              <div className="border-t border-brand-100/80 px-4 pb-3 pt-2 text-sm text-gray-700 whitespace-pre-wrap">
                {lesson.objectives}
              </div>
            </details>
          )}
          {misconceptionTrim && (
            <details
              className="mt-3 group rounded-lg border border-amber-100 bg-amber-50/40 open:shadow-sm"
              open={misconceptionOpen}
              onToggle={(e) => setMisconceptionOpen(e.currentTarget.open)}
            >
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-sm text-amber-950 marker:content-none [&::-webkit-details-marker]:hidden">
                <span className="text-xs font-semibold uppercase tracking-wide text-amber-900">
                  Watch out for
                </span>
                <span className="shrink-0 text-xs font-medium text-amber-800">
                  <span className="group-open:hidden">Open</span>
                  <span className="hidden group-open:inline">Close</span>
                </span>
              </summary>
              <div className="border-t border-amber-100/90 px-4 pb-3 pt-2 prose prose-sm max-w-none text-gray-800">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  rehypePlugins={[rehypeSanitize]}
                >
                  {lesson.misconceptionWarnings}
                </ReactMarkdown>
              </div>
            </details>
          )}
        </motion.div>

        {/* Lesson actions — collapsible like Objectives / Watch out for */}
        <motion.div
          variants={shouldReduce ? undefined : blockVariants}
          className="-mx-4 mb-6 sm:mx-0"
        >
          <details
            className="group rounded-lg border border-gray-200/90 bg-gray-50/95 backdrop-blur-md sm:rounded-xl sm:border sm:shadow-sm open:shadow-sm"
            open={lessonActionsOpen}
            onToggle={(e) => setLessonActionsOpen(e.currentTarget.open)}
          >
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-sm text-gray-800 marker:content-none [&::-webkit-details-marker]:hidden">
              <span className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                Lesson actions
              </span>
              <span className="shrink-0 text-xs font-medium text-gray-600">
                <span className="group-open:hidden">Open</span>
                <span className="hidden group-open:inline">Close</span>
              </span>
            </summary>
            <div className="border-t border-gray-200/90 px-4 pb-3 pt-2">
              <div className="flex gap-2 flex-wrap items-center">
                <button
                  type="button"
                  onClick={toggleComplete}
                  disabled={progressLoading || isUpdating}
                  className={`shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-colors disabled:opacity-60 ${
                    isDone
                      ? "border border-green-200 bg-green-50 text-green-800 hover:bg-red-50 hover:text-red-700 hover:border-red-200"
                      : "border border-brand-600 bg-brand-600 text-white hover:bg-brand-700 hover:border-brand-700"
                  }`}
                >
                  {isDone ? "✓ Complete" : "Mark Complete"}
                </button>
                <Link
                  to={`/student/qna/${id}`}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-gray-200 text-sm text-gray-600 hover:border-brand-400 hover:text-brand-600 transition-colors bg-white"
                >
                  💬 Q&A
                  {questions.length > 0 && (
                    <span className="bg-brand-100 text-brand-700 text-xs px-1.5 rounded-full">
                      {questions.length}
                    </span>
                  )}
                </Link>
                <button
                  type="button"
                  onClick={() => setNotesOpen(true)}
                  aria-expanded={notesOpen}
                  className={`relative flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-sm transition-colors bg-white ${
                    hasMyNotes
                      ? "border-teal-300 text-teal-900 bg-teal-50/60 hover:border-teal-400"
                      : "border-gray-200 text-gray-600 hover:border-teal-400 hover:text-teal-800"
                  }`}
                >
                  <span aria-hidden>📝</span>
                  My notes
                  {hasMyNotes && (
                    <span
                      className="h-2 w-2 rounded-full bg-teal-500"
                      aria-hidden
                      title="You have notes on this lesson"
                    />
                  )}
                </button>
                {exercises.length > 0 && (
                  <p className="w-full basis-full text-xs leading-snug text-gray-600">
                    <span className="font-semibold text-gray-800">
                      Coding exercises
                    </span>
                    {" — "}
                    each opens the lesson editor: instructions, your code, run
                    output.
                  </p>
                )}
                {exercises.map((ex) => (
                  <Link
                    key={ex._id}
                    to={`/student/exercises/${ex._id}`}
                    title={`Open code exercise in the editor: ${ex.title}`}
                    aria-label={`Open code exercise: ${ex.title}, language ${ex.language}`}
                    className="group inline-flex max-w-full min-w-[12rem] items-center gap-3 rounded-xl border border-emerald-200/90 bg-gradient-to-br from-white to-emerald-50/40 px-3 py-2 text-left shadow-sm transition-all hover:border-emerald-400 hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500"
                  >
                    <span
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-lg text-emerald-800"
                      aria-hidden
                    >
                      💻
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[10px] font-semibold uppercase tracking-wide text-emerald-800">
                        Code exercise
                      </span>
                      <span className="mt-0.5 block truncate text-sm font-semibold text-gray-900 group-hover:text-emerald-900">
                        {ex.title}
                      </span>
                    </span>
                    <span className="flex shrink-0 flex-col items-end gap-1">
                      <span className="rounded-md bg-white/80 px-2 py-0.5 font-mono text-[10px] font-medium uppercase text-emerald-800 ring-1 ring-emerald-200/80">
                        {ex.language}
                      </span>
                      <span className="text-[10px] font-medium text-emerald-600 group-hover:text-emerald-700">
                        Editor →
                      </span>
                    </span>
                  </Link>
                ))}
                <button
                  type="button"
                  onClick={() => {
                    setTutorOpen((o) => {
                      const next = !o;
                      if (next) setDrillsOpen(false);
                      return next;
                    });
                  }}
                  aria-expanded={tutorOpen}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-sm transition-colors ${
                    tutorOpen
                      ? "border-indigo-400 bg-indigo-50 text-indigo-900"
                      : "border-indigo-200 text-indigo-900 hover:border-indigo-400 bg-white"
                  }`}
                >
                  <span aria-hidden>🎓</span>
                  Lesson tutor
                  <span className="text-xs text-indigo-600/80 hidden sm:inline">
                    (this lesson)
                  </span>
                  <span className="text-indigo-600 text-xs">
                    {tutorOpen ? "▼" : "▶"}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setDrillsOpen((o) => {
                      const next = !o;
                      if (next) setTutorOpen(false);
                      return next;
                    });
                  }}
                  aria-expanded={drillsOpen}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-sm transition-colors ${
                    drillsOpen
                      ? "border-amber-400 bg-amber-50/90 text-amber-950"
                      : "border-amber-200 text-amber-950 hover:border-amber-400 bg-white"
                  }`}
                >
                  <span aria-hidden>✏️</span>
                  Practice drills
                  <span className="text-amber-800 text-xs">
                    {drillsOpen ? "▼" : "▶"}
                  </span>
                </button>
              </div>
            </div>
          </details>
        </motion.div>

        {/* TOC + article — long lessons: navigate by section, comfortable measure */}
        <div
          className={
            h2Toc.length > 0
              ? "lg:grid lg:grid-cols-[minmax(0,13rem)_minmax(0,1fr)] lg:gap-x-10 xl:gap-x-12"
              : ""
          }
        >
          {h2Toc.length > 0 && (
            <aside className="mb-5 hidden lg:block">
              <div className="sticky top-40 max-h-[calc(100vh-11rem)] overflow-y-auto space-y-6 pr-1">
                <nav className="space-y-2 text-sm" aria-label="On this page">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                    On this page
                  </p>
                  <ul className="space-y-1.5 border-l border-gray-200 pl-3">
                    {h2Toc.map((h) => (
                      <li key={h.id}>
                        <a
                          href={`#${h.id}`}
                          className="block text-gray-600 transition-colors hover:text-brand-600 line-clamp-3"
                        >
                          {h.text}
                        </a>
                      </li>
                    ))}
                  </ul>
                </nav>

                {/* Attachments in sidebar */}
                {lesson.attachments?.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                      Attachments
                    </p>
                    <ul className="space-y-1.5">
                      {lesson.attachments.map((att) => (
                        <AttachmentItem key={att._id} att={att} />
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </aside>
          )}

          <div className="min-w-0">
            {h2Toc.length > 0 && (
              <details className="lg:hidden mb-5 rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-sm">
                <summary className="cursor-pointer text-sm font-semibold text-gray-800 list-none marker:content-none [&::-webkit-details-marker]:hidden">
                  On this page
                  <span className="ml-1 text-xs font-normal text-gray-500">
                    (jump to section)
                  </span>
                </summary>
                <ul className="mt-3 space-y-2 border-l border-gray-200 pl-3 text-sm">
                  {h2Toc.map((h) => (
                    <li key={h.id}>
                      <a
                        href={`#${h.id}`}
                        className="text-brand-700 hover:underline"
                      >
                        {h.text}
                      </a>
                    </li>
                  ))}
                </ul>
              </details>
            )}

            <motion.div
              variants={shouldReduce ? undefined : blockVariants}
              className="card prose prose-lg prose-gray max-w-none leading-relaxed text-gray-800 prose-headings:scroll-mt-40 prose-headings:text-gray-900 prose-a:text-brand-600"
            >
              <ReactMarkdown
                key={lesson._id}
                remarkPlugins={[remarkGfm]}
                rehypePlugins={[rehypeSanitize]}
                components={markdownComponents}
              >
                {lesson.content || "*This lesson has no content yet.*"}
              </ReactMarkdown>
            </motion.div>

            {/* Attachments below content for lessons without a TOC sidebar, or mobile */}
            {lesson.attachments?.length > 0 && (
              <motion.div
                variants={shouldReduce ? undefined : blockVariants}
                className={h2Toc.length > 0 ? "lg:hidden mt-6" : "mt-6"}
              >
                <div className="card space-y-3">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                    📎 Attachments
                  </p>
                  <ul className="space-y-2">
                    {lesson.attachments.map((att) => (
                      <AttachmentItem key={att._id} att={att} />
                    ))}
                  </ul>
                </div>
              </motion.div>
            )}
          </div>
        </div>

        <LessonTutor
          key={`${lesson._id}-tutor`}
          lessonId={lesson._id}
          lessonTitle={lesson.title}
          open={tutorOpen}
          onOpenChange={setTutorOpen}
          hideTrigger
          presentation="drawer"
        />
        <LessonDrills
          key={`${lesson._id}-drills`}
          lessonId={lesson._id}
          open={drillsOpen}
          onOpenChange={setDrillsOpen}
          hideTrigger
          presentation="drawer"
        />

        <LessonNotesDrawer
          lessonId={id}
          lessonTitle={lesson.title}
          open={notesOpen}
          onOpenChange={setNotesOpen}
        />

        {/* Navigation */}
        <motion.div
          variants={shouldReduce ? undefined : blockVariants}
          className="mt-8 flex items-center justify-between"
        >
          {prevLesson ? (
            <Link
              to={`/student/lessons/${prevLesson._id}`}
              className="btn-secondary"
            >
              ← {prevLesson.title}
            </Link>
          ) : (
            <div />
          )}
          {nextLesson ? (
            <Link
              to={`/student/lessons/${nextLesson._id}`}
              className="btn-primary"
              onClick={() => {
                if (!isDone) setLessonCompleted(id, true);
              }}
            >
              Next: {nextLesson.title} →
            </Link>
          ) : (
            <Link to="/student/curriculum" className="btn-primary">
              Back to Curriculum ✓
            </Link>
          )}
        </motion.div>
      </motion.div>
    </PageLayout>
  );
}

function AttachmentItem({ att }) {
  const [preview, setPreview] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const isPdf = att.mimetype === "application/pdf";
  const isImage = att.mimetype?.startsWith("image/");
  const canPreview = isPdf || isImage;
  const url = `/uploads/${att.storedName}`;

  // Close fullscreen on Escape + lock body scroll
  useEffect(() => {
    if (!fullscreen) return;
    const handler = (e) => {
      if (e.key === "Escape") setFullscreen(false);
    };
    window.addEventListener("keydown", handler);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", handler);
      document.body.style.overflow = "";
    };
  }, [fullscreen]);

  return (
    <li className="text-sm">
      <div className="flex items-center gap-2.5">
        <span className="text-base shrink-0">{fileIcon(att.mimetype)}</span>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-gray-800 truncate leading-tight">
            {att.filename}
          </p>
          <p className="text-[11px] text-gray-400">{formatBytes(att.size)}</p>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {canPreview && (
            <button
              onClick={() => setPreview((v) => !v)}
              className="text-xs px-2 py-1 rounded-md bg-gray-100 hover:bg-gray-200 text-gray-600 transition-colors"
            >
              {preview ? "Hide" : "View"}
            </button>
          )}
          <a
            href={url}
            download={att.filename}
            className="text-xs px-2 py-1 rounded-md bg-brand-50 hover:bg-brand-100 text-brand-700 transition-colors"
          >
            ↓
          </a>
        </div>
      </div>

      {/* Inline preview with "full page" button */}
      {preview && (
        <div className="mt-2 rounded-xl overflow-hidden border border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between px-3 py-1.5 bg-gray-100 border-b border-gray-200">
            <span className="text-xs text-gray-500 truncate">
              {att.filename}
            </span>
            <button
              onClick={() => setFullscreen(true)}
              className="ml-3 shrink-0 text-xs px-2.5 py-1 rounded-md bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 transition-colors flex items-center gap-1.5"
              title="Full page view"
            >
              <svg
                className="w-3.5 h-3.5"
                viewBox="0 0 16 16"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
              >
                <path
                  d="M1.5 6V2.5H5M10.5 1.5H13.5V4.5M14.5 10v3.5H11M5.5 14.5H2.5V11.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              Full page
            </button>
          </div>
          {isPdf && (
            <iframe
              src={url}
              title={att.filename}
              className="w-full"
              style={{ height: "520px" }}
            />
          )}
          {isImage && (
            <img
              src={url}
              alt={att.filename}
              className="w-full h-auto max-h-[520px] object-contain"
            />
          )}
        </div>
      )}

      {/* Full-screen modal — portalled to document.body so it escapes all stacking contexts */}
      {fullscreen &&
        createPortal(
          <div
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 999999,
              display: "flex",
              flexDirection: "column",
              background: "#0a0a0f",
            }}
          >
            {/* Toolbar */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "10px 16px",
                background: "#111827",
                borderBottom: "1px solid rgba(255,255,255,0.1)",
                flexShrink: 0,
                gap: 12,
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  minWidth: 0,
                  flex: 1,
                }}
              >
                <span style={{ fontSize: 18, lineHeight: 1 }}>
                  {fileIcon(att.mimetype)}
                </span>
                <span
                  style={{
                    fontSize: 14,
                    fontWeight: 500,
                    color: "#fff",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {att.filename}
                </span>
                <span style={{ fontSize: 12, color: "#9ca3af", flexShrink: 0 }}>
                  {formatBytes(att.size)}
                </span>
              </div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  flexShrink: 0,
                }}
              >
                <a
                  href={url}
                  download={att.filename}
                  style={{
                    fontSize: 13,
                    padding: "6px 14px",
                    borderRadius: 8,
                    background: "rgba(255,255,255,0.1)",
                    color: "#e5e7eb",
                    textDecoration: "none",
                    border: "1px solid rgba(255,255,255,0.15)",
                    cursor: "pointer",
                  }}
                >
                  ↓ Download
                </a>
                <button
                  onClick={() => setFullscreen(false)}
                  style={{
                    fontSize: 13,
                    fontWeight: 600,
                    padding: "6px 16px",
                    borderRadius: 8,
                    background: "#ef4444",
                    color: "#fff",
                    border: "none",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  ✕ Close
                </button>
              </div>
            </div>

            {/* File content */}
            <div
              style={{
                flex: 1,
                overflow: "hidden",
                display: "flex",
                flexDirection: "column",
              }}
            >
              {isPdf && (
                <iframe
                  src={url}
                  title={att.filename}
                  style={{
                    width: "100%",
                    height: "100%",
                    border: "none",
                    display: "block",
                  }}
                />
              )}
              {isImage && (
                <div
                  style={{
                    width: "100%",
                    height: "100%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: 24,
                    overflow: "auto",
                  }}
                >
                  <img
                    src={url}
                    alt={att.filename}
                    style={{
                      maxWidth: "100%",
                      maxHeight: "100%",
                      objectFit: "contain",
                    }}
                  />
                </div>
              )}
            </div>
          </div>,
          document.body,
        )}
    </li>
  );
}
