import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useParams, Link } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeSanitize from "rehype-sanitize";
import { motion, AnimatePresence, useReducedMotion } from "motion/react";
import PageLayout from "../../components/layout/PageLayout.jsx";
import { useClass } from "../../context/ClassContext.jsx";
import {
  getLessons,
  getLesson,
  createLesson,
  updateLesson,
  deleteLesson,
  reorderLessons,
  uploadAttachment,
  deleteAttachment,
} from "../../api/lessons.js";
import { polishLesson, getLessonInsights } from "../../api/ai.js";
import { createExercise } from "../../api/exercises.js";
import { fileIcon, formatBytes } from "../../utils/fileHelpers.js";

// ─── Motion configs ───────────────────────────────────────────────────────────
const SPRING = { type: "spring", stiffness: 300, damping: 28 };
const SNAPPY = { type: "spring", stiffness: 400, damping: 30 };

function formatMisconceptionForLesson(m) {
  const title = String(m?.title || "").trim() || "Misconception";
  const expl = String(m?.explanation || "").trim();
  const addr = String(m?.howToAddress || "").trim();
  let block = `#### ${title}\n\n${expl}`;
  if (addr) block += `\n\n*How to address:* ${addr}`;
  return block;
}

function lessonFormToPayload(v) {
  return {
    title: v.title,
    content: v.content ?? "",
    objectives: v.objectives ?? "",
    misconceptionWarnings: v.misconceptionWarnings ?? "",
    weekNumber: v.weekNumber,
    orderIndex: v.orderIndex,
  };
}

// ─── Small reusable pieces ────────────────────────────────────────────────────
function SectionLabel({ children }) {
  return (
    <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 mb-2 px-1">
      {children}
    </p>
  );
}

function PanelBlock({ children, className = "" }) {
  return (
    <div
      className={`rounded-xl border border-gray-100 bg-gray-50/60 p-4 ${className}`}
    >
      {children}
    </div>
  );
}

