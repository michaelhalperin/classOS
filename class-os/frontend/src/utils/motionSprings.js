/** Shared Motion spring presets used across layout and calendar. */
export const SPRING_SNAPPY = { type: "spring", stiffness: 380, damping: 30 };

/** Softer spring for page-level enter transitions (matches PageLayout-style motion). */
export const SPRING_PAGE = { type: "spring", stiffness: 100, damping: 20 };

/** Lesson editor: panels and layout morphs. */
export const SPRING_LESSON = { type: "spring", stiffness: 300, damping: 28 };

/** Lesson editor: tabs, pills, and quick UI feedback. */
export const SPRING_LESSON_SNAPPY = {
  type: "spring",
  stiffness: 400,
  damping: 30,
};
