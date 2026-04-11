import express from "express";
import mongoose from "mongoose";
import Lesson from "../models/Lesson.js";
import Exercise from "../models/Exercise.js";
import Assignment from "../models/Assignment.js";
import Submission from "../models/Submission.js";
import Question from "../models/Question.js";
import Classroom from "../models/Classroom.js";
import { requireAuth, requireTeacher } from "../middleware/auth.js";
import { assertLessonAccess } from "../utils/classHelpers.js";
import {
  isAiConfigured,
  tutorReply,
  codeHint,
  generateDrills,
  checkDrillAnswer,
  clusterConfusion,
  polishLesson,
  generateQuiz,
  gradeSubmissionAI,
} from "../services/aiService.js";

const router = express.Router();

function aiUnavailable(res) {
  return res.status(503).json({
    message: "AI is not configured. Set OPENAI_API_KEY on the server.",
  });
}

// POST /ai/tutor — chat scoped to lesson (students & teachers)
router.post("/tutor", requireAuth, async (req, res) => {
  try {
    if (!isAiConfigured()) return aiUnavailable(res);
    const { lessonId, messages } = req.body;
    if (!lessonId || !Array.isArray(messages) || messages.length === 0) {
      return res
        .status(400)
        .json({ message: "lessonId and messages[] are required" });
    }
    if (!mongoose.isValidObjectId(lessonId)) {
      return res.status(400).json({ message: "Invalid lessonId" });
    }
    const lesson = await Lesson.findById(lessonId);
    if (!lesson) return res.status(404).json({ message: "Lesson not found" });
    const access = await assertLessonAccess(req, lesson);
    if (!access.ok)
      return res.status(access.status).json({ message: access.message });

    const weekLessons = await Lesson.find({
      weekNumber: lesson.weekNumber,
      classId: lesson.classId,
    })
      .sort({ orderIndex: 1 })
      .select("title orderIndex weekNumber");

    const sanitized = messages
      .filter((m) => m && typeof m.content === "string")
      .slice(-20)
      .map((m) => ({
        role: m.role === "assistant" ? "assistant" : "user",
        content: m.content.slice(0, 8000),
      }));

    const reply = await tutorReply({
      lesson,
      weekLessons,
      messages: sanitized,
    });
    res.json({ reply });
  } catch (err) {
    console.error(err);
    const status = err.status || 500;
    res.status(status).json({ message: err.message || "Tutor request failed" });
  }
});

// POST /ai/code-hint
router.post("/code-hint", requireAuth, async (req, res) => {
  try {
    if (!isAiConfigured()) return aiUnavailable(res);
    const { code, language, lessonId, exerciseId, assignmentId } = req.body;
    const snippet = typeof code === "string" ? code : "";

    let lessonContent = "";
    let lessonTitle = "";
    let exerciseTitle = "";
    let exerciseInstructions = "";
    let assignmentTitle = "";
    let assignmentInstructions = "";

    if (lessonId && mongoose.isValidObjectId(lessonId)) {
      const lesson = await Lesson.findById(lessonId).select("title content");
      if (lesson) {
        lessonTitle = lesson.title;
        lessonContent = lesson.content || "";
      }
    }

    if (exerciseId && mongoose.isValidObjectId(exerciseId)) {
      const ex = await Exercise.findById(exerciseId).populate(
        "lessonId",
        "title content",
      );
      if (ex) {
        exerciseTitle = ex.title;
        exerciseInstructions = ex.instructions || "";
        if (!lessonContent && ex.lessonId?.content)
          lessonContent = ex.lessonId.content;
        if (!lessonTitle && ex.lessonId?.title) lessonTitle = ex.lessonId.title;
      }
    }

    if (assignmentId && mongoose.isValidObjectId(assignmentId)) {
      const asg = await Assignment.findById(assignmentId).populate(
        "lessonId",
        "title content",
      );
      if (asg) {
        assignmentTitle = asg.title;
        assignmentInstructions = asg.instructions || "";
        if (!lessonContent && asg.lessonId?.content)
          lessonContent = asg.lessonId.content;
        if (!lessonTitle && asg.lessonId?.title)
          lessonTitle = asg.lessonId.title;
      }
    }

    const result = await codeHint({
      code: snippet,
      language: language || "javascript",
      lessonContent,
      lessonTitle,
      exerciseTitle,
      exerciseInstructions,
      assignmentTitle,
      assignmentInstructions,
    });
    res.json(result);
  } catch (err) {
    console.error(err);
    const status = err.status || 500;
    res.status(status).json({ message: err.message || "Code hint failed" });
  }
});

// POST /ai/drills/generate
router.post("/drills/generate", requireAuth, async (req, res) => {
  try {
    if (!isAiConfigured()) return aiUnavailable(res);
    const { lessonId } = req.body;
    if (!lessonId || !mongoose.isValidObjectId(lessonId)) {
      return res.status(400).json({ message: "Valid lessonId is required" });
    }
    const lesson = await Lesson.findById(lessonId);
    if (!lesson) return res.status(404).json({ message: "Lesson not found" });
    const access = await assertLessonAccess(req, lesson);
    if (!access.ok)
      return res.status(access.status).json({ message: access.message });
    const drills = await generateDrills({ lesson });
    res.json({ drills });
  } catch (err) {
    console.error(err);
    const status = err.status || 500;
    res
      .status(status)
      .json({ message: err.message || "Drill generation failed" });
  }
});

