import { useMatch } from "react-router-dom";

export const TEACHER_CLASSES_ROUTE = "/teacher/classes";
export const TEACHER_SETTINGS_ROUTE = "/teacher/settings";
export const STUDENT_CLASSES_ROUTE = "/student/classes";
export const STUDENT_SETTINGS_ROUTE = "/student/settings";

/** @param {string} classId @param {string} [subPath] e.g. "dashboard" or "lessons/abc" */
export function teacherClassPath(classId, subPath = "") {
  const base = `/teacher/${classId}`;
  if (!subPath) return base;
  const s = subPath.startsWith("/") ? subPath.slice(1) : subPath;
  return `${base}/${s}`;
}

/** @param {string} classId @param {string} [subPath] */
export function studentClassPath(classId, subPath = "") {
  const base = `/student/${classId}`;
  if (!subPath) return base;
  const s = subPath.startsWith("/") ? subPath.slice(1) : subPath;
  return `${base}/${s}`;
}

const TEACHER_NON_CLASS_SEGMENTS = new Set(["classes", "settings"]);
const STUDENT_NON_CLASS_SEGMENTS = new Set(["classes", "settings"]);

export function useTeacherScopedClassId() {
  const m = useMatch("/teacher/:classId/*");
  const id = m?.params?.classId;
  if (!id || TEACHER_NON_CLASS_SEGMENTS.has(id)) return null;
  return id;
}

export function useStudentScopedClassId() {
  const m = useMatch("/student/:classId/*");
  const id = m?.params?.classId;
  if (!id || STUDENT_NON_CLASS_SEGMENTS.has(id)) return null;
  return id;
}
