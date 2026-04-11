import express from "express";
import mongoose from "mongoose";
import Exercise from "../models/Exercise.js";
import Lesson from "../models/Lesson.js";
import Classroom from "../models/Classroom.js";
import { requireAuth, requireTeacher } from "../middleware/auth.js";

const router = express.Router();

async function lessonIdsForClass(classId) {
  const lessons = await Lesson.find({ classId }).select("_id");
  return lessons.map((l) => l._id);
}

async function lessonIdsForStudentEnrollments(userId) {
  const rooms = await Classroom.find({ studentIds: userId }).select("_id");
  const classIds = rooms.map((c) => c._id);
  if (classIds.length === 0) return [];
  const lessons = await Lesson.find({ classId: { $in: classIds } }).select(
    "_id",
  );
  return lessons.map((l) => l._id);
}

// GET /exercises — teacher: ?classId=; student: enrolled classes; optional ?lessonId=
router.get("/", requireAuth, async (req, res) => {
  try {
    if (req.user.role === "teacher") {
      const { classId, lessonId } = req.query;
      if (lessonId) {
        const lesson = await Lesson.findById(lessonId);
        if (!lesson)
          return res.status(404).json({ message: "Lesson not found" });
        const cls = await Classroom.findOne({
          _id: lesson.classId,
          teacherId: req.user._id,
        });
        if (!cls) return res.status(403).json({ message: "Not allowed" });
        const exercises = await Exercise.find({ lessonId })
          .populate("lessonId", "title")
          .sort({ createdAt: 1 });
        return res.json(exercises);
      }
      if (!classId || !mongoose.Types.ObjectId.isValid(classId)) {
        return res
          .status(400)
          .json({
            message: "classId query parameter is required (or use lessonId)",
          });
      }
      const cls = await Classroom.findOne({
        _id: classId,
        teacherId: req.user._id,
      });
      if (!cls)
        return res
          .status(403)
          .json({ message: "Class not found or access denied" });
      const lessonIds = await lessonIdsForClass(classId);
      if (lessonIds.length === 0) return res.json([]);
      const exercises = await Exercise.find({ lessonId: { $in: lessonIds } })
        .populate("lessonId", "title")
        .sort({ createdAt: 1 });
      return res.json(exercises);
    }

    const { lessonId } = req.query;
    if (lessonId) {
      const lesson = await Lesson.findById(lessonId);
      if (!lesson) return res.status(404).json({ message: "Lesson not found" });
      const cls = await Classroom.findById(lesson.classId);
      if (!cls) return res.status(404).json({ message: "Class not found" });
      const enrolled = cls.studentIds.some(
        (id) => id.toString() === req.user._id.toString(),
      );
      if (!enrolled) return res.status(403).json({ message: "Not allowed" });
      const exercises = await Exercise.find({ lessonId })
        .populate("lessonId", "title")
        .sort({ createdAt: 1 });
      return res.json(exercises);
    }

    const lessonIds = await lessonIdsForStudentEnrollments(req.user._id);
    if (lessonIds.length === 0) return res.json([]);
    const exercises = await Exercise.find({ lessonId: { $in: lessonIds } })
      .populate("lessonId", "title")
      .sort({ createdAt: 1 });
    res.json(exercises);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /exercises/:id
router.get("/:id", requireAuth, async (req, res) => {
  try {
    const exercise = await Exercise.findById(req.params.id);
    if (!exercise)
      return res.status(404).json({ message: "Exercise not found" });
    const lesson = await Lesson.findById(exercise.lessonId);
    if (!lesson) return res.status(404).json({ message: "Lesson not found" });
    const cls = await Classroom.findById(lesson.classId);
    if (!cls) return res.status(404).json({ message: "Class not found" });

    if (req.user.role === "teacher") {
      if (cls.teacherId.toString() !== req.user._id.toString()) {
        return res.status(403).json({ message: "Not allowed" });
      }
    } else {
      const enrolled = cls.studentIds.some(
        (id) => id.toString() === req.user._id.toString(),
      );
      if (!enrolled) return res.status(403).json({ message: "Not allowed" });
    }
    const full = await Exercise.findById(req.params.id).populate(
      "lessonId",
      "title",
    );
    res.json(full);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /exercises — teacher only
router.post("/", requireAuth, requireTeacher, async (req, res) => {
  try {
    const { lessonId, title, instructions, starterCode, language } = req.body;
    if (!lessonId || !title || !instructions) {
      return res
        .status(400)
        .json({ message: "lessonId, title, and instructions are required" });
    }
    const lesson = await Lesson.findById(lessonId);
    if (!lesson) return res.status(404).json({ message: "Lesson not found" });
    const cls = await Classroom.findOne({
      _id: lesson.classId,
      teacherId: req.user._id,
    });
    if (!cls) return res.status(403).json({ message: "Not allowed" });

    const exercise = await Exercise.create({
      lessonId,
      title,
      instructions,
      starterCode,
      language,
    });
    res.status(201).json(exercise);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PUT /exercises/:id — teacher only
router.put("/:id", requireAuth, requireTeacher, async (req, res) => {
  try {
    const existing = await Exercise.findById(req.params.id);
    if (!existing)
      return res.status(404).json({ message: "Exercise not found" });
    const lesson = await Lesson.findById(existing.lessonId);
    if (!lesson) return res.status(404).json({ message: "Lesson not found" });
    const cls = await Classroom.findOne({
      _id: lesson.classId,
      teacherId: req.user._id,
    });
    if (!cls) return res.status(403).json({ message: "Not allowed" });

    const exercise = await Exercise.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    res.json(exercise);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE /exercises/:id — teacher only
router.delete("/:id", requireAuth, requireTeacher, async (req, res) => {
  try {
    const existing = await Exercise.findById(req.params.id);
    if (!existing)
      return res.status(404).json({ message: "Exercise not found" });
    const lesson = await Lesson.findById(existing.lessonId);
    if (!lesson) return res.status(404).json({ message: "Lesson not found" });
    const cls = await Classroom.findOne({
      _id: lesson.classId,
      teacherId: req.user._id,
    });
    if (!cls) return res.status(403).json({ message: "Not allowed" });

    await Exercise.findByIdAndDelete(req.params.id);
    res.json({ message: "Exercise deleted" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;
