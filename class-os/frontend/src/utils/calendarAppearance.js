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

/** @returns {{ r: number; g: number; b: number } | null} */
export function hexToRgb(hex) {
  if (!hex || typeof hex !== "string") return null;
  let h = hex.trim().replace(/^#/, "");
  if (h.length === 3) {
    h = h
      .split("")
      .map((c) => c + c)
      .join("");
  }
  if (!/^[0-9a-fA-F]{6}$/.test(h)) return null;
  const n = parseInt(h, 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

/**
 * Inline styles for chips/pills so user-picked hex colors show on the calendar.
 * Returns null if hex is invalid (caller should fall back to type-based Tailwind).
 */
export function customEventColorStyles(hex) {
  const rgb = hexToRgb(hex);
  if (!rgb) return null;
  const { r, g, b } = rgb;
  return {
    chip: {
      backgroundColor: `rgba(${r}, ${g}, ${b}, 0.12)`,
      borderColor: `rgba(${r}, ${g}, ${b}, 0.42)`,
      color: "#1f2937",
    },
    dot: { backgroundColor: `rgb(${r}, ${g}, ${b})` },
  };
}
