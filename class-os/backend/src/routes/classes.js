import express from "express";
import mongoose from "mongoose";
import Classroom from "../models/Classroom.js";
import Lesson from "../models/Lesson.js";
import Assignment from "../models/Assignment.js";
import Exercise from "../models/Exercise.js";
import Submission from "../models/Submission.js";
import Question from "../models/Question.js";
import Answer from "../models/Answer.js";
import User from "../models/User.js";
import LessonNote from "../models/LessonNote.js";
import LessonVisit from "../models/LessonVisit.js";
import QuizAttempt from "../models/QuizAttempt.js";
import Quiz from "../models/Quiz.js";
import { requireAuth, requireTeacher } from "../middleware/auth.js";

const router = express.Router();

async function getOwnedClassOr404(teacherId, classId) {
  const cls = await Classroom.findOne({ _id: classId, teacherId });
  return cls;
}

/** Cascade-delete all content tied to lessons in this class. */
export async function deleteClassContent(classId) {
  const lessons = await Lesson.find({ classId });
  const lessonIds = lessons.map((l) => l._id);
  if (lessonIds.length === 0) {
    await Lesson.deleteMany({ classId });
    return;
  }
  const assignments = await Assignment.find({ lessonId: { $in: lessonIds } });
  const assignmentIds = assignments.map((a) => a._id);
  await Submission.deleteMany({ assignmentId: { $in: assignmentIds } });
  await Assignment.deleteMany({ lessonId: { $in: lessonIds } });
  await Exercise.deleteMany({ lessonId: { $in: lessonIds } });
  await LessonVisit.deleteMany({ lessonId: { $in: lessonIds } });
  await LessonNote.deleteMany({ lessonId: { $in: lessonIds } });
  const quizzes = await Quiz.find({ lessonId: { $in: lessonIds } });
  const quizIds = quizzes.map((q) => q._id);
  if (quizIds.length > 0) {
    await QuizAttempt.deleteMany({ quizId: { $in: quizIds } });
  }
  await Quiz.deleteMany({ lessonId: { $in: lessonIds } });
  const questions = await Question.find({ lessonId: { $in: lessonIds } });
  const questionIds = questions.map((q) => q._id);
  await Answer.deleteMany({ questionId: { $in: questionIds } });
  await Question.deleteMany({ lessonId: { $in: lessonIds } });
  await Lesson.deleteMany({ classId });
}

