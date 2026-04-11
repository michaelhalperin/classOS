import express from "express";
import mongoose from "mongoose";
import Lesson from "../models/Lesson.js";
import Classroom from "../models/Classroom.js";
import LessonNote from "../models/LessonNote.js";
import { requireAuth } from "../middleware/auth.js";

const router = express.Router();

const MAX_CONTENT = 100_000;
const MAX_TITLE = 200;

async function assertStudentLessonAccess(studentId, lessonId) {
  const lesson = await Lesson.findById(lessonId);
  if (!lesson) return { status: 404, message: "Lesson not found" };
  const cls = await Classroom.findById(lesson.classId);
  if (!cls) return { status: 404, message: "Class not found" };
  const enrolled = cls.studentIds.some(
    (id) => id.toString() === studentId.toString(),
  );
  if (!enrolled) return { status: 403, message: "Not allowed" };
  return { ok: true };
}

function serializeNote(doc) {
  const o = doc.toObject ? doc.toObject() : doc;
  return {
    _id: o._id?.toString?.() ?? String(o._id),
    title: o.title ?? "",
    content: o.content ?? "",
    createdAt: o.createdAt,
    updatedAt: o.updatedAt,
  };
}

// GET /lesson-notes/:lessonId — all notes for this lesson (student)
router.get("/:lessonId", requireAuth, async (req, res) => {
  try {
    if (req.user.role !== "student") {
      return res.status(403).json({ message: "Students only" });
    }
    const { lessonId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(lessonId)) {
      return res.status(400).json({ message: "Invalid lesson id" });
    }
    const gate = await assertStudentLessonAccess(req.user._id, lessonId);
    if (!gate.ok)
      return res.status(gate.status).json({ message: gate.message });

    const docs = await LessonNote.find({ userId: req.user._id, lessonId })
      .sort({ createdAt: 1 })
      .lean();
    res.json({ notes: docs.map(serializeNote) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /lesson-notes/:lessonId — add a note
router.post("/:lessonId", requireAuth, async (req, res) => {
  try {
    if (req.user.role !== "student") {
      return res.status(403).json({ message: "Students only" });
    }
    const { lessonId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(lessonId)) {
      return res.status(400).json({ message: "Invalid lesson id" });
    }
    const gate = await assertStudentLessonAccess(req.user._id, lessonId);
    if (!gate.ok)
      return res.status(gate.status).json({ message: gate.message });

    let title = req.body?.title;
    let content = req.body?.content;
    if (title == null) title = "";
    if (content == null) content = "";
    if (typeof title !== "string" || typeof content !== "string") {
      return res
        .status(400)
        .json({ message: "title and content must be strings" });
    }
    title = title.slice(0, MAX_TITLE);
    if (content.length > MAX_CONTENT) {
      return res
        .status(400)
        .json({ message: `Notes must be at most ${MAX_CONTENT} characters` });
    }

    const doc = await LessonNote.create({
      userId: req.user._id,
      lessonId,
      title,
      content,
    });
    res.status(201).json({ note: serializeNote(doc) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PUT /lesson-notes/:lessonId/:noteId — update title and/or HTML body
router.put("/:lessonId/:noteId", requireAuth, async (req, res) => {
  try {
    if (req.user.role !== "student") {
      return res.status(403).json({ message: "Students only" });
    }
    const { lessonId, noteId } = req.params;
    if (
      !mongoose.Types.ObjectId.isValid(lessonId) ||
      !mongoose.Types.ObjectId.isValid(noteId)
    ) {
      return res.status(400).json({ message: "Invalid id" });
    }
    const gate = await assertStudentLessonAccess(req.user._id, lessonId);
    if (!gate.ok)
      return res.status(gate.status).json({ message: gate.message });

    const doc = await LessonNote.findOne({
      _id: noteId,
      userId: req.user._id,
      lessonId,
    });
    if (!doc) return res.status(404).json({ message: "Note not found" });

    const { title, content } = req.body;
    if (title !== undefined) {
      if (typeof title !== "string")
        return res.status(400).json({ message: "title must be a string" });
      doc.title = title.slice(0, MAX_TITLE);
    }
    if (content !== undefined) {
      if (typeof content !== "string")
        return res.status(400).json({ message: "content must be a string" });
      if (content.length > MAX_CONTENT) {
        return res
          .status(400)
          .json({ message: `Notes must be at most ${MAX_CONTENT} characters` });
      }
      doc.content = content;
    }

    await doc.save();
    res.json({ note: serializeNote(doc) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE /lesson-notes/:lessonId/:noteId
router.delete("/:lessonId/:noteId", requireAuth, async (req, res) => {
  try {
    if (req.user.role !== "student") {
      return res.status(403).json({ message: "Students only" });
    }
    const { lessonId, noteId } = req.params;
    if (
      !mongoose.Types.ObjectId.isValid(lessonId) ||
      !mongoose.Types.ObjectId.isValid(noteId)
    ) {
      return res.status(400).json({ message: "Invalid id" });
    }
    const gate = await assertStudentLessonAccess(req.user._id, lessonId);
    if (!gate.ok)
      return res.status(gate.status).json({ message: gate.message });

    const result = await LessonNote.deleteOne({
      _id: noteId,
      userId: req.user._id,
      lessonId,
    });
    if (result.deletedCount === 0)
      return res.status(404).json({ message: "Note not found" });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;
