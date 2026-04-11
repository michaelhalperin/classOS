import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import User from "../models/User.js";
import Lesson from "../models/Lesson.js";
import Classroom from "../models/Classroom.js";
import Submission from "../models/Submission.js";
import LessonNote from "../models/LessonNote.js";
import LessonVisit from "../models/LessonVisit.js";
import QuizAttempt from "../models/QuizAttempt.js";
import { deleteClassContent } from "./classes.js";
import { requireAuth, requireTeacher } from "../middleware/auth.js";

async function teacherHasStudent(teacherId, studentId) {
  const n = await Classroom.countDocuments({
    teacherId,
    studentIds: studentId,
  });
  return n > 0;
}

const router = express.Router();

function signToken(user) {
  return jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, {
    expiresIn: "7d",
  });
}

// POST /auth/register
router.post("/register", async (req, res) => {
  try {
    const { name, email, password, role } = req.body;
    if (!name || !email || !password || !role) {
      return res.status(400).json({ message: "All fields required" });
    }
    if (!["teacher", "student"].includes(role)) {
      return res
        .status(400)
        .json({ message: "Role must be teacher or student" });
    }

    const existing = await User.findOne({ email });
    if (existing)
      return res.status(409).json({ message: "Email already in use" });

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await User.create({
      name,
      email,
      passwordHash,
      role,
      lastLoginAt: new Date(),
    });
    const token = signToken(user);

    res.status(201).json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /auth/login
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: "Email and password required" });
    }

    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ message: "Invalid credentials" });

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) return res.status(401).json({ message: "Invalid credentials" });

    user.lastLoginAt = new Date();
    await user.save();

    const token = signToken(user);
    res.json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /auth/students — teacher only; requires ?classId= (roster for that class)
