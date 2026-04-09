import express from 'express';
import Quiz from '../models/Quiz.js';
import QuizAttempt from '../models/QuizAttempt.js';
import Lesson from '../models/Lesson.js';
import Classroom from '../models/Classroom.js';
import { requireAuth, requireTeacher } from '../middleware/auth.js';

const router = express.Router();

// ── helpers ──────────────────────────────────────────────────────────────────

async function resolveClassForLesson(lessonId) {
  const lesson = await Lesson.findById(lessonId);
  if (!lesson) return { lesson: null, cls: null };
  const cls = await Classroom.findById(lesson.classId);
  return { lesson, cls };
}

async function teacherOwnsLesson(lessonId, teacherId) {
  const { lesson, cls } = await resolveClassForLesson(lessonId);
  if (!lesson || !cls) return false;
  return cls.teacherId.toString() === teacherId.toString();
}

async function studentEnrolledInLesson(lessonId, studentId) {
  const { lesson, cls } = await resolveClassForLesson(lessonId);
  if (!lesson || !cls) return false;
  return cls.studentIds.some((id) => id.toString() === studentId.toString());
}

// ── Teacher: CRUD quizzes ─────────────────────────────────────────────────────

// GET /quizzes?lessonId=  — list quizzes for a lesson
router.get('/', requireAuth, async (req, res) => {
  try {
    const { lessonId, classId } = req.query;

    if (req.user.role === 'teacher') {
      if (!lessonId && !classId) {
        return res.status(400).json({ message: 'lessonId or classId required' });
      }
      if (lessonId) {
        const ok = await teacherOwnsLesson(lessonId, req.user._id);
        if (!ok) return res.status(403).json({ message: 'Not allowed' });
        const quizzes = await Quiz.find({ lessonId }).sort({ createdAt: 1 });
        return res.json(quizzes);
      }
      // by classId
      const cls = await Classroom.findOne({ _id: classId, teacherId: req.user._id });
      if (!cls) return res.status(403).json({ message: 'Not allowed' });
      const lessons = await Lesson.find({ classId }).select('_id');
      const lessonIds = lessons.map((l) => l._id);
      const quizzes = await Quiz.find({ lessonId: { $in: lessonIds } })
        .populate('lessonId', 'title weekNumber')
        .sort({ createdAt: -1 });
      return res.json(quizzes);
    }

    // Student: show published quizzes for lessons they're enrolled in
    if (lessonId) {
      const ok = await studentEnrolledInLesson(lessonId, req.user._id);
      if (!ok) return res.status(403).json({ message: 'Not allowed' });
      const quizzes = await Quiz.find({ lessonId, isPublished: true }).sort({ createdAt: 1 });
      // Strip correct answers for students
      return res.json(quizzes.map(safeQuiz));
    }
    // All enrolled classes
    const rooms = await Classroom.find({ studentIds: req.user._id }).select('_id');
    const classIds = rooms.map((c) => c._id);
    if (classIds.length === 0) return res.json([]);
    const lessons = await Lesson.find({ classId: { $in: classIds } }).select('_id');
    const lessonIds = lessons.map((l) => l._id);
    const quizzes = await Quiz.find({ lessonId: { $in: lessonIds }, isPublished: true })
      .populate('lessonId', 'title weekNumber')
      .sort({ createdAt: -1 });
    return res.json(quizzes.map(safeQuiz));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /quizzes/:id
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const quiz = await Quiz.findById(req.params.id).populate('lessonId', 'title');
    if (!quiz) return res.status(404).json({ message: 'Quiz not found' });

    if (req.user.role === 'teacher') {
      const ok = await teacherOwnsLesson(quiz.lessonId._id || quiz.lessonId, req.user._id);
      if (!ok) return res.status(403).json({ message: 'Not allowed' });
      return res.json(quiz);
    }

    if (!quiz.isPublished) return res.status(404).json({ message: 'Quiz not found' });
    const ok = await studentEnrolledInLesson(quiz.lessonId._id || quiz.lessonId, req.user._id);
    if (!ok) return res.status(403).json({ message: 'Not allowed' });
    res.json(safeQuiz(quiz));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /quizzes — teacher creates quiz
router.post('/', requireAuth, requireTeacher, async (req, res) => {
  try {
    const { lessonId, title, description, questions, isPublished } = req.body;
    if (!lessonId || !title) {
      return res.status(400).json({ message: 'lessonId and title are required' });
    }
    const ok = await teacherOwnsLesson(lessonId, req.user._id);
    if (!ok) return res.status(403).json({ message: 'Not allowed' });

    const quiz = await Quiz.create({
      lessonId,
      title: title.trim(),
      description: description?.trim() || '',
      questions: sanitizeQuestions(questions || []),
      isPublished: Boolean(isPublished),
    });
    res.status(201).json(quiz);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PUT /quizzes/:id — teacher updates quiz
router.put('/:id', requireAuth, requireTeacher, async (req, res) => {
  try {
    const quiz = await Quiz.findById(req.params.id);
    if (!quiz) return res.status(404).json({ message: 'Quiz not found' });
    const ok = await teacherOwnsLesson(quiz.lessonId, req.user._id);
    if (!ok) return res.status(403).json({ message: 'Not allowed' });

    const { title, description, questions, isPublished } = req.body;
    if (title != null) quiz.title = title.trim();
    if (description != null) quiz.description = description.trim();
    if (questions != null) quiz.questions = sanitizeQuestions(questions);
    if (isPublished != null) quiz.isPublished = Boolean(isPublished);

    await quiz.save();
    res.json(quiz);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE /quizzes/:id — teacher deletes quiz + all attempts
router.delete('/:id', requireAuth, requireTeacher, async (req, res) => {
  try {
    const quiz = await Quiz.findById(req.params.id);
    if (!quiz) return res.status(404).json({ message: 'Quiz not found' });
    const ok = await teacherOwnsLesson(quiz.lessonId, req.user._id);
    if (!ok) return res.status(403).json({ message: 'Not allowed' });

    await QuizAttempt.deleteMany({ quizId: quiz._id });
    await Quiz.findByIdAndDelete(quiz._id);
    res.json({ message: 'Quiz deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── Attempts ─────────────────────────────────────────────────────────────────

// POST /quizzes/:id/attempt — student submits answers (one attempt per student per quiz)
router.post('/:id/attempt', requireAuth, async (req, res) => {
  try {
    if (req.user.role !== 'student') {
      return res.status(403).json({ message: 'Only students can attempt quizzes' });
    }
    const quiz = await Quiz.findById(req.params.id);
    if (!quiz || !quiz.isPublished) return res.status(404).json({ message: 'Quiz not found' });
    const ok = await studentEnrolledInLesson(quiz.lessonId, req.user._id);
    if (!ok) return res.status(403).json({ message: 'Not enrolled' });

    // Prevent retakes — one attempt per student per quiz
    const existing = await QuizAttempt.findOne({ quizId: quiz._id, studentId: req.user._id });
    if (existing) {
      return res.status(409).json({ message: 'You have already attempted this quiz.' });
    }

    const { answers = [] } = req.body; // [{ questionId, answer }]

    let score = 0;
    const maxScore = quiz.questions.reduce((s, q) => s + (q.points || 1), 0);

    const scoredAnswers = quiz.questions.map((q) => {
      const submitted = answers.find((a) => a.questionId?.toString() === q._id.toString());
      const studentAns = (submitted?.answer ?? '').toString().trim().toLowerCase();
      const correct = (q.correctAnswer ?? '').toString().trim().toLowerCase();
      const isCorrect = q.type === 'short' ? null : studentAns === correct;
      const pts = isCorrect ? (q.points || 1) : 0;
      if (isCorrect) score += pts;
      return {
        questionId: q._id,
        answer: submitted?.answer ?? '',
        isCorrect,
        pointsEarned: pts,
      };
    });

    const pct = maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;

    const attempt = await QuizAttempt.create({
      quizId: quiz._id,
      studentId: req.user._id,
      answers: scoredAnswers,
      score,
      maxScore,
      pct,
    });

    // Return quiz with correct answers + attempt result so student sees feedback
    const result = {
      attempt,
      quiz: quiz.toObject(), // full quiz with answers (for review)
    };
    res.status(201).json(result);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /quizzes/:id/attempts — teacher: all attempts; student: own attempt
router.get('/:id/attempts', requireAuth, async (req, res) => {
  try {
    const quiz = await Quiz.findById(req.params.id);
    if (!quiz) return res.status(404).json({ message: 'Quiz not found' });

    if (req.user.role === 'teacher') {
      const ok = await teacherOwnsLesson(quiz.lessonId, req.user._id);
      if (!ok) return res.status(403).json({ message: 'Not allowed' });
      const attempts = await QuizAttempt.find({ quizId: quiz._id })
        .populate('studentId', 'name email')
        .sort({ submittedAt: -1 });
      return res.json(attempts);
    }

    const attempt = await QuizAttempt.findOne({
      quizId: quiz._id,
      studentId: req.user._id,
    });
    res.json(attempt ? [attempt] : []);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── helpers ───────────────────────────────────────────────────────────────────

function sanitizeQuestions(questions) {
  return questions.map((q) => ({
    text: String(q.text || '').trim(),
    type: ['mcq', 'true_false', 'short'].includes(q.type) ? q.type : 'mcq',
    options: Array.isArray(q.options) ? q.options.map((o) => String(o).trim()) : [],
    correctAnswer: String(q.correctAnswer || '').trim(),
    explanation: String(q.explanation || '').trim(),
    points: Number(q.points) || 1,
  }));
}

function safeQuiz(quiz) {
  const obj = quiz.toObject ? quiz.toObject() : { ...quiz };
  obj.questions = (obj.questions || []).map((q) => {
    const { correctAnswer, explanation, ...rest } = q;
    return { ...rest, explanation }; // keep explanation but strip correctAnswer
  });
  return obj;
}

export default router;
