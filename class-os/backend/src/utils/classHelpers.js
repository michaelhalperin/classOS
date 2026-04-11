import Lesson from "../models/Lesson.js";
import Classroom from "../models/Classroom.js";

/**
 * Returns all lesson ObjectIds belonging to a given classId.
 */
export async function lessonIdsForClass(classId) {
  const lessons = await Lesson.find({ classId }).select("_id");
  return lessons.map((l) => l._id);
}

/**
 * Checks whether the current user (req.user) is allowed to access a lesson.
 * Teacher must own the lesson's class; student must be enrolled.
 * Returns { ok: true } or { ok: false, status, message }.
 */
export async function assertLessonAccess(req, lesson) {
  if (!lesson?.classId)
    return { ok: false, status: 404, message: "Lesson not found" };
  const cls = await Classroom.findById(lesson.classId);
  if (!cls) return { ok: false, status: 404, message: "Class not found" };
  if (req.user.role === "teacher") {
    if (cls.teacherId.toString() !== req.user._id.toString()) {
      return { ok: false, status: 403, message: "Not allowed" };
    }
    return { ok: true };
  }
  const enrolled = cls.studentIds.some(
    (id) => id.toString() === req.user._id.toString(),
  );
  if (!enrolled) return { ok: false, status: 403, message: "Not allowed" };
  return { ok: true };
}
