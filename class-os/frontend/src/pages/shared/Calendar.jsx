import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useAuth } from "../../context/AuthContext.jsx";
import { useClass } from "../../context/ClassContext.jsx";
import PageLayout from "../../components/layout/PageLayout.jsx";
import {
  getCalendarEvents,
  createCalendarEvent,
  updateCalendarEvent,
  deleteCalendarEvent,
  getCalendarFeedUrl,
} from "../../api/calendar.js";
import {
  WEEKDAY_LABELS_SHORT as DAYS,
  MONTH_NAMES as MONTHS,
  startOfMonth,
  endOfMonth,
  addDays,
  addMonths,
  addWeeks,
  startOfWeek,
  isSameMonth,
  isToday,
  fmtDate,
  fmtDateTime,
  toLocalDatetimeInput,
  buildMonthGrid,
  eventsOnDay,
} from "../../utils/dates.js";
import {
  CALENDAR_EVENT_TYPE_STYLES as TYPE_CONFIG,
  CALENDAR_PRESET_HEX_COLORS as PRESET_COLORS,
} from "../../utils/calendarAppearance.js";
import {
  SPRING_SNAPPY as SPRING,
  SPRING_PAGE as pageSpring,
} from "../../utils/motionSprings.js";

// ─── Sub-components ───────────────────────────────────────────────────────────

function ViewSwitcher({ view, onChange, shouldReduceMotion }) {
  const views = ["month", "week", "agenda"];
  return (
    <div className="flex items-center rounded-lg border border-gray-200 bg-gray-50 p-0.5 w-fit">
      {views.map((v) => (
        <button
          key={v}
          type="button"
          onClick={() => onChange(v)}
          className={`relative px-4 py-1.5 rounded-md text-[13px] font-medium capitalize transition-colors z-10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-600 ${
            view === v ? "text-gray-900" : "text-gray-500 hover:text-gray-700"
          }`}
        >
          {view === v && (
            <motion.span
              layoutId="cal-view-pill"
              className="absolute inset-0 rounded-md bg-white shadow-sm border border-gray-200 z-0"
              transition={shouldReduceMotion ? { duration: 0 } : SPRING}
            />
          )}
          <span className="relative z-10">{v}</span>
        </button>
      ))}
    </div>
  );
}

function EventPill({ event, onClick, compact = false }) {
  const cfg = TYPE_CONFIG[event.type] || TYPE_CONFIG.custom;
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onClick(event);
      }}
      title={event.title}
      className={`w-full text-left truncate rounded px-1.5 py-0.5 text-[11px] font-medium ${cfg.light} ${cfg.text} border ${cfg.border} hover:brightness-95 transition-all focus-visible:outline focus-visible:outline-1 focus-visible:outline-brand-600`}
    >
      {!compact && (
        <span
          className={`inline-block w-1.5 h-1.5 rounded-full ${cfg.color} mr-1 align-middle`}
        />
      )}
      {event.title}
    </button>
  );
}