router.get("/students", requireAuth, requireTeacher, async (req, res) => {
  try {
    const { classId } = req.query;
    if (!classId || !mongoose.Types.ObjectId.isValid(classId)) {
      return res
        .status(400)
        .json({ message: "classId query parameter is required" });
    }
    const cls = await Classroom.findOne({
      _id: classId,
      teacherId: req.user._id,
    }).populate("studentIds", "name email createdAt lastLoginAt role");
    if (!cls) return res.status(404).json({ message: "Class not found" });
    const list = (cls.studentIds || [])
      .slice()
      .sort((a, b) => (a.name || "").localeCompare(b.name || ""));
    res.json(list);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /auth/students/:id — teacher only (must teach that student in some class)
router.get("/students/:id", requireAuth, requireTeacher, async (req, res) => {
  try {
    const ok = await teacherHasStudent(req.user._id, req.params.id);
    if (!ok) return res.status(403).json({ message: "Not allowed" });
    const student = await User.findOne({
      _id: req.params.id,
      role: "student",
    }).select("-passwordHash");
    if (!student) return res.status(404).json({ message: "Student not found" });
    res.json(student);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /auth/students — teacher only, create a new student account
router.post("/students", requireAuth, requireTeacher, async (req, res) => {
  try {
    const { name, email, password = "password123" } = req.body;
    if (!name || !email)
      return res.status(400).json({ message: "name and email are required" });

    const existing = await User.findOne({ email });
    if (existing)
      return res.status(409).json({ message: "Email already in use" });

    const passwordHash = await bcrypt.hash(password, 12);
    const student = await User.create({
      name,
      email,
      passwordHash,
      role: "student",
    });
    res.status(201).json({
      id: student._id,
      name: student.name,
      email: student.email,
      role: student.role,
      createdAt: student.createdAt,
      temporaryPassword: password,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE /auth/students/:id — teacher only, delete student account (must be in one of teacher's classes)
router.delete(
  "/students/:id",
  requireAuth,
  requireTeacher,
  async (req, res) => {
    try {
      const ok = await teacherHasStudent(req.user._id, req.params.id);
      if (!ok) return res.status(403).json({ message: "Not allowed" });
      await Classroom.updateMany(
        { studentIds: req.params.id },
        { $pull: { studentIds: req.params.id } },
      );
      await Submission.deleteMany({ studentId: req.params.id });
      await LessonNote.deleteMany({ userId: req.params.id });
      await LessonVisit.deleteMany({ userId: req.params.id });
      await QuizAttempt.deleteMany({ studentId: req.params.id });
      const student = await User.findOneAndDelete({
        _id: req.params.id,
        role: "student",
      });
      if (!student)
        return res.status(404).json({ message: "Student not found" });
      res.json({ message: "Student account deleted" });
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  },
);

// PATCH /auth/students/:id — teacher only, update student name/email
router.patch("/students/:id", requireAuth, requireTeacher, async (req, res) => {
  try {
    const ok = await teacherHasStudent(req.user._id, req.params.id);
    if (!ok) return res.status(403).json({ message: "Not allowed" });
    const { name, email } = req.body;
    const student = await User.findOneAndUpdate(
      { _id: req.params.id, role: "student" },
      { ...(name && { name }), ...(email && { email }) },
      { new: true, runValidators: true },
    ).select("-passwordHash");
    if (!student) return res.status(404).json({ message: "Student not found" });
    res.json(student);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /auth/me/completed-lessons — student: IDs of lessons marked complete (persisted)
router.get("/me/completed-lessons", requireAuth, async (req, res) => {
  try {
    if (req.user.role !== "student") {
      return res.json({ lessonIds: [] });
    }
    const user = await User.findById(req.user._id).select("completedLessonIds");
    const lessonIds = (user?.completedLessonIds || []).map((id) =>
      id.toString(),
    );
    res.json({ lessonIds });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PATCH /auth/me/completed-lessons — set one lesson complete / incomplete
router.patch("/me/completed-lessons", requireAuth, async (req, res) => {
  try {
    if (req.user.role !== "student") {
      return res.status(403).json({ message: "Students only" });
    }
    const { lessonId, completed } = req.body;
    if (!lessonId || typeof completed !== "boolean") {
      return res
        .status(400)
        .json({ message: "lessonId and completed (boolean) required" });
    }
    if (!mongoose.Types.ObjectId.isValid(lessonId)) {
      return res.status(400).json({ message: "Invalid lesson id" });
    }
    const lesson = await Lesson.findById(lessonId);
    if (!lesson) return res.status(404).json({ message: "Lesson not found" });

    const update = completed
      ? { $addToSet: { completedLessonIds: lessonId } }
      : { $pull: { completedLessonIds: lessonId } };
    const user = await User.findByIdAndUpdate(req.user._id, update, {
      new: true,
    }).select("completedLessonIds");
    const lessonIds = (user?.completedLessonIds || []).map((id) =>
      id.toString(),
    );
    res.json({ lessonIds });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /auth/me/completed-lessons/sync — one-time merge from legacy client storage
router.post("/me/completed-lessons/sync", requireAuth, async (req, res) => {
  try {
    if (req.user.role !== "student") {
      return res.status(403).json({ message: "Students only" });
    }
    const { lessonIds } = req.body;
    if (!Array.isArray(lessonIds)) {
      return res.status(400).json({ message: "lessonIds array required" });
    }
    const valid = lessonIds.filter((id) => mongoose.Types.ObjectId.isValid(id));
    if (valid.length === 0) {
      const user = await User.findById(req.user._id).select(
        "completedLessonIds",
      );
      return res.json({
        lessonIds: (user?.completedLessonIds || []).map((id) => id.toString()),
      });
    }
    await User.findByIdAndUpdate(req.user._id, {
      $addToSet: { completedLessonIds: { $each: valid } },
    });
    const user = await User.findById(req.user._id).select("completedLessonIds");
    const out = (user?.completedLessonIds || []).map((id) => id.toString());
    res.json({ lessonIds: out });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /auth/me — return current user
router.get("/me", requireAuth, (req, res) => {
  res.json(req.user);
});

function serializeUserDoc(user) {
  return {
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    role: user.role,
    createdAt: user.createdAt,
  };
}

// PATCH /auth/me — update own profile (name, email, password)
router.patch("/me", requireAuth, async (req, res) => {
  try {
    const { name, email, currentPassword, newPassword } = req.body;
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: "User not found" });

    if (newPassword != null && String(newPassword).length > 0) {
      if (!currentPassword) {
        return res.status(400).json({
          message: "Current password is required to set a new password",
        });
      }
      if (String(newPassword).length < 6) {
        return res
          .status(400)
          .json({ message: "New password must be at least 6 characters" });
      }
      const valid = await bcrypt.compare(currentPassword, user.passwordHash);
      if (!valid)
        return res
          .status(401)
          .json({ message: "Current password is incorrect" });
      user.passwordHash = await bcrypt.hash(newPassword, 12);
    }

    if (name != null && String(name).trim()) {
      user.name = String(name).trim();
    }
    if (email != null && String(email).trim()) {
      const nextEmail = String(email).trim().toLowerCase();
      if (nextEmail !== user.email) {
        const taken = await User.findOne({
          email: nextEmail,
          _id: { $ne: user._id },
        });
        if (taken)
          return res.status(409).json({ message: "Email already in use" });
        user.email = nextEmail;
      }
    }

    await user.save();
    res.json(serializeUserDoc(user));
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ message: "Email already in use" });
    }
    res.status(500).json({ message: err.message });
  }
});

// DELETE /auth/me — permanently delete own account (password required)
router.delete("/me", requireAuth, async (req, res) => {
  try {
    const { password } = req.body || {};
    if (!password || !String(password).trim()) {
      return res
        .status(400)
        .json({ message: "Password is required to delete your account" });
    }

    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: "User not found" });

    const valid = await bcrypt.compare(String(password), user.passwordHash);
    if (!valid) return res.status(401).json({ message: "Incorrect password" });

    if (user.role === "student") {
      await Submission.deleteMany({ studentId: user._id });
      await LessonNote.deleteMany({ userId: user._id });
      await LessonVisit.deleteMany({ userId: user._id });
      await QuizAttempt.deleteMany({ studentId: user._id });
      await Classroom.updateMany(
        { studentIds: user._id },
        { $pull: { studentIds: user._id } },
      );
      await User.findByIdAndDelete(user._id);
      return res.json({ message: "Account deleted" });
    }

    if (user.role === "teacher") {
      const owned = await Classroom.find({ teacherId: user._id });
      for (const cls of owned) {
        await deleteClassContent(cls._id);
        await Classroom.findByIdAndDelete(cls._id);
      }
      await User.findByIdAndDelete(user._id);
      return res.json({ message: "Account deleted" });
    }

    res.status(400).json({ message: "Unknown role" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;