// POST /ai/drills/check
router.post("/drills/check", requireAuth, async (req, res) => {
  try {
    if (!isAiConfigured()) return aiUnavailable(res);
    const { drill, userAnswer } = req.body;
    if (!drill || typeof userAnswer !== "string") {
      return res
        .status(400)
        .json({ message: "drill object and userAnswer string are required" });
    }
    if (!drill.question || !drill.rubric || !drill.answerKey) {
      return res
        .status(400)
        .json({ message: "drill must include question, rubric, answerKey" });
    }
    const result = await checkDrillAnswer({ drill, userAnswer });
    res.json(result);
  } catch (err) {
    console.error(err);
    const status = err.status || 500;
    res.status(status).json({ message: err.message || "Check failed" });
  }
});

// GET /ai/insights/:lessonId — confusion clusters (teacher)
router.get(
  "/insights/:lessonId",
  requireAuth,
  requireTeacher,
  async (req, res) => {
    try {
      if (!isAiConfigured()) return aiUnavailable(res);
      const { lessonId } = req.params;
      if (!mongoose.isValidObjectId(lessonId)) {
        return res.status(400).json({ message: "Invalid lessonId" });
      }
      const lesson = await Lesson.findById(lessonId);
      if (!lesson) return res.status(404).json({ message: "Lesson not found" });
      const access = await assertLessonAccess(req, lesson);
      if (!access.ok)
        return res.status(access.status).json({ message: access.message });

      const questions = await Question.find({ lessonId })
        .sort({ createdAt: -1 })
        .select("_id title body");
      if (questions.length === 0) {
        return res.json({
          clusters: [],
          message: "No questions yet for this lesson.",
        });
      }
      const clusters = await clusterConfusion({ questions });
      res.json({ clusters, questionCount: questions.length });
    } catch (err) {
      console.error(err);
      const status = err.status || 500;
      res.status(status).json({ message: err.message || "Insights failed" });
    }
  },
);

// POST /ai/polish — teacher
router.post("/polish", requireAuth, requireTeacher, async (req, res) => {
  try {
    if (!isAiConfigured()) return aiUnavailable(res);
    const { lessonId, mode } = req.body;
    if (!lessonId || !mongoose.isValidObjectId(lessonId)) {
      return res.status(400).json({ message: "Valid lessonId is required" });
    }
    if (!["expand", "exercises", "misconceptions"].includes(mode)) {
      return res
        .status(400)
        .json({ message: "mode must be expand, exercises, or misconceptions" });
    }
    const lesson = await Lesson.findById(lessonId);
    if (!lesson) return res.status(404).json({ message: "Lesson not found" });
    const access = await assertLessonAccess(req, lesson);
    if (!access.ok)
      return res.status(access.status).json({ message: access.message });
    const result = await polishLesson({ lesson, mode });
    res.json(result);
  } catch (err) {
    console.error(err);
    const status = err.status || 500;
    res.status(status).json({ message: err.message || "Polish failed" });
  }
});

// POST /ai/generate-quiz — teacher: generate quiz questions from lesson content
router.post("/generate-quiz", requireAuth, requireTeacher, async (req, res) => {
  try {
    if (!isAiConfigured()) return aiUnavailable(res);
    const { lessonId, questionCount } = req.body;
    if (!lessonId || !mongoose.isValidObjectId(lessonId)) {
      return res.status(400).json({ message: "Valid lessonId is required" });
    }
    const lesson = await Lesson.findById(lessonId);
    if (!lesson) return res.status(404).json({ message: "Lesson not found" });
    const access = await assertLessonAccess(req, lesson);
    if (!access.ok)
      return res.status(access.status).json({ message: access.message });

    const quiz = await generateQuiz({
      lesson,
      questionCount: Number(questionCount) || 8,
    });
    res.json(quiz);
  } catch (err) {
    console.error(err);
    res
      .status(err.status || 500)
      .json({ message: err.message || "Quiz generation failed" });
  }
});

// POST /ai/grade-submission — teacher: AI draft grade + feedback for a submission
router.post(
  "/grade-submission",
  requireAuth,
  requireTeacher,
  async (req, res) => {
    try {
      if (!isAiConfigured()) return aiUnavailable(res);
      const { submissionId } = req.body;
      if (!submissionId || !mongoose.isValidObjectId(submissionId)) {
        return res
          .status(400)
          .json({ message: "Valid submissionId is required" });
      }

      const submission = await Submission.findById(submissionId);
      if (!submission)
        return res.status(404).json({ message: "Submission not found" });

      const assignment = await Assignment.findById(submission.assignmentId);
      if (!assignment)
        return res.status(404).json({ message: "Assignment not found" });

      const lesson = await Lesson.findById(assignment.lessonId);
      if (!lesson) return res.status(404).json({ message: "Lesson not found" });

      const cls = await Classroom.findOne({
        _id: lesson.classId,
        teacherId: req.user._id,
      });
      if (!cls) return res.status(403).json({ message: "Not allowed" });

      const result = await gradeSubmissionAI({
        assignmentTitle: assignment.title,
        assignmentInstructions: assignment.instructions || "",
        submissionContent: submission.content || "",
        githubLink: submission.githubLink || "",
      });
      res.json(result);
    } catch (err) {
      console.error(err);
      res
        .status(err.status || 500)
        .json({ message: err.message || "AI grading failed" });
    }
  },
);

export default router;