// ─── Month View ───────────────────────────────────────────────────────────────
function MonthView({
  currentDate,
  events,
  onDayClick,
  onEventClick,
  isTeacher,
}) {
  const grid = buildMonthGrid(currentDate);
  return (
    <div className="rounded-xl border border-gray-200 overflow-hidden bg-white">
      {/* Day headers */}
      <div className="grid grid-cols-7 bg-gray-50 border-b border-gray-200">
        {DAYS.map((d) => (
          <div
            key={d}
            className="py-2 text-center text-[11px] font-semibold text-gray-500 uppercase tracking-wide"
          >
            {d}
          </div>
        ))}
      </div>
      {/* Grid */}
      <div className="grid grid-cols-7 divide-x divide-gray-100">
        {grid.map((day, i) => {
          const dayEvents = eventsOnDay(events, day);
          const inMonth = isSameMonth(day, currentDate);
          const today = isToday(day);
          return (
            <div
              key={i}
              onClick={() => isTeacher && onDayClick(day)}
              className={`min-h-[100px] p-1.5 border-b border-gray-100 ${
                !inMonth ? "bg-gray-50/50" : "bg-white"
              } ${isTeacher ? "cursor-pointer hover:bg-brand-50/30" : ""} transition-colors`}
            >
              <div
                className={`mb-1 flex h-6 w-6 items-center justify-center rounded-full text-[12px] font-medium ${
                  today
                    ? "bg-brand-600 text-white"
                    : inMonth
                      ? "text-gray-700"
                      : "text-gray-300"
                }`}
              >
                {day.getDate()}
              </div>
              <div className="space-y-0.5">
                {dayEvents.slice(0, 3).map((ev) => (
                  <EventPill
                    key={ev._id}
                    event={ev}
                    onClick={onEventClick}
                    compact
                  />
                ))}
                {dayEvents.length > 3 && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onEventClick(dayEvents[3]);
                    }}
                    className="text-[10px] text-gray-400 hover:text-gray-600 px-1"
                  >
                    +{dayEvents.length - 3} more
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Week View ────────────────────────────────────────────────────────────────
function WeekView({
  currentDate,
  events,
  onDayClick,
  onEventClick,
  isTeacher,
}) {
  const weekStart = startOfWeek(currentDate);
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  return (
    <div className="rounded-xl border border-gray-200 overflow-hidden bg-white">
      <div className="grid grid-cols-7 divide-x divide-gray-100">
        {days.map((day, i) => {
          const dayEvents = eventsOnDay(events, day);
          const today = isToday(day);
          return (
            <div
              key={i}
              onClick={() => isTeacher && onDayClick(day)}
              className={`${isTeacher ? "cursor-pointer hover:bg-brand-50/30" : ""} transition-colors`}
            >
              {/* Day header */}
              <div
                className={`py-3 text-center border-b border-gray-100 ${today ? "bg-brand-50" : "bg-gray-50"}`}
              >
                <div className="text-[11px] font-medium text-gray-400 uppercase">
                  {DAYS[day.getDay()]}
                </div>
                <div
                  className={`mx-auto mt-0.5 flex h-7 w-7 items-center justify-center rounded-full text-[14px] font-semibold ${
                    today ? "bg-brand-600 text-white" : "text-gray-800"
                  }`}
                >
                  {day.getDate()}
                </div>
              </div>
              {/* Events */}
              <div className="min-h-[200px] p-1.5 space-y-1">
                {dayEvents.length === 0 && (
                  <div className="text-[11px] text-gray-300 text-center pt-4">
                    —
                  </div>
                )}
                {dayEvents.map((ev) => (
                  <EventPill key={ev._id} event={ev} onClick={onEventClick} />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Agenda View ──────────────────────────────────────────────────────────────
function AgendaView({ events, onEventClick }) {
  const sorted = [...events].sort(
    (a, b) => new Date(a.startDate) - new Date(b.startDate),
  );

  if (sorted.length === 0) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white py-16 text-center text-gray-400">
        No upcoming events.
      </div>
    );
  }

  // Group by date label
  const groups = [];
  let lastLabel = null;
  for (const ev of sorted) {
    const d = new Date(ev.startDate);
    const lbl = fmtDate(d);
    if (lbl !== lastLabel) {
      groups.push({ label: lbl, day: d, events: [] });
      lastLabel = lbl;
    }
    groups[groups.length - 1].events.push(ev);
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white divide-y divide-gray-100 overflow-hidden">
      {groups.map((g) => (
        <div key={g.label} className="flex">
          {/* Date column */}
          <div
            className={`w-32 shrink-0 py-4 px-4 ${isToday(g.day) ? "bg-brand-50" : "bg-gray-50"} border-r border-gray-100`}
          >
            <div
              className={`text-[11px] font-semibold uppercase tracking-wide ${isToday(g.day) ? "text-brand-600" : "text-gray-400"}`}
            >
              {DAYS[g.day.getDay()]}
            </div>
            <div
              className={`text-[22px] font-bold leading-tight ${isToday(g.day) ? "text-brand-700" : "text-gray-800"}`}
            >
              {g.day.getDate()}
            </div>
            <div className="text-[11px] text-gray-400">
              {MONTHS[g.day.getMonth()].slice(0, 3)} {g.day.getFullYear()}
            </div>
          </div>
          {/* Events column */}
          <div className="flex-1 py-3 px-4 space-y-2">
            {g.events.map((ev) => {
              const cfg = TYPE_CONFIG[ev.type] || TYPE_CONFIG.custom;
              return (
                <button
                  key={ev._id}
                  type="button"
                  onClick={() => onEventClick(ev)}
                  className={`w-full text-left rounded-lg border ${cfg.border} ${cfg.light} px-3 py-2 hover:brightness-95 transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-600`}
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-block w-2 h-2 rounded-full ${cfg.color} shrink-0`}
                    />
                    <span className={`text-[13px] font-semibold ${cfg.text}`}>
                      {ev.title}
                    </span>
                    <span
                      className={`ml-auto text-[11px] font-medium px-1.5 py-0.5 rounded ${cfg.light} ${cfg.text} border ${cfg.border}`}
                    >
                      {cfg.label}
                    </span>
                  </div>
                  {ev.description && (
                    <p className="mt-0.5 ml-4 text-[12px] text-gray-500 line-clamp-1">
                      {ev.description}
                    </p>
                  )}
                  {!ev.allDay && ev.startDate && (
                    <p className="mt-0.5 ml-4 text-[11px] text-gray-400">
                      {fmtDateTime(new Date(ev.startDate))}
                    </p>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Event Detail Modal ───────────────────────────────────────────────────────
function EventModal({
  event,
  classId,
  isTeacher,
  onClose,
  onUpdated,
  onDeleted,
}) {
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setCDel] = useState(false);
  const shouldReduceMotion = useReducedMotion();
  const qc = useQueryClient();
  const cfg = TYPE_CONFIG[event.type] || TYPE_CONFIG.custom;

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    defaultValues: {
      title: event.title,
      description: event.description || "",
      startDate: toLocalDatetimeInput(event.startDate),
      endDate: toLocalDatetimeInput(event.endDate),
      allDay: event.allDay !== false,
      color: event.color || "#7c3aed",
    },
  });

  const updateMut = useMutation({
    mutationFn: (data) => updateCalendarEvent(classId, event._id, data),
    onSuccess: () => {
      qc.invalidateQueries(["calendar", classId]);
      onUpdated();
      onClose();
    },
  });

  const deleteMut = useMutation({
    mutationFn: () => deleteCalendarEvent(classId, event._id),
    onSuccess: () => {
      qc.invalidateQueries(["calendar", classId]);
      onDeleted();
      onClose();
    },
  });

  const onSubmit = (data) => {
    updateMut.mutate({
      title: data.title,
      description: data.description,
      startDate: data.startDate,
      endDate: data.endDate || null,
      allDay: data.allDay,
      color: data.color,
    });
  };

  const canEdit = isTeacher && event.type === "custom";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" />
      <motion.div
        initial={shouldReduceMotion ? {} : { opacity: 0, scale: 0.96, y: 8 }}
        animate={shouldReduceMotion ? {} : { opacity: 1, scale: 1, y: 0 }}
        exit={shouldReduceMotion ? {} : { opacity: 0, scale: 0.96, y: 8 }}
        transition={SPRING}
        onClick={(e) => e.stopPropagation()}
        className="relative z-10 w-full max-w-md rounded-2xl bg-white border border-gray-200 shadow-xl overflow-hidden"
      >
        {/* Header */}
        <div
          className={`px-5 py-4 border-b border-gray-100 flex items-center gap-3`}
        >
          <span
            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${cfg.light} ${cfg.text} border ${cfg.border}`}
          >
            {cfg.label}
          </span>
          <button
            type="button"
            onClick={onClose}
            className="ml-auto text-gray-400 hover:text-gray-600 transition-colors rounded-lg p-1 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-600"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path
                d="M3 3l10 10M13 3L3 13"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>

        <div className="px-5 py-4">
          {editing ? (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <label className="block text-[12px] font-medium text-gray-700 mb-1">
                  Title
                </label>
                <input
                  {...register("title", { required: "Title is required" })}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-[13px] focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
                {errors.title && (
                  <p className="mt-1 text-[11px] text-red-500">
                    {errors.title.message}
                  </p>
                )}
              </div>
              <div>
                <label className="block text-[12px] font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  {...register("description")}
                  rows={3}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-[13px] resize-none focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[12px] font-medium text-gray-700 mb-1">
                    Start
                  </label>
                  <input
                    type="datetime-local"
                    {...register("startDate", { required: "Required" })}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-[12px] focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
                <div>
                  <label className="block text-[12px] font-medium text-gray-700 mb-1">
                    End (optional)
                  </label>
                  <input
                    type="datetime-local"
                    {...register("endDate")}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-[12px] focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="edit-allday"
                  {...register("allDay")}
                  className="accent-brand-600"
                />
                <label
                  htmlFor="edit-allday"
                  className="text-[13px] text-gray-700"
                >
                  All-day event
                </label>
              </div>
              <div>
                <label className="block text-[12px] font-medium text-gray-700 mb-1.5">
                  Color
                </label>
                <div className="flex gap-2">
                  {PRESET_COLORS.map((c) => (
                    <label key={c} className="cursor-pointer">
                      <input
                        type="radio"
                        value={c}
                        {...register("color")}
                        className="sr-only"
                      />
                      <span
                        className="block w-6 h-6 rounded-full border-2 border-white shadow ring-2 ring-transparent transition-all"
                        style={{ backgroundColor: c }}
                      />
                    </label>
                  ))}
                </div>
              </div>
              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setEditing(false)}
                  className="flex-1 rounded-lg border border-gray-200 py-2 text-[13px] font-medium text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || updateMut.isPending}
                  className="flex-1 rounded-lg bg-brand-600 py-2 text-[13px] font-semibold text-white hover:bg-brand-700 disabled:opacity-50 transition-colors"
                >
                  {updateMut.isPending ? "Saving…" : "Save changes"}
                </button>
              </div>
              {updateMut.isError && (
                <p className="text-[11px] text-red-500">
                  {updateMut.error?.response?.data?.message ||
                    "Failed to update"}
                </p>
              )}
            </form>
          ) : (
            <div className="space-y-3">
              <h2 className="text-[17px] font-bold text-gray-900 leading-snug">
                {event.title}
              </h2>
              {event.description && (
                <p className="text-[13px] text-gray-600">{event.description}</p>
              )}
              <div className="text-[12px] text-gray-400 space-y-1">
                <div>
                  {event.allDay
                    ? fmtDate(new Date(event.startDate))
                    : fmtDateTime(new Date(event.startDate))}
                  {event.endDate &&
                    ` → ${event.allDay ? fmtDate(new Date(event.endDate)) : fmtDateTime(new Date(event.endDate))}`}
                </div>
              </div>
              {canEdit && (
                <div className="pt-2 flex gap-2">
                  <button
                    type="button"
                    onClick={() => setEditing(true)}
                    className="flex-1 rounded-lg border border-gray-200 py-2 text-[13px] font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    Edit
                  </button>
                  {!confirmDelete ? (
                    <button
                      type="button"
                      onClick={() => setCDel(true)}
                      className="flex-1 rounded-lg border border-red-200 py-2 text-[13px] font-medium text-red-600 hover:bg-red-50 transition-colors"
                    >
                      Delete
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={deleteMut.isPending}
                      onClick={() => deleteMut.mutate()}
                      className="flex-1 rounded-lg bg-red-600 py-2 text-[13px] font-semibold text-white hover:bg-red-700 disabled:opacity-50 transition-colors"
                    >
                      {deleteMut.isPending ? "Deleting…" : "Confirm delete"}
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}

// ─── Create Event Modal ───────────────────────────────────────────────────────
function CreateEventModal({ classId, prefillDate, onClose, onCreated }) {
  const shouldReduceMotion = useReducedMotion();
  const qc = useQueryClient();

  const defaultStart = prefillDate
    ? `${prefillDate.getFullYear()}-${String(prefillDate.getMonth() + 1).padStart(2, "0")}-${String(prefillDate.getDate()).padStart(2, "0")}T09:00`
    : toLocalDatetimeInput(new Date());

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm({
    defaultValues: {
      title: "",
      description: "",
      startDate: defaultStart,
      endDate: "",
      allDay: true,
      color: "#7c3aed",
    },
  });
  const selectedColor = watch("color");

  const createMut = useMutation({
    mutationFn: (data) => createCalendarEvent(classId, data),
    onSuccess: () => {
      qc.invalidateQueries(["calendar", classId]);
      onCreated();
      onClose();
    },
  });

  const onSubmit = (data) => {
    createMut.mutate({
      title: data.title,
      description: data.description,
      startDate: data.startDate,
      endDate: data.endDate || null,
      allDay: data.allDay,
      color: data.color,
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" />
      <motion.div
        initial={shouldReduceMotion ? {} : { opacity: 0, scale: 0.96, y: 8 }}
        animate={shouldReduceMotion ? {} : { opacity: 1, scale: 1, y: 0 }}
        exit={shouldReduceMotion ? {} : { opacity: 0, scale: 0.96, y: 8 }}
        transition={SPRING}
        onClick={(e) => e.stopPropagation()}
        className="relative z-10 w-full max-w-md rounded-2xl bg-white border border-gray-200 shadow-xl overflow-hidden"
      >
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-[15px] font-bold text-gray-900">New Event</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 rounded-lg p-1 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-600"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path
                d="M3 3l10 10M13 3L3 13"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="px-5 py-4 space-y-4">
          <div>
            <label className="block text-[12px] font-medium text-gray-700 mb-1">
              Title <span className="text-red-400">*</span>
            </label>
            <input
              {...register("title", { required: "Title is required" })}
              placeholder="e.g. Office hours, Exam day…"
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-[13px] focus:outline-none focus:ring-2 focus:ring-brand-500"
              autoFocus
            />
            {errors.title && (
              <p className="mt-1 text-[11px] text-red-500">
                {errors.title.message}
              </p>
            )}
          </div>
          <div>
            <label className="block text-[12px] font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              {...register("description")}
              rows={2}
              placeholder="Optional details…"
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-[13px] resize-none focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[12px] font-medium text-gray-700 mb-1">
                Start <span className="text-red-400">*</span>
              </label>
              <input
                type="datetime-local"
                {...register("startDate", { required: "Required" })}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-[12px] focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
            <div>
              <label className="block text-[12px] font-medium text-gray-700 mb-1">
                End
              </label>
              <input
                type="datetime-local"
                {...register("endDate")}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-[12px] focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="create-allday"
              {...register("allDay")}
              className="accent-brand-600"
            />
            <label
              htmlFor="create-allday"
              className="text-[13px] text-gray-700"
            >
              All-day event
            </label>
          </div>
          <div>
            <label className="block text-[12px] font-medium text-gray-700 mb-1.5">
              Color
            </label>
            <div className="flex gap-2">
              {PRESET_COLORS.map((c) => (
                <label key={c} className="cursor-pointer">
                  <input
                    type="radio"
                    value={c}
                    {...register("color")}
                    className="sr-only"
                  />
                  <span
                    className="block w-6 h-6 rounded-full border-2 transition-all"
                    style={{
                      backgroundColor: c,
                      borderColor: selectedColor === c ? "#1e40af" : "white",
                      boxShadow:
                        selectedColor === c ? "0 0 0 2px " + c : undefined,
                    }}
                  />
                </label>
              ))}
            </div>
          </div>
          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-lg border border-gray-200 py-2 text-[13px] font-medium text-gray-600 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || createMut.isPending}
              className="flex-1 rounded-lg bg-brand-600 py-2 text-[13px] font-semibold text-white hover:bg-brand-700 disabled:opacity-50 transition-colors"
            >
              {createMut.isPending ? "Creating…" : "Create event"}
            </button>
          </div>
          {createMut.isError && (
            <p className="text-[11px] text-red-500">
              {createMut.error?.response?.data?.message ||
                "Failed to create event"}
            </p>
          )}
        </form>
      </motion.div>
    </div>
  );
}

// ─── Subscribe Panel ──────────────────────────────────────────────────────────
function SubscribePanel({ classId }) {
  const [copied, setCopied] = useState(false);
  const url = getCalendarFeedUrl(classId);

  const copy = useCallback(() => {
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [url]);

  return (
    <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 shrink-0 rounded-lg bg-white border border-gray-200 p-2">
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            aria-hidden="true"
          >
            <rect
              x="2"
              y="3"
              width="12"
              height="12"
              rx="1.5"
              stroke="#6b7280"
              strokeWidth="1.4"
            />
            <path
              d="M5 1v3M11 1v3M2 7h12"
              stroke="#6b7280"
              strokeWidth="1.4"
              strokeLinecap="round"
            />
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-semibold text-gray-800">
            Subscribe in Google or Apple Calendar
          </p>
          <p className="text-[12px] text-gray-500 mt-0.5">
            Copy this link and paste it into your calendar app. It will
            auto-refresh with new events.
          </p>
          <div className="mt-2 flex items-center gap-2">
            <code className="flex-1 min-w-0 truncate rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-[11px] font-mono text-gray-600 select-all">
              {url}
            </code>
            <button
              type="button"
              onClick={copy}
              className={`shrink-0 rounded-lg border px-3 py-1.5 text-[12px] font-medium transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-600 ${
                copied
                  ? "border-green-200 bg-green-50 text-green-700"
                  : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
              }`}
            >
              {copied ? "✓ Copied" : "Copy"}
            </button>
          </div>
          <p className="mt-1.5 text-[11px] text-gray-400">
            In Google Calendar: Other calendars → + → From URL. In Apple
            Calendar: File → New Calendar Subscription.
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── Main Calendar Page ───────────────────────────────────────────────────────
export default function Calendar() {
  const { user } = useAuth();
  const { activeClassId } = useClass();
  const shouldReduceMotion = useReducedMotion();
  const [view, setView] = useState("month");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedEvent, setEvent] = useState(null);
  const [createDate, setCreateDate] = useState(null); // null = no modal, Date = prefill

  const isTeacher = user?.role === "teacher";

  const { data: rawEvents, isLoading } = useQuery({
    queryKey: ["calendar", activeClassId],
    queryFn: () => getCalendarEvents(activeClassId),
    enabled: Boolean(activeClassId),
  });
  const events = Array.isArray(rawEvents) ? rawEvents : [];

  // Navigation
  const prev = () => {
    if (view === "month") setCurrentDate((d) => addMonths(d, -1));
    if (view === "week") setCurrentDate((d) => addWeeks(d, -1));
    if (view === "agenda") setCurrentDate((d) => addMonths(d, -1));
  };
  const next = () => {
    if (view === "month") setCurrentDate((d) => addMonths(d, 1));
    if (view === "week") setCurrentDate((d) => addWeeks(d, 1));
    if (view === "agenda") setCurrentDate((d) => addMonths(d, 1));
  };
  const goToday = () => setCurrentDate(new Date());

  const navLabel = (() => {
    if (view === "week") {
      const ws = startOfWeek(currentDate);
      const we = addDays(ws, 6);
      if (ws.getMonth() === we.getMonth())
        return `${MONTHS[ws.getMonth()]} ${ws.getDate()}–${we.getDate()}, ${ws.getFullYear()}`;
      return `${MONTHS[ws.getMonth()].slice(0, 3)} ${ws.getDate()} – ${MONTHS[we.getMonth()].slice(0, 3)} ${we.getDate()}, ${we.getFullYear()}`;
    }
    return `${MONTHS[currentDate.getMonth()]} ${currentDate.getFullYear()}`;
  })();

  if (!activeClassId) {
    return (
      <div className="flex-1 flex items-center justify-center p-8 text-gray-400 text-[14px]">
        Select a class to view its calendar.
      </div>
    );
  }

  return (
    <PageLayout fullWidth>
      <motion.div
        className="px-6 py-6 space-y-5"
        initial={shouldReduceMotion ? false : { opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={pageSpring}
      >
        {/* ── Page header ── */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-[22px] font-bold text-gray-900 leading-tight">
              Calendar
            </h1>
            <p className="text-[13px] text-gray-500 mt-0.5">
              {isTeacher
                ? "Manage class events and due dates."
                : "View upcoming lessons, assignments, and events."}
            </p>
          </div>
          {isTeacher && (
            <button
              type="button"
              onClick={() => setCreateDate(currentDate)}
              className="flex items-center gap-1.5 rounded-lg bg-brand-600 px-4 py-2 text-[13px] font-semibold text-white hover:bg-brand-700 transition-colors shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-600"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 14 14"
                fill="none"
                aria-hidden="true"
              >
                <path
                  d="M7 1v12M1 7h12"
                  stroke="white"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                />
              </svg>
              New event
            </button>
          )}
        </div>

        {/* ── Controls bar ── */}
        <div className="flex items-center gap-3 flex-wrap">
          <ViewSwitcher
            view={view}
            onChange={setView}
            shouldReduceMotion={shouldReduceMotion}
          />
          <div className="flex items-center gap-1.5 ml-auto">
            <button
              type="button"
              onClick={goToday}
              className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-[12px] font-medium text-gray-600 hover:bg-gray-50 transition-colors"
            >
              Today
            </button>
            <button
              type="button"
              onClick={prev}
              className="rounded-lg border border-gray-200 bg-white p-1.5 text-gray-500 hover:bg-gray-50 transition-colors"
              aria-label="Previous"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path
                  d="M10 3L6 8l4 5"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
            <span className="min-w-[160px] text-center text-[14px] font-semibold text-gray-800">
              {navLabel}
            </span>
            <button
              type="button"
              onClick={next}
              className="rounded-lg border border-gray-200 bg-white p-1.5 text-gray-500 hover:bg-gray-50 transition-colors"
              aria-label="Next"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path
                  d="M6 3l4 5-4 5"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          </div>
        </div>

        {/* ── Legend ── */}
        <div className="flex items-center gap-4 flex-wrap">
          {Object.entries(TYPE_CONFIG).map(([type, cfg]) => (
            <div key={type} className="flex items-center gap-1.5">
              <span className={`w-2.5 h-2.5 rounded-full ${cfg.color}`} />
              <span className="text-[12px] text-gray-500">{cfg.label}</span>
            </div>
          ))}
        </div>

        {/* ── Calendar view ── */}
        {isLoading ? (
          <div className="rounded-xl border border-gray-200 bg-white py-16 text-center text-gray-400 text-[14px]">
            Loading events…
          </div>
        ) : (
          <AnimatePresence mode="wait">
            <motion.div
              key={view}
              initial={shouldReduceMotion ? false : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={
                shouldReduceMotion
                  ? {}
                  : { opacity: 0, y: -8, transition: { duration: 0.2 } }
              }
              transition={pageSpring}
            >
              {view === "month" && (
                <MonthView
                  currentDate={currentDate}
                  events={events}
                  onDayClick={(day) => setCreateDate(day)}
                  onEventClick={setEvent}
                  isTeacher={isTeacher}
                />
              )}
              {view === "week" && (
                <WeekView
                  currentDate={currentDate}
                  events={events}
                  onDayClick={(day) => setCreateDate(day)}
                  onEventClick={setEvent}
                  isTeacher={isTeacher}
                />
              )}
              {view === "agenda" && (
                <AgendaView events={events} onEventClick={setEvent} />
              )}
            </motion.div>
          </AnimatePresence>
        )}

        {/* ── Subscribe panel ── */}
        <SubscribePanel classId={activeClassId} />
      </motion.div>

      {/* ── Modals ── */}
      <AnimatePresence>
        {selectedEvent && (
          <EventModal
            key="event-modal"
            event={selectedEvent}
            classId={activeClassId}
            isTeacher={isTeacher}
            onClose={() => setEvent(null)}
            onUpdated={() => {}}
            onDeleted={() => {}}
          />
        )}
        {createDate !== null && isTeacher && (
          <CreateEventModal
            key="create-modal"
            classId={activeClassId}
            prefillDate={createDate}
            onClose={() => setCreateDate(null)}
            onCreated={() => {}}
          />
        )}
      </AnimatePresence>
    </PageLayout>
  );
}
