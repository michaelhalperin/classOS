import express from "express";
import Answer from "../models/Answer.js";
import Question from "../models/Question.js";
import Lesson from "../models/Lesson.js";
import Classroom from "../models/Classroom.js";
import { requireAuth } from "../middleware/auth.js";

const router = express.Router();

async function assertLessonAccess(req, lesson) {
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

async function assertQuestionAccess(req, questionId) {
  const question = await Question.findById(questionId);
  if (!question)
    return { ok: false, status: 404, message: "Question not found" };
  const lesson = await Lesson.findById(question.lessonId);
  if (!lesson) return { ok: false, status: 404, message: "Lesson not found" };
  const access = await assertLessonAccess(req, lesson);
  if (!access.ok) return { ...access, question: null };
  return { ok: true, question };
}

// GET /answers?questionId=... — list answers for a question
router.get("/", requireAuth, async (req, res) => {
  try {
    if (!req.query.questionId) return res.json([]);
    const gate = await assertQuestionAccess(req, req.query.questionId);
    if (!gate.ok)
      return res.status(gate.status).json({ message: gate.message });

    const answers = await Answer.find({ questionId: req.query.questionId })
      .populate("authorId", "name role")
      .sort({ createdAt: 1 });
    res.json(answers);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /answers — student or teacher can answer
router.post("/", requireAuth, async (req, res) => {
  try {
    const { questionId, body } = req.body;
    if (!questionId || !body) {
      return res
        .status(400)
        .json({ message: "questionId and body are required" });
    }
    const gate = await assertQuestionAccess(req, questionId);
    if (!gate.ok)
      return res.status(gate.status).json({ message: gate.message });

    const answer = await Answer.create({
      questionId,
      body,
      authorId: req.user._id,
    });
    await answer.populate("authorId", "name role");
    res.status(201).json(answer);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE /answers/:id — author or teacher
router.delete("/:id", requireAuth, async (req, res) => {
  try {
    const answer = await Answer.findById(req.params.id);
    if (!answer) return res.status(404).json({ message: "Answer not found" });
    const gate = await assertQuestionAccess(req, answer.questionId);
    if (!gate.ok)
      return res.status(gate.status).json({ message: gate.message });

    if (
      req.user.role !== "teacher" &&
      answer.authorId.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({ message: "Not authorized" });
    }
    await answer.deleteOne();
    res.json({ message: "Answer deleted" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;
