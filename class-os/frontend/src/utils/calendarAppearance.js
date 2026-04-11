/** Tailwind class bundles for calendar event types (month/week/agenda UI). */
export const CALENDAR_EVENT_TYPE_STYLES = {
  lesson: {
    label: "Lesson",
    color: "bg-blue-500",
    border: "border-blue-300",
    text: "text-blue-700",
    light: "bg-blue-50",
  },
  assignment: {
    label: "Assignment",
    color: "bg-amber-500",
    border: "border-amber-300",
    text: "text-amber-700",
    light: "bg-amber-50",
  },
  custom: {
    label: "Event",
    color: "bg-violet-500",
    border: "border-violet-300",
    text: "text-violet-700",
    light: "bg-violet-50",
  },
};

/** Default swatches for custom event color picker (hex). */
export const CALENDAR_PRESET_HEX_COLORS = [
  "#7c3aed",
  "#2563eb",
  "#16a34a",
  "#dc2626",
  "#f59e0b",
  "#0891b2",
  "#db2777",
];