// ─── Icons ────────────────────────────────────────────────────────────────────
function IconPlus() {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 13 13"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M6.5 1v11M1 6.5h11"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}
function IconEye() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 14 14"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M1 7s2.5-4.5 6-4.5S13 7 13 7s-2.5 4.5-6 4.5S1 7 1 7z"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
      <circle cx="7" cy="7" r="1.5" stroke="currentColor" strokeWidth="1.4" />
    </svg>
  );
}
function IconEdit() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 14 14"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M9.5 2.5l2 2L4 12H2v-2L9.5 2.5z"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
function IconSparkle() {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 13 13"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M6.5 1l1 3.5L11 5.5l-3.5 1L6.5 10l-1-3.5L2 5.5l3.5-1L6.5 1z"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinejoin="round"
      />
    </svg>
  );
}
function IconPaperclip() {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 13 13"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M11 5.5L5.5 11A3.182 3.182 0 011 6.5L6.5 1a2.121 2.121 0 013 3L4 9.5A1.06 1.06 0 012.5 8L8 2.5"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
function IconTrash() {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 13 13"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M2 3.5h9M5 3.5V2.5h3v1M4 3.5l.5 7h4l.5-7"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
function IconChevron({ dir = "down" }) {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 13 13"
      fill="none"
      aria-hidden="true"
      style={{ transform: dir === "up" ? "rotate(180deg)" : "none" }}
    >
      <path
        d="M3 5l3.5 3.5L10 5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
function IconList() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M2 4h12M2 8h12M2 12h9"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </svg>
  );
}
function IconSliders() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M2 4h12M5 4v2.5M11 4v5M2 10h12M8 10v4"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
      <circle cx="5" cy="10" r="1.2" fill="currentColor" />
      <circle cx="11" cy="4" r="1.2" fill="currentColor" />
    </svg>
  );
}
function IconDrag() {
  return (
    <svg
      width="12"
      height="16"
      viewBox="0 0 12 16"
      fill="none"
      aria-hidden="true"
    >
      <circle cx="4" cy="4" r="1" fill="currentColor" />
      <circle cx="8" cy="4" r="1" fill="currentColor" />
      <circle cx="4" cy="8" r="1" fill="currentColor" />
      <circle cx="8" cy="8" r="1" fill="currentColor" />
      <circle cx="4" cy="12" r="1" fill="currentColor" />
      <circle cx="8" cy="12" r="1" fill="currentColor" />
    </svg>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function LessonEditor() {
  const { activeClassId, classes, isLoading: classesLoading } = useClass();
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const shouldReduce = useReducedMotion();

  const isEditing = Boolean(id);

  const [selectedLesson, setSelectedLesson] = useState(id || null);
  const [preview, setPreview] = useState(false);
  const [rightPanelTab, setRightPanelTab] = useState("meta"); // "meta" | "ai" | "files"

  // AI state
  const [polishBusy, setPolishBusy] = useState(null);
  const [polishExpand, setPolishExpand] = useState("");
  const [polishExtra, setPolishExtra] = useState(null);
  /** Indices in `polishExtra.exercises` already quick-added (cleared when AI returns a new batch). */
  const [addedSuggestedExerciseIndices, setAddedSuggestedExerciseIndices] =
    useState(() => new Set());
  /** Indices in `polishExtra.misconceptions` already quick-added. */
  const [addedMisconceptionIndices, setAddedMisconceptionIndices] = useState(
    () => new Set(),
  );
  const [insights, setInsights] = useState(null);
  const [insightsLoading, setInsightsLoading] = useState(false);

  // File state
  const [attachments, setAttachments] = useState([]);
  const [pendingFiles, setPendingFiles] = useState([]);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [uploadError, setUploadError] = useState("");

  // Drag-reorder state
  const [dragId, setDragId] = useState(null);
  const [dragOverId, setDragOverId] = useState(null);

  // Mobile / narrow: slide-over panels; lg+: three-column layout
  const [wideLessonLayout, setWideLessonLayout] = useState(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia("(min-width: 1024px)").matches,
  );
  const [mobileLessonsOpen, setMobileLessonsOpen] = useState(false);
  const [mobileToolsOpen, setMobileToolsOpen] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const sync = () => {
      setWideLessonLayout(mq.matches);
      if (mq.matches) {
        setMobileLessonsOpen(false);
        setMobileToolsOpen(false);
      }
    };
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    if (wideLessonLayout || (!mobileLessonsOpen && !mobileToolsOpen)) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [wideLessonLayout, mobileLessonsOpen, mobileToolsOpen]);

  useEffect(() => {
    setAddedSuggestedExerciseIndices(new Set());
    setAddedMisconceptionIndices(new Set());
  }, [polishExtra]);

  // ── Queries ──
  const { data: lessons = [] } = useQuery({
    queryKey: ["lessons", activeClassId],
    queryFn: () => getLessons(activeClassId),
    enabled: Boolean(activeClassId),
  });

  const { data: lessonData } = useQuery({
    queryKey: ["lesson", selectedLesson],
    queryFn: () => getLesson(selectedLesson),
    enabled: Boolean(selectedLesson),
  });

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    getValues,
    formState: { errors, isDirty },
  } = useForm({
    defaultValues: {
      title: "",
      content: "",
      objectives: "",
      misconceptionWarnings: "",
      weekNumber: 1,
      orderIndex: 1,
    },
  });

  useEffect(() => {
    if (lessonData) {
      reset({
        ...lessonData,
        misconceptionWarnings: lessonData.misconceptionWarnings || "",
      });
      setAttachments(lessonData.attachments || []);
    }
  }, [lessonData, reset]);

  // ── Mutations ──
  const reorderMutation = useMutation({
    mutationFn: (order) => reorderLessons(activeClassId, order),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["lessons"] }),
  });

  const saveMutation = useMutation({
    mutationFn: (data) =>
      selectedLesson
        ? updateLesson(selectedLesson, data)
        : createLesson({ ...data, classId: activeClassId }),
    onSuccess: async (saved) => {
      if (pendingFiles.length > 0) {
        let latest = saved;
        for (const file of pendingFiles) {
          try {
            latest = await uploadAttachment(saved._id, file);
          } catch {}
        }
        setAttachments(latest.attachments || []);
        setPendingFiles([]);
      }
      queryClient.invalidateQueries({ queryKey: ["lessons"] });
      queryClient.invalidateQueries({ queryKey: ["lesson", saved._id] });
      setSelectedLesson(saved._id);
      navigate(`/teacher/lessons/${saved._id}`, { replace: true });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteLesson(selectedLesson),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lessons"] });
      setSelectedLesson(null);
      reset({
        title: "",
        content: "",
        objectives: "",
        misconceptionWarnings: "",
        weekNumber: 1,
        orderIndex: 1,
      });
      navigate("/teacher/lessons", { replace: true });
    },
  });

  const addSuggestedExerciseMutation = useMutation({
    mutationFn: async ({ ex }) => {
      const title = (ex.title || "").trim() || "Exercise";
      const instructions = (ex.instructions || "").trim();
      if (!instructions) {
        const err = new Error("This suggestion has no instructions.");
        throw err;
      }
      return createExercise({
        lessonId: selectedLesson,
        title,
        instructions,
        starterCode: (ex.starterCode || "").trim(),
        language: (ex.language && String(ex.language).trim()) || "javascript",
      });
    },
    onSuccess: (_created, { index }) => {
      setAddedSuggestedExerciseIndices((prev) => new Set(prev).add(index));
      queryClient.invalidateQueries({ queryKey: ["exercises", activeClassId] });
      queryClient.invalidateQueries({
        queryKey: ["exercises", selectedLesson],
      });
    },
    onError: (e) => {
      alert(e.response?.data?.message || e.message);
    },
  });

  const appendMisconceptionMutation = useMutation({
    mutationFn: async ({ m }) => {
      const v = getValues();
      const cur = (v.misconceptionWarnings || "").trim();
      const block = formatMisconceptionForLesson(m);
      const misconceptionWarnings = cur ? `${cur}\n\n---\n\n${block}` : block;
      return updateLesson(selectedLesson, {
        ...lessonFormToPayload(v),
        misconceptionWarnings,
      });
    },
    onSuccess: (updated, { index }) => {
      if (typeof index === "number") {
        setAddedMisconceptionIndices((prev) => new Set(prev).add(index));
      }
      reset({
        ...updated,
        misconceptionWarnings: updated.misconceptionWarnings || "",
      });
      queryClient.invalidateQueries({ queryKey: ["lesson", selectedLesson] });
      queryClient.invalidateQueries({ queryKey: ["lessons"] });
    },
    onError: (e) => {
      alert(e.response?.data?.message || e.message);
    },
  });

  // ── Handlers ──
  const handleNewLesson = () => {
    setSelectedLesson(null);
    setAttachments([]);
    setPendingFiles([]);
    setUploadError("");
    reset({
      title: "",
      content: "",
      objectives: "",
      misconceptionWarnings: "",
      weekNumber: 1,
      orderIndex: 1,
    });
    navigate("/teacher/lessons", { replace: true });
  };

  const runPolish = async (mode) => {
    if (!selectedLesson) return;
    setPolishBusy(mode);
    setPolishExtra(null);
    setPolishExpand("");
    try {
      const data = await polishLesson(selectedLesson, mode);
      if (mode === "expand") {
        setPolishExpand(data.markdown || "");
        setPolishExtra(null);
      } else {
        setPolishExpand("");
        setPolishExtra(data);
      }
    } catch (e) {
      alert(e.response?.data?.message || e.message);
    } finally {
      setPolishBusy(null);
    }
  };

  const loadInsights = async () => {
    if (!selectedLesson) return;
    setInsightsLoading(true);
    setInsights(null);
    try {
      const data = await getLessonInsights(selectedLesson);
      setInsights(data);
    } catch (e) {
      alert(e.response?.data?.message || e.message);
    } finally {
      setInsightsLoading(false);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadError("");
    if (!selectedLesson) {
      setPendingFiles((prev) => [...prev, file]);
      e.target.value = "";
      return;
    }
    setUploadingFile(true);
    try {
      const updated = await uploadAttachment(selectedLesson, file);
      setAttachments(updated.attachments || []);
      queryClient.invalidateQueries({ queryKey: ["lesson", selectedLesson] });
    } catch (err) {
      setUploadError(err.response?.data?.message || "Upload failed");
    } finally {
      setUploadingFile(false);
      e.target.value = "";
    }
  };

  const handleDeleteAttachment = async (attachId) => {
    if (!selectedLesson) return;
    try {
      const updated = await deleteAttachment(selectedLesson, attachId);
      setAttachments(updated.attachments || []);
      queryClient.invalidateQueries({ queryKey: ["lesson", selectedLesson] });
    } catch (err) {
      alert(err.response?.data?.message || "Failed to delete attachment");
    }
  };

  const contentValue = watch("content");
  const titleValue = watch("title");
  const weeks = [...new Set(lessons.map((l) => l.weekNumber))].sort(
    (a, b) => a - b,
  );

  // ── No-class guard ──
  if (!classesLoading && classes.length === 0) {
    return (
      <PageLayout>
        <div className="flex flex-col items-center justify-center h-full py-24 text-center">
          <div className="w-14 h-14 rounded-2xl bg-brand-50 border border-brand-100 flex items-center justify-center mb-4">
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              aria-hidden="true"
            >
              <path
                d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"
                stroke="#2147f5"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-gray-900 mb-1">
            No class selected
          </h2>
          <p className="text-sm text-gray-500 mb-6 max-w-xs">
            Create a class first — lessons belong to a class.
          </p>
          <Link to="/teacher/classes" className="btn-primary">
            Go to Classes
          </Link>
        </div>
      </PageLayout>
    );
  }

  // ── Main layout ──
  const closeMobilePanels = () => {
    setMobileLessonsOpen(false);
    setMobileToolsOpen(false);
  };

  return (
    <PageLayout fullWidth edgeToEdge>
      <div className="relative flex min-h-0 w-full flex-1">
        {/* Mobile / tablet: dim background when a slide-over is open */}
        {!wideLessonLayout && (mobileLessonsOpen || mobileToolsOpen) && (
          <button
            type="button"
            className="fixed inset-0 z-[25] border-0 bg-black/40 p-0 lg:hidden"
            aria-label="Close panels"
            onClick={closeMobilePanels}
          />
        )}

        {/* ════════════════════════════════════════════════
            LEFT: Lesson List (240px desktop / drawer mobile)
        ════════════════════════════════════════════════ */}
        <aside
          className={`fixed inset-y-0 left-0 z-[30] flex w-[min(18.5rem,92vw)] shrink-0 flex-col border-r border-gray-200 bg-white transition-transform duration-200 ease-out lg:relative lg:z-auto lg:w-60 lg:max-w-none lg:translate-x-0 ${
            mobileLessonsOpen
              ? "max-lg:translate-x-0"
              : "max-lg:-translate-x-full"
          }`}
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-gray-100 px-4 py-4 max-md:pt-14">
            <span className="text-[13px] font-semibold text-gray-800">
              Lessons
            </span>
            <motion.button
              onClick={() => {
                handleNewLesson();
                if (!wideLessonLayout) setMobileLessonsOpen(false);
              }}
              whileHover={shouldReduce ? {} : { scale: 1.05 }}
              whileTap={shouldReduce ? {} : { scale: 0.95 }}
              transition={SNAPPY}
              className="touch-manipulation flex items-center gap-1.5 rounded-lg bg-brand-600 px-2.5 py-1.5 text-[12px] font-medium text-white transition-colors hover:bg-brand-700"
            >
              <IconPlus /> New
            </motion.button>
          </div>

          {/* Lessons grouped by week */}
          <div className="flex-1 overflow-y-auto py-2">
            {lessons.length === 0 && (
              <div className="px-4 py-8 text-center">
                <p className="text-sm text-gray-400">No lessons yet.</p>
                <button
                  type="button"
                  onClick={() => {
                    handleNewLesson();
                    if (!wideLessonLayout) setMobileLessonsOpen(false);
                  }}
                  className="mt-2 touch-manipulation text-xs font-medium text-brand-600 hover:underline"
                >
                  Create your first lesson →
                </button>
              </div>
            )}

            {weeks.map((week) => (
              <div key={week} className="mb-1">
                <div className="px-4 py-1.5 flex items-center gap-2">
                  <span className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">
                    Week {week}
                  </span>
                  <div className="flex-1 h-px bg-gray-100" />
                </div>
                {lessons
                  .filter((l) => l.weekNumber === week)
                  .sort((a, b) => a.orderIndex - b.orderIndex)
                  .map((lesson) => {
                    const isActive = selectedLesson === lesson._id;
                    const isDragging = dragId === lesson._id;
                    const isDragOver =
                      dragOverId === lesson._id && dragId !== lesson._id;
                    return (
                      <div
                        key={lesson._id}
                        draggable={wideLessonLayout}
                        onDragStart={() => setDragId(lesson._id)}
                        onDragEnd={() => {
                          if (dragId && dragOverId && dragId !== dragOverId) {
                            const sorted = [...lessons].sort((a, b) =>
                              a.weekNumber !== b.weekNumber
                                ? a.weekNumber - b.weekNumber
                                : a.orderIndex - b.orderIndex,
                            );
                            const fromIdx = sorted.findIndex(
                              (l) => l._id === dragId,
                            );
                            const toIdx = sorted.findIndex(
                              (l) => l._id === dragOverId,
                            );
                            const reordered = [...sorted];
                            const [moved] = reordered.splice(fromIdx, 1);
                            reordered.splice(toIdx, 0, moved);
                            const weekCounters = {};
                            const order = reordered.map((l) => {
                              weekCounters[l.weekNumber] =
                                (weekCounters[l.weekNumber] || 0) + 1;
                              return {
                                id: l._id,
                                weekNumber: l.weekNumber,
                                orderIndex: weekCounters[l.weekNumber],
                              };
                            });
                            reorderMutation.mutate(order);
                          }
                          setDragId(null);
                          setDragOverId(null);
                        }}
                        onDragOver={(e) => {
                          e.preventDefault();
                          setDragOverId(lesson._id);
                        }}
                        onDragLeave={() => {
                          if (dragOverId === lesson._id) setDragOverId(null);
                        }}
                        onClick={() => {
                          setSelectedLesson(lesson._id);
                          navigate(`/teacher/lessons/${lesson._id}`);
                          if (!wideLessonLayout) setMobileLessonsOpen(false);
                        }}
                        className={`group relative mx-2 flex cursor-pointer items-center gap-1.5 rounded-lg px-2 py-2 transition-all touch-manipulation ${
                          isActive
                            ? "bg-brand-50 text-brand-700"
                            : isDragOver
                              ? "bg-brand-50 border border-dashed border-brand-300"
                              : isDragging
                                ? "opacity-40"
                                : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                        }`}
                      >
                        {/* Left accent on active */}
                        {isActive && (
                          <motion.span
                            layoutId="lesson-list-active"
                            className="absolute left-0 top-1.5 bottom-1.5 w-0.5 rounded-full bg-brand-500"
                            transition={shouldReduce ? { duration: 0 } : SNAPPY}
                          />
                        )}
                        <span
                          className={`hidden shrink-0 lg:block ${
                            isActive
                              ? "text-brand-400"
                              : "text-gray-300 group-hover:text-gray-400"
                          }`}
                        >
                          <IconDrag />
                        </span>
                        {/* Title */}
                        <span className="text-[12.5px] font-medium truncate flex-1 leading-tight pl-0.5">
                          {lesson.title || "Untitled"}
                        </span>
                        {/* Order number badge */}
                        <span
                          className={`shrink-0 text-[10px] font-mono ${isActive ? "text-brand-400" : "text-gray-300"}`}
                        >
                          {lesson.orderIndex}
                        </span>
                      </div>
                    );
                  })}
              </div>
            ))}

            {reorderMutation.isPending && (
              <p className="px-4 py-2 text-[11px] text-brand-500 animate-pulse">
                Saving order…
              </p>
            )}
          </div>
        </aside>

        {/* ════════════════════════════════════════════════
            CENTRE: Editor (flex-1)
        ════════════════════════════════════════════════ */}
        <div className="flex min-h-0 min-w-0 flex-1 flex-col bg-gray-50">
          <form
            onSubmit={handleSubmit((data) => saveMutation.mutate(data))}
            className="flex min-h-0 flex-1 flex-col"
          >
            {/* ── Top bar: one row; title truncates on the left, actions always visible on the right ── */}
            <div className="flex min-w-0 shrink-0 flex-nowrap items-center gap-2 border-b border-gray-200 bg-white px-3 py-2.5 max-md:pl-14 md:gap-3 md:px-6 md:py-3">
              <div className="flex min-w-0 flex-1 items-center gap-2 overflow-hidden">
                <div className="flex shrink-0 items-center gap-2 lg:contents">
                  <button
                    type="button"
                    className="touch-manipulation flex shrink-0 items-center gap-1 rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-[12px] font-medium text-gray-700 lg:hidden"
                    onClick={() => {
                      setMobileToolsOpen(false);
                      setMobileLessonsOpen(true);
                    }}
                  >
                    <IconList /> Lessons
                  </button>
                  <button
                    type="button"
                    className="touch-manipulation flex shrink-0 items-center gap-1 rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-[12px] font-medium text-gray-700 lg:hidden"
                    onClick={() => {
                      setMobileLessonsOpen(false);
                      setMobileToolsOpen(true);
                    }}
                  >
                    <IconSliders /> Tools
                  </button>
                </div>
                <input
                  {...register("title", { required: "Title is required" })}
                  className={`min-w-0 flex-1 truncate rounded-sm border-none bg-transparent text-base font-semibold text-gray-900 outline-none placeholder-gray-300 focus:ring-2 focus:ring-brand-500/30 md:text-[18px] ${
                    errors.title
                      ? "ring-2 ring-red-400 ring-offset-1 ring-offset-white"
                      : ""
                  }`}
                  placeholder="Untitled lesson…"
                  title={errors.title ? errors.title.message : undefined}
                  aria-invalid={errors.title ? "true" : undefined}
                />
                {errors.title && (
                  <span className="sr-only">{errors.title.message}</span>
                )}
              </div>

              <div className="relative z-10 flex shrink-0 items-center gap-2 border-l border-gray-100 bg-white pl-2 md:gap-3 md:pl-3">
                {/* Preview toggle */}
                <div className="flex shrink-0 items-center gap-0.5 rounded-lg bg-gray-100 p-0.5 md:gap-1 md:p-1">
                  <button
                    type="button"
                    onClick={() => setPreview(false)}
                    className={`touch-manipulation flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium transition-all md:gap-1.5 md:px-2.5 md:text-[12px] ${
                      !preview
                        ? "bg-white text-gray-800 shadow-sm"
                        : "text-gray-500 hover:text-gray-700"
                    }`}
                  >
                    <IconEdit /> <span className="max-sm:hidden">Edit</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreview(true)}
                    className={`touch-manipulation flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium transition-all md:gap-1.5 md:px-2.5 md:text-[12px] ${
                      preview
                        ? "bg-white text-gray-800 shadow-sm"
                        : "text-gray-500 hover:text-gray-700"
                    }`}
                  >
                    <IconEye /> <span className="max-sm:hidden">Preview</span>
                  </button>
                </div>

                <motion.button
                  type="submit"
                  disabled={
                    saveMutation.isPending || (!isDirty && !!selectedLesson)
                  }
                  whileHover={shouldReduce ? {} : { scale: 1.02 }}
                  whileTap={shouldReduce ? {} : { scale: 0.97 }}
                  transition={SNAPPY}
                  className="btn-primary touch-manipulation px-3 py-1.5 text-sm md:px-4"
                >
                  {saveMutation.isPending
                    ? "Saving…"
                    : selectedLesson
                      ? "Save"
                      : "Create"}
                </motion.button>
              </div>
            </div>

            {/* ── Editor / Preview area ── */}
            <div className="flex flex-1 min-h-0 flex-col overflow-y-auto">
              <AnimatePresence mode="wait">
                {preview ? (
                  <motion.div
                    key="preview"
                    initial={
                      shouldReduce ? { opacity: 0 } : { opacity: 0, y: 4 }
                    }
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.15 }}
                    className="mx-auto w-full max-w-3xl flex-1 px-4 py-6 sm:px-6 md:px-8 md:py-10"
                  >
                    <h1 className="mb-4 text-xl font-bold text-gray-900 md:mb-6 md:text-2xl">
                      {titleValue || "Untitled lesson"}
                    </h1>
                    <div className="prose prose-sm max-w-none">
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        rehypePlugins={[rehypeSanitize]}
                      >
                        {contentValue ||
                          "*No content yet — switch to Edit to write something.*"}
                      </ReactMarkdown>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div
                    key="editor"
                    initial={
                      shouldReduce ? { opacity: 0 } : { opacity: 0, y: 4 }
                    }
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.15 }}
                    className="flex min-h-0 flex-1 flex-col"
                  >
                    <textarea
                      {...register("content")}
                      className="min-h-0 w-full flex-1 border-none bg-gray-50 px-4 py-4 font-mono text-[13px] leading-relaxed text-gray-800 outline-none placeholder-gray-300 sm:px-6 md:px-8 md:py-8 md:text-[13.5px] resize-none"
                      placeholder={
                        "# Lesson title\n\nStart writing in markdown…\n\n## Section\n\nParagraph text here."
                      }
                      spellCheck={false}
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* ── Status bar ── */}
            <div className="flex shrink-0 flex-wrap items-center gap-x-3 gap-y-1 border-t border-gray-100 bg-white px-3 py-2 text-[10px] text-gray-400 sm:text-[11px] md:gap-4 md:px-6">
              <span>{(contentValue || "").length} chars</span>
              <span>
                {(contentValue || "").split(/\s+/).filter(Boolean).length} words
              </span>
              {isDirty && (
                <span className="font-medium text-amber-500">● Unsaved</span>
              )}
              {saveMutation.isSuccess && (
                <span className="font-medium text-green-500">✓ Saved</span>
              )}
              {saveMutation.isError && (
                <span className="font-medium text-red-500">
                  ✕{" "}
                  {saveMutation.error?.response?.data?.message || "Save failed"}
                </span>
              )}
              {selectedLesson && (
                <span className="flex w-full items-center gap-3 min-[380px]:ml-auto min-[380px]:w-auto">
                  <Link
                    to={`/teacher/qna/${selectedLesson}`}
                    className="touch-manipulation font-medium text-brand-500 hover:text-brand-700"
                  >
                    Q&amp;A →
                  </Link>
                  <button
                    type="button"
                    onClick={() => {
                      if (
                        window.confirm(
                          "Delete this lesson? This cannot be undone.",
                        )
                      )
                        deleteMutation.mutate();
                    }}
                    disabled={deleteMutation.isPending}
                    className="touch-manipulation font-medium text-red-400 hover:text-red-600"
                  >
                    {deleteMutation.isPending ? "Deleting…" : "Delete"}
                  </button>
                </span>
              )}
            </div>
          </form>
        </div>

        {/* ════════════════════════════════════════════════
            RIGHT: Meta / AI / Files panel (280px desktop / drawer mobile)
        ════════════════════════════════════════════════ */}
        <aside
          className={`fixed inset-y-0 right-0 z-[30] flex w-[min(100vw,21rem)] shrink-0 flex-col overflow-y-auto border-l border-gray-200 bg-white transition-transform duration-200 ease-out max-lg:max-w-[100vw] lg:relative lg:z-auto lg:w-72 lg:translate-x-0 ${
            mobileToolsOpen ? "max-lg:translate-x-0" : "max-lg:translate-x-full"
          }`}
        >
          {/* Tab bar */}
          <div className="flex shrink-0 gap-0.5 border-b border-gray-100 px-2 pt-2 max-md:pt-12">
            {[
              { id: "meta", label: "Details" },
              { id: "ai", label: "AI Tools" },
              { id: "files", label: "Files" },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setRightPanelTab(tab.id)}
                className={`relative flex-1 touch-manipulation rounded-t-md pb-2 pt-1 text-[11px] font-medium transition-colors sm:text-[12px] ${
                  rightPanelTab === tab.id
                    ? "text-brand-700"
                    : "text-gray-400 hover:text-gray-600"
                }`}
              >
                {tab.label}
                {rightPanelTab === tab.id && (
                  <motion.span
                    layoutId="panel-tab-indicator"
                    className="absolute bottom-0 left-2 right-2 h-0.5 rounded-full bg-brand-500"
                    transition={shouldReduce ? { duration: 0 } : SNAPPY}
                  />
                )}
              </button>
            ))}
          </div>

          {/* Tab panels */}
          <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-4 py-4">
            {/* ─── Details tab ─── */}
            {rightPanelTab === "meta" && (
              <motion.div
                key="meta"
                initial={shouldReduce ? false : { opacity: 0, x: 8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={SPRING}
                className="flex min-h-0 flex-1 flex-col gap-4"
              >
                <PanelBlock className="shrink-0">
                  <SectionLabel>Position</SectionLabel>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] text-gray-500 mb-1 font-medium">
                        Week
                      </label>
                      <input
                        {...register("weekNumber", {
                          required: true,
                          valueAsNumber: true,
                          min: 1,
                        })}
                        type="number"
                        min="1"
                        className="input text-sm py-1.5"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-gray-500 mb-1 font-medium">
                        Order
                      </label>
                      <input
                        {...register("orderIndex", {
                          required: true,
                          valueAsNumber: true,
                          min: 1,
                        })}
                        type="number"
                        min="1"
                        className="input text-sm py-1.5"
                      />
                    </div>
                  </div>
                </PanelBlock>

                <PanelBlock className="flex min-h-0 flex-1 flex-col">
                  <SectionLabel>Learning Objectives</SectionLabel>
                  <p className="text-[11px] text-gray-400 mb-2 shrink-0">
                    Used by the AI tutor and quiz generator
                  </p>
                  <textarea
                    {...register("objectives")}
                    className="input min-h-[14rem] w-full flex-1 resize-y font-mono text-xs leading-relaxed"
                    placeholder={
                      "- Understand…\n- Be able to…\n- Know when to…"
                    }
                  />
                </PanelBlock>

                <PanelBlock className="shrink-0">
                  <SectionLabel>Misconception warnings</SectionLabel>
                  <p className="text-[11px] text-gray-400 mb-2">
                    Markdown shown to students (optional). Use AI Tools → quick
                    add, or edit here.
                  </p>
                  <textarea
                    {...register("misconceptionWarnings")}
                    rows={6}
                    className="input font-mono text-xs resize-y leading-relaxed"
                    placeholder={
                      "#### Common slip\n\nWhy students confuse this…"
                    }
                  />
                </PanelBlock>

                {!selectedLesson && (
                  <div className="shrink-0 rounded-xl bg-brand-50 border border-brand-100 p-3 text-[12px] text-brand-800">
                    <span className="font-semibold">Tip:</span> Save this lesson
                    first to unlock AI tools and file uploads.
                  </div>
                )}
              </motion.div>
            )}

            {/* ─── AI tab ─── */}
            {rightPanelTab === "ai" && (
              <motion.div
                key="ai"
                initial={shouldReduce ? false : { opacity: 0, x: 8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={SPRING}
                className="space-y-3"
              >
                {!selectedLesson ? (
                  <div className="rounded-xl bg-gray-50 border border-gray-200 p-4 text-center text-sm text-gray-500">
                    Save the lesson first to use AI tools.
                  </div>
                ) : (
                  <>
                    <div className="space-y-2">
                      {[
                        {
                          mode: "expand",
                          label: "Expand to fuller markdown",
                          icon: "✦",
                        },
                        {
                          mode: "exercises",
                          label: "Suggest exercises",
                          icon: "⬡",
                        },
                        {
                          mode: "misconceptions",
                          label: "Misconception warnings",
                          icon: "⚠",
                        },
                      ].map(({ mode, label, icon }) => (
                        <motion.button
                          key={mode}
                          type="button"
                          onClick={() => runPolish(mode)}
                          disabled={!!polishBusy}
                          whileHover={shouldReduce ? {} : { scale: 1.01 }}
                          whileTap={shouldReduce ? {} : { scale: 0.98 }}
                          transition={SNAPPY}
                          className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg border border-gray-200 bg-white text-[12.5px] font-medium text-gray-700 hover:border-brand-200 hover:bg-brand-50 hover:text-brand-700 transition-colors disabled:opacity-40"
                        >
                          <span className="text-gray-400 text-[13px]">
                            {icon}
                          </span>
                          {polishBusy === mode ? (
                            <span className="flex items-center gap-1.5">
                              <span className="w-3 h-3 rounded-full border-2 border-brand-500 border-t-transparent animate-spin" />
                              Working…
                            </span>
                          ) : (
                            label
                          )}
                        </motion.button>
                      ))}

                      <motion.button
                        type="button"
                        onClick={loadInsights}
                        disabled={insightsLoading}
                        whileHover={shouldReduce ? {} : { scale: 1.01 }}
                        whileTap={shouldReduce ? {} : { scale: 0.98 }}
                        transition={SNAPPY}
                        className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg border border-amber-200 bg-amber-50/70 text-[12.5px] font-medium text-amber-800 hover:bg-amber-100 transition-colors disabled:opacity-40"
                      >
                        <span className="text-[13px]">◎</span>
                        {insightsLoading ? (
                          <span className="flex items-center gap-1.5">
                            <span className="w-3 h-3 rounded-full border-2 border-amber-500 border-t-transparent animate-spin" />
                            Analysing…
                          </span>
                        ) : (
                          "Q&A confusion clusters"
                        )}
                      </motion.button>
                    </div>

                    {/* AI results */}
                    <AnimatePresence>
                      {polishExpand && (
                        <motion.div
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0 }}
                          className="space-y-2"
                        >
                          <SectionLabel>Expanded draft</SectionLabel>
                          <textarea
                            readOnly
                            className="input font-mono text-xs max-h-48 resize-none"
                            rows={7}
                            value={polishExpand}
                          />
                          <button
                            type="button"
                            className="text-xs text-brand-600 hover:text-brand-700 font-medium"
                            onClick={() => {
                              const cur = watch("content") || "";
                              setValue(
                                "content",
                                cur
                                  ? `${cur}\n\n---\n\n${polishExpand}`
                                  : polishExpand,
                                { shouldDirty: true },
                              );
                            }}
                          >
                            Append to content →
                          </button>
                        </motion.div>
                      )}

                      {polishExtra?.exercises && (
                        <motion.div
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0 }}
                          className="space-y-2"
                        >
                          <SectionLabel>Suggested exercises</SectionLabel>
                          <ul className="space-y-2 max-h-64 overflow-y-auto">
                            {polishExtra.exercises.map((ex, i) => {
                              const alreadyAdded =
                                addedSuggestedExerciseIndices.has(i);
                              const addingThis =
                                addSuggestedExerciseMutation.isPending &&
                                addSuggestedExerciseMutation.variables
                                  ?.index === i;
                              return (
                                <li
                                  key={i}
                                  className="rounded-lg border border-gray-100 bg-gray-50 p-3 text-xs"
                                >
                                  <p className="font-semibold text-gray-800">
                                    {ex.title}
                                  </p>
                                  <p className="text-gray-600 mt-0.5 whitespace-pre-wrap">
                                    {ex.instructions}
                                  </p>
                                  {ex.language && (
                                    <span className="font-mono text-gray-400 text-[10px]">
                                      {ex.language}
                                    </span>
                                  )}
                                  <button
                                    type="button"
                                    disabled={
                                      alreadyAdded ||
                                      addSuggestedExerciseMutation.isPending ||
                                      appendMisconceptionMutation.isPending
                                    }
                                    className={`mt-2 rounded-md px-2.5 py-1 text-[11px] font-medium disabled:cursor-not-allowed disabled:opacity-100 ${
                                      alreadyAdded
                                        ? "cursor-not-allowed bg-gray-200 text-gray-500"
                                        : "bg-brand-600 text-white hover:bg-brand-700 disabled:opacity-50"
                                    }`}
                                    onClick={() =>
                                      addSuggestedExerciseMutation.mutate({
                                        ex,
                                        index: i,
                                      })
                                    }
                                  >
                                    {alreadyAdded
                                      ? "Added"
                                      : addingThis
                                        ? "Adding…"
                                        : "Add as exercise"}
                                  </button>
                                </li>
                              );
                            })}
                          </ul>
                        </motion.div>
                      )}

                      {polishExtra?.misconceptions && (
                        <motion.div
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0 }}
                          className="space-y-2"
                        >
                          <SectionLabel>Misconceptions</SectionLabel>
                          <ul className="space-y-2">
                            {polishExtra.misconceptions.map((m, i) => {
                              const warningAdded =
                                addedMisconceptionIndices.has(i);
                              const addingThisWarning =
                                appendMisconceptionMutation.isPending &&
                                appendMisconceptionMutation.variables?.index ===
                                  i;
                              return (
                                <li
                                  key={i}
                                  className="rounded-lg border border-amber-100 bg-amber-50/60 p-3 text-xs"
                                >
                                  <p className="font-semibold text-gray-800">
                                    {m.title}
                                  </p>
                                  <p className="text-gray-600 mt-0.5">
                                    {m.explanation}
                                  </p>
                                  <p className="text-amber-700 mt-1 italic">
                                    {m.howToAddress}
                                  </p>
                                  <button
                                    type="button"
                                    disabled={
                                      warningAdded ||
                                      appendMisconceptionMutation.isPending ||
                                      addSuggestedExerciseMutation.isPending
                                    }
                                    className={`mt-2 rounded-md px-2.5 py-1 text-[11px] font-medium disabled:cursor-not-allowed disabled:opacity-100 ${
                                      warningAdded
                                        ? "cursor-not-allowed border border-gray-200 bg-gray-100 text-gray-500"
                                        : "border border-amber-300 bg-white text-amber-900 hover:bg-amber-50 disabled:opacity-50"
                                    }`}
                                    onClick={() =>
                                      appendMisconceptionMutation.mutate({
                                        m,
                                        index: i,
                                      })
                                    }
                                  >
                                    {warningAdded
                                      ? "Added"
                                      : addingThisWarning
                                        ? "Adding…"
                                        : "Add to lesson"}
                                  </button>
                                </li>
                              );
                            })}
                          </ul>
                        </motion.div>
                      )}

                      {insights && (
                        <motion.div
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0 }}
                          className="space-y-2"
                        >
                          <SectionLabel>Q&A insights</SectionLabel>
                          {insights.message && (
                            <p className="text-xs text-gray-500">
                              {insights.message}
                            </p>
                          )}
                          {insights.questionCount != null && (
                            <p className="text-xs text-gray-600 font-medium">
                              {insights.questionCount} question(s) analysed
                            </p>
                          )}
                          <ul className="space-y-2">
                            {(insights.clusters || []).map((c, i) => (
                              <li
                                key={i}
                                className="rounded-lg border border-gray-100 bg-white p-3 text-xs"
                              >
                                <span
                                  className={`text-[10px] uppercase font-semibold px-1.5 py-0.5 rounded ${
                                    c.severity === "high"
                                      ? "bg-red-100 text-red-800"
                                      : c.severity === "low"
                                        ? "bg-gray-100 text-gray-600"
                                        : "bg-amber-100 text-amber-800"
                                  }`}
                                >
                                  {c.severity}
                                </span>
                                <p className="font-semibold text-gray-800 mt-1">
                                  {c.label}
                                </p>
                                <p className="text-gray-500">{c.summary}</p>
                              </li>
                            ))}
                          </ul>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </>
                )}
              </motion.div>
            )}

            {/* ─── Files tab ─── */}
            {rightPanelTab === "files" && (
              <motion.div
                key="files"
                initial={shouldReduce ? false : { opacity: 0, x: 8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={SPRING}
                className="space-y-3"
              >
                {/* Upload button */}
                <label
                  className={`flex items-center justify-center gap-2 w-full py-3 rounded-xl border-2 border-dashed text-[12.5px] font-medium cursor-pointer transition-colors ${
                    uploadingFile
                      ? "border-gray-200 text-gray-400 bg-gray-50 cursor-not-allowed"
                      : "border-brand-200 text-brand-600 bg-brand-50/50 hover:bg-brand-50 hover:border-brand-300"
                  }`}
                >
                  {uploadingFile ? (
                    <>
                      <span className="w-4 h-4 border-2 border-brand-400 border-t-transparent rounded-full animate-spin" />{" "}
                      Uploading…
                    </>
                  ) : (
                    <>
                      <IconPaperclip /> Attach a file
                    </>
                  )}
                  <input
                    type="file"
                    className="hidden"
                    disabled={uploadingFile}
                    onChange={handleFileUpload}
                    accept=".pdf,.doc,.docx,.ppt,.pptx,.png,.jpg,.jpeg,.gif,.webp,.txt,.md,.zip"
                  />
                </label>

                {uploadError && (
                  <p className="text-xs text-red-500 px-1">{uploadError}</p>
                )}

                <p className="text-[11px] text-gray-400 text-center">
                  PDF, Word, images, zip — max 20 MB
                </p>

                {/* Pending files (new lesson, not saved yet) */}
                {!selectedLesson && pendingFiles.length > 0 && (
                  <div>
                    <SectionLabel>Queued (will upload on save)</SectionLabel>
                    <ul className="space-y-1.5">
                      {pendingFiles.map((file, idx) => (
                        <li
                          key={idx}
                          className="flex items-center gap-2.5 px-3 py-2 rounded-lg bg-amber-50 border border-amber-100 text-xs"
                        >
                          <span className="text-base">
                            {fileIcon(file.type)}
                          </span>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-gray-700 truncate">
                              {file.name}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() =>
                              setPendingFiles((prev) =>
                                prev.filter((_, i) => i !== idx),
                              )
                            }
                            className="text-red-400 hover:text-red-600 shrink-0"
                          >
                            <IconTrash />
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Uploaded attachments */}
                {attachments.length > 0 && (
                  <div>
                    <SectionLabel>Attached files</SectionLabel>
                    <ul className="space-y-1.5">
                      {attachments.map((att) => (
                        <li
                          key={att._id}
                          className="flex items-center gap-2.5 px-3 py-2 rounded-lg bg-gray-50 border border-gray-100 text-xs"
                        >
                          <span className="text-base shrink-0">
                            {fileIcon(att.mimetype)}
                          </span>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-gray-700 truncate">
                              {att.filename}
                            </p>
                            <p className="text-gray-400">
                              {formatBytes(att.size)}
                            </p>
                          </div>
                          <a
                            href={`/uploads/${att.storedName}`}
                            download={att.filename}
                            className="text-brand-500 hover:text-brand-700 shrink-0 font-medium"
                          >
                            ↓
                          </a>
                          <button
                            type="button"
                            onClick={() => handleDeleteAttachment(att._id)}
                            className="text-red-400 hover:text-red-600 shrink-0"
                          >
                            <IconTrash />
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {attachments.length === 0 && !pendingFiles.length && (
                  <p className="text-center text-sm text-gray-400 py-4">
                    No files attached yet.
                  </p>
                )}
              </motion.div>
            )}
          </div>
        </aside>
      </div>
    </PageLayout>
  );
}
