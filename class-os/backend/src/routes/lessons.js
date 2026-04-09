import express from 'express';
import mongoose from 'mongoose';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import Lesson from '../models/Lesson.js';
import Classroom from '../models/Classroom.js';
import LessonVisit from '../models/LessonVisit.js';
import LessonNote from '../models/LessonNote.js';
import { requireAuth, requireTeacher } from '../middleware/auth.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UPLOADS_DIR = path.join(__dirname, '..', '..', 'uploads');

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOADS_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${uuidv4()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 }, // 20 MB
  fileFilter: (_req, file, cb) => {
    const allowed = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'image/png', 'image/jpeg', 'image/gif', 'image/webp',
      'text/plain', 'text/markdown',
      'application/zip',
    ];
    if (allowed.includes(file.mimetype)) return cb(null, true);
    cb(new Error('File type not allowed'));
  },
});

const router = express.Router();

// GET /lessons — teacher: ?classId= required; student: lessons from enrolled classes
router.get('/', requireAuth, async (req, res) => {
  try {
    if (req.user.role === 'teacher') {
      const { classId } = req.query;
      if (!classId || !mongoose.Types.ObjectId.isValid(classId)) {
        return res.status(400).json({ message: 'classId query parameter is required' });
      }
      const cls = await Classroom.findOne({ _id: classId, teacherId: req.user._id });
      if (!cls) return res.status(403).json({ message: 'Class not found or access denied' });
      const lessons = await Lesson.find({ classId }).sort({ weekNumber: 1, orderIndex: 1 });
      return res.json(lessons);
    }

    const { classId } = req.query;

    // If a specific classId is requested, verify enrollment and return only that class.
    if (classId) {
      if (!mongoose.Types.ObjectId.isValid(classId)) {
        return res.status(400).json({ message: 'Invalid classId' });
      }
      const cls = await Classroom.findOne({ _id: classId, studentIds: req.user._id }).select('_id name');
      if (!cls) return res.status(403).json({ message: 'Not enrolled in this class' });
      const lessons = await Lesson.find({ classId }).sort({ weekNumber: 1, orderIndex: 1 });
      const out = lessons.map((l) => {
        const o = l.toObject();
        o.className = cls.name;
        return o;
      });
      return res.json(out);
    }

    // No classId — return lessons from all enrolled classes.
    const rooms = await Classroom.find({ studentIds: req.user._id }).select('_id name');
    const classIds = rooms.map((c) => c._id);
    const classNameById = Object.fromEntries(rooms.map((c) => [c._id.toString(), c.name]));
    if (classIds.length === 0) return res.json([]);

    const lessons = await Lesson.find({ classId: { $in: classIds } }).sort({ weekNumber: 1, orderIndex: 1 });
    const out = lessons.map((l) => {
      const o = l.toObject();
      o.className = classNameById[o.classId?.toString?.()] || '';
      return o;
    });
    res.json(out);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /lessons/:id — single lesson (must be allowed for teacher of class or enrolled student)
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const lesson = await Lesson.findById(req.params.id);
    if (!lesson) return res.status(404).json({ message: 'Lesson not found' });

    const cls = await Classroom.findById(lesson.classId);
    if (!cls) return res.status(404).json({ message: 'Class not found' });

    if (req.user.role === 'teacher') {
      if (cls.teacherId.toString() !== req.user._id.toString()) {
        return res.status(403).json({ message: 'Not allowed' });
      }
      return res.json(lesson);
    }

    const enrolled = cls.studentIds.some((id) => id.toString() === req.user._id.toString());
    if (!enrolled) return res.status(403).json({ message: 'Not allowed' });
    const o = lesson.toObject();
    o.className = cls.name;
    res.json(o);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PATCH /lessons/reorder — teacher only; bulk-update weekNumber + orderIndex for all lessons in a class
// Body: { classId: string, order: [{ id: string, weekNumber: number, orderIndex: number }] }
router.patch('/reorder', requireAuth, requireTeacher, async (req, res) => {
  try {
    const { classId, order } = req.body;
    if (!classId || !Array.isArray(order) || order.length === 0) {
      return res.status(400).json({ message: 'classId and order[] are required' });
    }
    if (!mongoose.Types.ObjectId.isValid(classId)) {
      return res.status(400).json({ message: 'Invalid classId' });
    }
    const cls = await Classroom.findOne({ _id: classId, teacherId: req.user._id });
    if (!cls) return res.status(403).json({ message: 'Class not found or access denied' });

    // Validate all ids belong to this class before writing anything
    const lessonIds = order.map((o) => o.id);
    const lessons = await Lesson.find({ _id: { $in: lessonIds }, classId });
    if (lessons.length !== order.length) {
      return res.status(400).json({ message: 'One or more lesson ids are invalid or do not belong to this class' });
    }

    // Bulk-write new positions
    await Promise.all(
      order.map(({ id, weekNumber, orderIndex }) =>
        Lesson.findByIdAndUpdate(id, { weekNumber, orderIndex })
      )
    );

    const updated = await Lesson.find({ classId }).sort({ weekNumber: 1, orderIndex: 1 });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /lessons — teacher only
router.post('/', requireAuth, requireTeacher, async (req, res) => {
  try {
    const { title, content, objectives, misconceptionWarnings, weekNumber, orderIndex, classId } = req.body;
    if (!title || weekNumber == null || orderIndex == null || !classId) {
      return res.status(400).json({ message: 'title, weekNumber, orderIndex, and classId are required' });
    }
    if (!mongoose.Types.ObjectId.isValid(classId)) {
      return res.status(400).json({ message: 'Invalid classId' });
    }
    const cls = await Classroom.findOne({ _id: classId, teacherId: req.user._id });
    if (!cls) return res.status(403).json({ message: 'Class not found or access denied' });

    const lesson = await Lesson.create({
      classId,
      title,
      content,
      objectives,
      misconceptionWarnings,
      weekNumber,
      orderIndex,
    });
    res.status(201).json(lesson);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PUT /lessons/:id — teacher only
router.put('/:id', requireAuth, requireTeacher, async (req, res) => {
  try {
    const existing = await Lesson.findById(req.params.id);
    if (!existing) return res.status(404).json({ message: 'Lesson not found' });
    const cls = await Classroom.findOne({ _id: existing.classId, teacherId: req.user._id });
    if (!cls) return res.status(403).json({ message: 'Not allowed' });

    const lesson = await Lesson.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    res.json(lesson);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE /lessons/:id — teacher only
router.delete('/:id', requireAuth, requireTeacher, async (req, res) => {
  try {
    const existing = await Lesson.findById(req.params.id);
    if (!existing) return res.status(404).json({ message: 'Lesson not found' });
    const cls = await Classroom.findOne({ _id: existing.classId, teacherId: req.user._id });
    if (!cls) return res.status(403).json({ message: 'Not allowed' });

    await LessonVisit.deleteMany({ lessonId: req.params.id });
    await LessonNote.deleteMany({ lessonId: req.params.id });
    const lesson = await Lesson.findByIdAndDelete(req.params.id);
    res.json({ message: 'Lesson deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /lessons/:id/attachments — teacher uploads a file to a lesson
router.post('/:id/attachments', requireAuth, requireTeacher, (req, res) => {
  upload.single('file')(req, res, async (err) => {
    if (err) return res.status(400).json({ message: err.message });
    if (!req.file) return res.status(400).json({ message: 'No file uploaded' });

    try {
      const lesson = await Lesson.findById(req.params.id);
      if (!lesson) return res.status(404).json({ message: 'Lesson not found' });
      const cls = await Classroom.findOne({ _id: lesson.classId, teacherId: req.user._id });
      if (!cls) return res.status(403).json({ message: 'Not allowed' });

      lesson.attachments.push({
        filename: req.file.originalname,
        storedName: req.file.filename,
        mimetype: req.file.mimetype,
        size: req.file.size,
      });
      await lesson.save();
      res.json(lesson);
    } catch (e) {
      // Clean up uploaded file on DB error
      fs.unlink(req.file.path, () => {});
      res.status(500).json({ message: e.message });
    }
  });
});

// DELETE /lessons/:id/attachments/:attachId — teacher removes an attachment
router.delete('/:id/attachments/:attachId', requireAuth, requireTeacher, async (req, res) => {
  try {
    const lesson = await Lesson.findById(req.params.id);
    if (!lesson) return res.status(404).json({ message: 'Lesson not found' });
    const cls = await Classroom.findOne({ _id: lesson.classId, teacherId: req.user._id });
    if (!cls) return res.status(403).json({ message: 'Not allowed' });

    const att = lesson.attachments.id(req.params.attachId);
    if (!att) return res.status(404).json({ message: 'Attachment not found' });

    const filePath = path.join(UPLOADS_DIR, att.storedName);
    fs.unlink(filePath, () => {});
    att.deleteOne();
    await lesson.save();
    res.json(lesson);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

// POST /lessons/:id/track-time — student heartbeat (aggregate time on lesson)
router.post('/:id/track-time', requireAuth, async (req, res) => {
  try {
    if (req.user.role !== 'student') {
      return res.status(403).json({ message: 'Only students can track lesson time' });
    }
    const raw = Number(req.body?.seconds);
    const seconds = Number.isFinite(raw) ? Math.min(Math.max(0, Math.floor(raw)), 3600) : 0;
    if (seconds <= 0) return res.json({ ok: true, totalSeconds: 0 });

    const lesson = await Lesson.findById(req.params.id);
    if (!lesson) return res.status(404).json({ message: 'Lesson not found' });
    const cls = await Classroom.findById(lesson.classId);
    if (!cls) return res.status(404).json({ message: 'Class not found' });
    const enrolled = cls.studentIds.some((id) => id.toString() === req.user._id.toString());
    if (!enrolled) return res.status(403).json({ message: 'Not allowed' });

    const visit = await LessonVisit.findOneAndUpdate(
      { userId: req.user._id, lessonId: lesson._id },
      {
        $inc: { totalSeconds: seconds },
        $set: { lastOpenedAt: new Date() },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    res.json({ ok: true, totalSeconds: visit.totalSeconds });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;
