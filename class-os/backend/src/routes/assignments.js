import express from 'express';
import mongoose from 'mongoose';
import Assignment from '../models/Assignment.js';
import Lesson from '../models/Lesson.js';
import Classroom from '../models/Classroom.js';
import Submission from '../models/Submission.js';
import { requireAuth, requireTeacher } from '../middleware/auth.js';
import { lessonIdsForClass } from '../utils/classHelpers.js';

const router = express.Router();

async function lessonIdsForStudentEnrollments(userId, classId) {
  if (classId) {
    const lessons = await Lesson.find({ classId }).select('_id');
    return lessons.map((l) => l._id);
  }
  const rooms = await Classroom.find({ studentIds: userId }).select('_id');
  const classIds = rooms.map((c) => c._id);
  if (classIds.length === 0) return [];
  const lessons = await Lesson.find({ classId: { $in: classIds } }).select('_id');
  return lessons.map((l) => l._id);
}

// GET /assignments — scoped by class for teacher; student sees enrolled classes only
router.get('/', requireAuth, async (req, res) => {
  try {
    if (req.user.role === 'teacher') {
      const { classId } = req.query;
      if (!classId || !mongoose.Types.ObjectId.isValid(classId)) {
        return res.status(400).json({ message: 'classId query parameter is required' });
      }
      const cls = await Classroom.findOne({ _id: classId, teacherId: req.user._id });
      if (!cls) return res.status(403).json({ message: 'Class not found or access denied' });

      const lessonIds = await lessonIdsForClass(classId);
      if (lessonIds.length === 0) return res.json([]);

      const assignments = await Assignment.find({ lessonId: { $in: lessonIds } })
        .populate('lessonId', 'title weekNumber')
        .sort({ dueDate: 1, createdAt: 1 });
      return res.json(assignments);
    }

    const { classId: studentClassId } = req.query;

    // If a specific class is requested, verify enrollment first.
    if (studentClassId) {
      if (!mongoose.Types.ObjectId.isValid(studentClassId)) {
        return res.status(400).json({ message: 'Invalid classId' });
      }
      const enrolled = await Classroom.exists({ _id: studentClassId, studentIds: req.user._id });
      if (!enrolled) return res.status(403).json({ message: 'Not enrolled in this class' });
    }

    const lessonIds = await lessonIdsForStudentEnrollments(req.user._id, studentClassId || null);
    if (lessonIds.length === 0) return res.json([]);

    const assignments = await Assignment.find({ lessonId: { $in: lessonIds } })
      .populate('lessonId', 'title weekNumber classId')
      .sort({ dueDate: 1, createdAt: 1 });

    const classIds = [...new Set(assignments.map((a) => a.lessonId?.classId).filter(Boolean))];
    const rooms = await Classroom.find({ _id: { $in: classIds } }).select('name');
    const classNameById = Object.fromEntries(rooms.map((c) => [c._id.toString(), c.name]));

    const submissions = await Submission.find({ studentId: req.user._id });
    const subMap = Object.fromEntries(submissions.map((s) => [s.assignmentId.toString(), s]));
    const result = assignments.map((a) => {
      const o = a.toObject();
      const lid = o.lessonId;
      if (lid?.classId) {
        lid.className = classNameById[lid.classId.toString()] || '';
      }
      return {
        ...o,
        submission: subMap[a._id.toString()] || null,
      };
    });
    return res.json(result);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /assignments/:id
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const assignment = await Assignment.findById(req.params.id).populate('lessonId', 'title classId');
    if (!assignment) return res.status(404).json({ message: 'Assignment not found' });

    const lesson = assignment.lessonId;
    if (!lesson) return res.status(404).json({ message: 'Lesson not found' });

    const cls = await Classroom.findById(lesson.classId);
    if (!cls) return res.status(404).json({ message: 'Class not found' });

    if (req.user.role === 'teacher') {
      if (cls.teacherId.toString() !== req.user._id.toString()) {
        return res.status(403).json({ message: 'Not allowed' });
      }
      return res.json(assignment);
    }

    const enrolled = cls.studentIds.some((id) => id.toString() === req.user._id.toString());
    if (!enrolled) return res.status(403).json({ message: 'Not allowed' });
    res.json(assignment);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /assignments — teacher only
router.post('/', requireAuth, requireTeacher, async (req, res) => {
  try {
    const { lessonId, title, instructions, dueDate } = req.body;
    if (!lessonId || !title || !instructions) {
      return res.status(400).json({ message: 'lessonId, title, and instructions are required' });
    }
    const lesson = await Lesson.findById(lessonId);
    if (!lesson) return res.status(404).json({ message: 'Lesson not found' });
    const cls = await Classroom.findOne({ _id: lesson.classId, teacherId: req.user._id });
    if (!cls) return res.status(403).json({ message: 'Not allowed' });

    const assignment = await Assignment.create({ lessonId, title, instructions, dueDate });
    res.status(201).json(assignment);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PUT /assignments/:id — teacher only
router.put('/:id', requireAuth, requireTeacher, async (req, res) => {
  try {
    const existing = await Assignment.findById(req.params.id);
    if (!existing) return res.status(404).json({ message: 'Assignment not found' });
    const lesson = await Lesson.findById(existing.lessonId);
    if (!lesson) return res.status(404).json({ message: 'Lesson not found' });
    const cls = await Classroom.findOne({ _id: lesson.classId, teacherId: req.user._id });
    if (!cls) return res.status(403).json({ message: 'Not allowed' });

    const assignment = await Assignment.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    res.json(assignment);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE /assignments/:id — teacher only
router.delete('/:id', requireAuth, requireTeacher, async (req, res) => {
  try {
    const existing = await Assignment.findById(req.params.id);
    if (!existing) return res.status(404).json({ message: 'Assignment not found' });
    const lesson = await Lesson.findById(existing.lessonId);
    if (!lesson) return res.status(404).json({ message: 'Lesson not found' });
    const cls = await Classroom.findOne({ _id: lesson.classId, teacherId: req.user._id });
    if (!cls) return res.status(403).json({ message: 'Not allowed' });

    await Assignment.findByIdAndDelete(req.params.id);
    await Submission.deleteMany({ assignmentId: req.params.id });
    res.json({ message: 'Assignment deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;