// GET /classes — teacher: own classes; student: enrolled classes
router.get("/", requireAuth, async (req, res) => {
  try {
    if (req.user.role === "teacher") {
      const list = await Classroom.find({ teacherId: req.user._id }).sort({
        createdAt: -1,
      });
      return res.json(list);
    }
    const list = await Classroom.find({ studentIds: req.user._id })
      .populate("teacherId", "name email")
      .sort({ createdAt: -1 });
    res.json(list);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /classes — create class
router.post("/", requireAuth, requireTeacher, async (req, res) => {
  try {
    const { name, description } = req.body;
    if (!name?.trim())
      return res.status(400).json({ message: "name is required" });
    const cls = await Classroom.create({
      name: name.trim(),
      description: (description && String(description)) || "",
      teacherId: req.user._id,
    });
    res.status(201).json(cls);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /classes/:id/insights — teacher dashboard: health + analytics (before GET /:id)
router.get("/:id/insights", requireAuth, requireTeacher, async (req, res) => {
  try {
    const classId = req.params.id;
    if (!mongoose.Types.ObjectId.isValid(classId)) {
      return res.status(400).json({ message: "Invalid class id" });
    }
    const cls = await getOwnedClassOr404(req.user._id, classId);
    if (!cls) return res.status(404).json({ message: "Class not found" });

    await cls.populate("studentIds", "name email lastLoginAt createdAt");
    const students = (cls.studentIds || []).slice();
    const n = students.length;

    const lessons = await Lesson.find({ classId }).select("_id title");
    const lessonIds = lessons.map((l) => l._id);
    const lessonTitleById = Object.fromEntries(
      lessons.map((l) => [l._id.toString(), l.title]),
    );

    const assignments = await Assignment.find({
      lessonId: { $in: lessonIds },
    }).populate("lessonId", "title");

    const assignmentIds = assignments.map((a) => a._id);
    const subs = await Submission.find({
      assignmentId: { $in: assignmentIds },
      submittedAt: { $exists: true, $ne: null },
    }).select("studentId assignmentId submittedAt grade");

    const STALE_DAYS = 7;
    const now = new Date();
    const staleThreshold = new Date(now.getTime() - STALE_DAYS * 86400000);

    const staleStudents = students
      .filter((s) => {
        if (!s.lastLoginAt) return true;
        return new Date(s.lastLoginAt) < staleThreshold;
      })
      .map((s) => ({
        _id: s._id,
        name: s.name,
        email: s.email,
        lastLoginAt: s.lastLoginAt,
      }));

    const subKey = (sid, aid) => `${String(sid)}__${String(aid)}`;
    const subByStudentAssignment = new Set();
    subs.forEach((s) => {
      subByStudentAssignment.add(subKey(s.studentId, s.assignmentId));
    });

    const behind = [];
    for (const s of students) {
      let missing = 0;
      for (const a of assignments) {
        if (!subByStudentAssignment.has(subKey(s._id, a._id))) missing += 1;
      }
      if (missing > 0) {
        behind.push({
          _id: s._id,
          name: s.name,
          email: s.email,
          missingCount: missing,
        });
      }
    }
    behind.sort((a, b) => b.missingCount - a.missingCount);

    const startOfWeek = new Date(now);
    const day = startOfWeek.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    startOfWeek.setDate(startOfWeek.getDate() + diff);
    startOfWeek.setHours(0, 0, 0, 0);
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(endOfWeek.getDate() + 7);

    const dueThisWeek = assignments
      .filter(
        (a) =>
          a.dueDate &&
          new Date(a.dueDate) >= startOfWeek &&
          new Date(a.dueDate) < endOfWeek,
      )
      .map((a) => ({
        _id: a._id,
        title: a.title,
        dueDate: a.dueDate,
        lessonTitle: a.lessonId?.title,
      }));

    const nudgeMap = new Map();
    staleStudents.forEach((s) => {
      nudgeMap.set(s.email, {
        name: s.name,
        email: s.email,
        reasons: ["No login in 7+ days"],
      });
    });
    behind.forEach((b) => {
      const prev = nudgeMap.get(b.email);
      if (prev) {
        if (!prev.reasons.includes("Missing submissions"))
          prev.reasons.push("Missing submissions");
      } else {
        nudgeMap.set(b.email, {
          name: b.name,
          email: b.email,
          reasons: ["Missing submissions"],
        });
      }
    });

    const graded = subs.filter((s) => s.grade != null);
    const buckets = {
      "0-59": 0,
      "60-69": 0,
      "70-79": 0,
      "80-89": 0,
      "90-100": 0,
    };
    graded.forEach((s) => {
      const g = s.grade;
      if (g < 60) buckets["0-59"] += 1;
      else if (g < 70) buckets["60-69"] += 1;
      else if (g < 80) buckets["70-79"] += 1;
      else if (g < 90) buckets["80-89"] += 1;
      else buckets["90-100"] += 1;
    });

    const assignmentById = Object.fromEntries(
      assignments.map((a) => [a._id.toString(), a]),
    );
    const latencies = [];
    graded.forEach((s) => {
      const a = assignmentById[String(s.assignmentId)];
      if (!a?.dueDate) return;
      const ms =
        new Date(s.submittedAt).getTime() - new Date(a.dueDate).getTime();
      latencies.push(ms / 3600000);
    });
    const avgLatencyHours =
      latencies.length > 0
        ? latencies.reduce((acc, x) => acc + x, 0) / latencies.length
        : null;
    const sortedLat = [...latencies].sort((a, b) => a - b);
    const medianLatencyHours =
      sortedLat.length > 0 ? sortedLat[Math.floor(sortedLat.length / 2)] : null;

    const assignmentDifficulty = assignments
      .map((a) => {
        let subCount = 0;
        students.forEach((st) => {
          if (subByStudentAssignment.has(subKey(st._id, a._id))) subCount += 1;
        });
        return {
          assignmentId: a._id,
          title: a.title,
          lessonTitle: a.lessonId?.title,
          missingRate: n ? (n - subCount) / n : 0,
          submittedCount: subCount,
          classSize: n,
        };
      })
      .sort((a, b) => b.missingRate - a.missingRate);

    const visits = await LessonVisit.find({
      lessonId: { $in: lessonIds },
    }).select("lessonId totalSeconds");
    const timeByLesson = {};
    visits.forEach((v) => {
      const id = v.lessonId.toString();
      timeByLesson[id] = (timeByLesson[id] || 0) + v.totalSeconds;
    });
    const lessonTime = lessonIds
      .map((lid) => ({
        lessonId: lid,
        title: lessonTitleById[lid.toString()],
        totalSeconds: timeByLesson[lid.toString()] || 0,
      }))
      .filter((x) => x.totalSeconds > 0)
      .sort((a, b) => b.totalSeconds - a.totalSeconds);

    res.json({
      staleLoginDays: STALE_DAYS,
      staleStudents,
      behindStudents: behind,
      dueThisWeek,
      nudgeList: [...nudgeMap.values()],
      gradeDistribution: buckets,
      submissionLatencyHours: {
        avg: avgLatencyHours,
        median: medianLatencyHours,
        sampleSize: latencies.length,
      },
      assignmentDifficulty,
      lessonTime,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /classes/:id — detail + populated students (teacher or enrolled student)
router.get("/:id", requireAuth, async (req, res) => {
  try {
    const cls = await Classroom.findById(req.params.id).populate(
      "studentIds",
      "name email createdAt lastLoginAt",
    );
    if (!cls) return res.status(404).json({ message: "Class not found" });

    if (req.user.role === "teacher") {
      if (cls.teacherId.toString() !== req.user._id.toString()) {
        return res.status(403).json({ message: "Not allowed" });
      }
      return res.json(cls);
    }

    const enrolled = cls.studentIds.some(
      (s) => s._id.toString() === req.user._id.toString(),
    );
    if (!enrolled)
      return res.status(403).json({ message: "Not enrolled in this class" });
    res.json(cls);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PATCH /classes/:id
router.patch("/:id", requireAuth, requireTeacher, async (req, res) => {
  try {
    const cls = await getOwnedClassOr404(req.user._id, req.params.id);
    if (!cls) return res.status(404).json({ message: "Class not found" });
    const { name, description } = req.body;
    if (name != null) cls.name = String(name).trim();
    if (description != null) cls.description = String(description);
    await cls.save();
    res.json(cls);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE /classes/:id — delete class and all its lessons/content
router.delete("/:id", requireAuth, requireTeacher, async (req, res) => {
  try {
    const cls = await getOwnedClassOr404(req.user._id, req.params.id);
    if (!cls) return res.status(404).json({ message: "Class not found" });
    await deleteClassContent(cls._id);
    await Classroom.findByIdAndDelete(cls._id);
    res.json({ message: "Class deleted" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /classes/:id/students — enroll an existing student account (by email only; they sign up themselves)
router.post("/:id/students", requireAuth, requireTeacher, async (req, res) => {
  try {
    const classroom = await getOwnedClassOr404(req.user._id, req.params.id);
    if (!classroom) return res.status(404).json({ message: "Class not found" });

    const { email } = req.body;
    if (!email?.trim()) {
      return res.status(400).json({ message: "email is required" });
    }

    const emailNorm = String(email).trim().toLowerCase();
    const student = await User.findOne({ email: emailNorm });

    if (!student) {
      return res.status(404).json({
        message:
          "No account with this email. The student must create their own account (Sign up) before you can add them.",
      });
    }
    if (student.role !== "student") {
      return res
        .status(400)
        .json({ message: "This email belongs to a non-student account" });
    }

    if (classroom.studentIds.some((id) => id.equals(student._id))) {
      return res
        .status(409)
        .json({ message: "Student is already in this class" });
    }

    classroom.studentIds.push(student._id);
    await classroom.save();

    res.status(201).json({
      id: student._id,
      name: student.name,
      email: student.email,
      role: student.role,
      createdAt: student.createdAt,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE .../students/:studentId/account — must be registered before .../students/:studentId
router.delete(
  "/:id/students/:studentId/account",
  requireAuth,
  requireTeacher,
  async (req, res) => {
    try {
      const classroom = await getOwnedClassOr404(req.user._id, req.params.id);
      if (!classroom)
        return res.status(404).json({ message: "Class not found" });

      const sid = req.params.studentId;
      if (!mongoose.Types.ObjectId.isValid(sid)) {
        return res.status(400).json({ message: "Invalid student id" });
      }

      if (!classroom.studentIds.some((id) => id.toString() === sid)) {
        return res.status(404).json({ message: "Student not in this class" });
      }

      const student = await User.findOne({ _id: sid, role: "student" });
      if (!student)
        return res.status(404).json({ message: "Student not found" });

      await Submission.deleteMany({ studentId: sid });
      await LessonNote.deleteMany({ userId: sid });
      await LessonVisit.deleteMany({ userId: sid });
      await QuizAttempt.deleteMany({ studentId: sid });
      await Classroom.updateMany(
        { studentIds: sid },
        { $pull: { studentIds: sid } },
      );
      await User.findByIdAndDelete(sid);

      res.json({ message: "Student account deleted" });
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  },
);

// DELETE /classes/:classId/students/:studentId — remove from class only (unenroll)
router.delete(
  "/:id/students/:studentId",
  requireAuth,
  requireTeacher,
  async (req, res) => {
    try {
      const classroom = await getOwnedClassOr404(req.user._id, req.params.id);
      if (!classroom)
        return res.status(404).json({ message: "Class not found" });

      const sid = req.params.studentId;
      if (!mongoose.Types.ObjectId.isValid(sid)) {
        return res.status(400).json({ message: "Invalid student id" });
      }

      const before = classroom.studentIds.length;
      classroom.studentIds = classroom.studentIds.filter(
        (id) => id.toString() !== sid,
      );
      if (classroom.studentIds.length === before) {
        return res.status(404).json({ message: "Student not in this class" });
      }
      await classroom.save();
      res.json({ message: "Removed from class" });
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  },
);

export default router;
