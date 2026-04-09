import express from 'express';
import Question from '../models/Question.js';
import Answer from '../models/Answer.js';
import Lesson from '../models/Lesson.js';
import { requireAuth, requireTeacher } from '../middleware/auth.js';
import { assertLessonAccess } from '../utils/classHelpers.js';

const router = express.Router();

// GET /questions?lessonId=... — list questions for a lesson
router.get('/', requireAuth, async (req, res) => {
  try {
    if (!req.query.lessonId) return res.json([]);
    const lesson = await Lesson.findById(req.query.lessonId);
    if (!lesson) return res.status(404).json({ message: 'Lesson not found' });
    const access = await assertLessonAccess(req, lesson);
    if (!access.ok) return res.status(access.status).json({ message: access.message });

    const questions = await Question.find({ lessonId: req.query.lessonId })
      .populate('authorId', 'name role')
      .sort({ isPinned: -1, createdAt: -1 });
    res.json(questions);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /questions/:id
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const question = await Question.findById(req.params.id).populate('authorId', 'name role');
    if (!question) return res.status(404).json({ message: 'Question not found' });
    const lesson = await Lesson.findById(question.lessonId);
    if (!lesson) return res.status(404).json({ message: 'Lesson not found' });
    const access = await assertLessonAccess(req, lesson);
    if (!access.ok) return res.status(access.status).json({ message: access.message });
    res.json(question);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /questions — student or teacher can ask
router.post('/', requireAuth, async (req, res) => {
  try {
    const { lessonId, title, body } = req.body;
    if (!lessonId || !title || !body) {
      return res.status(400).json({ message: 'lessonId, title, and body are required' });
    }
    const lesson = await Lesson.findById(lessonId);
    if (!lesson) return res.status(404).json({ message: 'Lesson not found' });
    const access = await assertLessonAccess(req, lesson);
    if (!access.ok) return res.status(access.status).json({ message: access.message });

    const question = await Question.create({ lessonId, title, body, authorId: req.user._id });
    await question.populate('authorId', 'name role');
    res.status(201).json(question);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PUT /questions/:id/pin — teacher only, toggle pin
router.put('/:id/pin', requireAuth, requireTeacher, async (req, res) => {
  try {
    const question = await Question.findById(req.params.id);
    if (!question) return res.status(404).json({ message: 'Question not found' });
    const lesson = await Lesson.findById(question.lessonId);
    if (!lesson) return res.status(404).json({ message: 'Lesson not found' });
    const access = await assertLessonAccess(req, lesson);
    if (!access.ok) return res.status(access.status).json({ message: access.message });

    question.isPinned = !question.isPinned;
    await question.save();
    res.json(question);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE /questions/:id — author or teacher
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const question = await Question.findById(req.params.id);
    if (!question) return res.status(404).json({ message: 'Question not found' });
    const lesson = await Lesson.findById(question.lessonId);
    if (!lesson) return res.status(404).json({ message: 'Lesson not found' });
    const access = await assertLessonAccess(req, lesson);
    if (!access.ok) return res.status(access.status).json({ message: access.message });

    if (req.user.role !== 'teacher' && question.authorId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }
    await question.deleteOne();
    await Answer.deleteMany({ questionId: req.params.id });
    res.json({ message: 'Question deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;
