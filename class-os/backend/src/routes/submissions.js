import express from 'express';
import mongoose from 'mongoose';
import Submission from '../models/Submission.js';
import Assignment from '../models/Assignment.js';
import Lesson from '../models/Lesson.js';
import Classroom from '../models/Classroom.js';
import { requireAuth, requireTeacher } from '../middleware/auth.js';
import { lessonIdsForClass } from '../utils/classHelpers.js';

const router = express.Router();

// GET /submissions
router.get('/', requireAuth, async (req, res) => {
  try {
    if (req.user.role === 'student') {
      const subs = await Submission.find({
        studentId: req.user._id,
        submittedAt: { $exists: true, $ne: null },
      })
        .populate('assignmentId', 'title instructions dueDate')
        .sort({ submittedAt: -1 });
      return res.json(subs);
    }

    const { classId } = req.query;
    if (!classId || !mongoose.Types.ObjectId.isValid(classId)) {
      return res.status(400).json({ message: 'classId query parameter is required' });
    }
    const cls = await Classroom.findOne({ _id: classId, teacherId: req.user._id });
    if (!cls) return res.status(403).json({ message: 'Class not found or access denied' });

    const lessonIds = await lessonIdsForClass(classId);
    if (lessonIds.length === 0) return res.json([]);

    const assignments = await Assignment.find({ lessonId: { $in: lessonIds } }).select('_id');
    const assignmentIds = assignments.map((a) => a._id);

    const subs = await Submission.find({
      assignmentId: { $in: assignmentIds },
      submittedAt: { $exists: true, $ne: null },
    })
      .populate('studentId', 'name email')
      .populate('assignmentId', 'title dueDate')
      .sort({ submittedAt: -1 });
    res.json(subs);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /submissions/by-assignment/:assignmentId — teacher sees all submissions for one assignment
router.get('/by-assignment/:assignmentId', requireAuth, requireTeacher, async (req, res) => {
  try {
    const assignment = await Assignment.findById(req.params.assignmentId);
    if (!assignment) return res.status(404).json({ message: 'Assignment not found' });
    const lesson = await Lesson.findById(assignment.lessonId);
    if (!lesson) return res.status(404).json({ message: 'Lesson not found' });
    const cls = await Classroom.findOne({ _id: lesson.classId, teacherId: req.user._id });
    if (!cls) return res.status(403).json({ message: 'Not allowed' });

    const subs = await Submission.find({
      assignmentId: req.params.assignmentId,
      submittedAt: { $exists: true, $ne: null },
    })
      .populate('studentId', 'name email')
      .sort({ submittedAt: -1 });
    res.json(subs);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PUT /submissions/draft — autosave (student); must be before /:id
router.put('/draft', requireAuth, async (req, res) => {
  try {
    if (req.user.role !== 'student') {
      return res.status(403).json({ message: 'Only students can save drafts' });
    }
    const { assignmentId, content = '', githubLink = '' } = req.body;
    if (!assignmentId) return res.status(400).json({ message: 'assignmentId required' });

    const assignment = await Assignment.findById(assignmentId);
    if (!assignment) return res.status(404).json({ message: 'Assignment not found' });
    const lesson = await Lesson.findById(assignment.lessonId);
    if (!lesson) return res.status(404).json({ message: 'Lesson not found' });
    const cls = await Classroom.findById(lesson.classId);
    if (!cls) return res.status(404).json({ message: 'Class not found' });
    const enrolled = cls.studentIds.some((id) => id.toString() === req.user._id.toString());
    if (!enrolled) return res.status(403).json({ message: 'Not enrolled in this class' });

    const now = new Date();
    let sub = await Submission.findOne({ assignmentId, studentId: req.user._id });
    if (sub?.submittedAt) {
      return res.status(400).json({ message: 'Assignment already submitted' });
    }
    if (sub) {
      sub.draftContent = String(content);
      sub.draftGithubLink = String(githubLink).trim();
      sub.draftUpdatedAt = now;
      await sub.save();
    } else {
      sub = await Submission.create({
        assignmentId,
        studentId: req.user._id,
        content: '',
        githubLink: '',
        draftContent: String(content),
        draftGithubLink: String(githubLink).trim(),
        draftUpdatedAt: now,
      });
    }
    res.json(sub);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /submissions — student submits
router.post('/', requireAuth, async (req, res) => {
  try {
    if (req.user.role !== 'student') {
      return res.status(403).json({ message: 'Only students can submit' });
    }
    const { assignmentId, content, githubLink } = req.body;
    if (!assignmentId) return res.status(400).json({ message: 'assignmentId required' });

    const assignment = await Assignment.findById(assignmentId);
    if (!assignment) return res.status(404).json({ message: 'Assignment not found' });
    const lesson = await Lesson.findById(assignment.lessonId);
    if (!lesson) return res.status(404).json({ message: 'Lesson not found' });
    const cls = await Classroom.findById(lesson.classId);
    if (!cls) return res.status(404).json({ message: 'Class not found' });
    const enrolled = cls.studentIds.some((id) => id.toString() === req.user._id.toString());
    if (!enrolled) return res.status(403).json({ message: 'Not enrolled in this class' });

    const existing = await Submission.findOne({ assignmentId, studentId: req.user._id });
    const bodyContent = content != null && content !== '' ? content : existing?.draftContent;
    const bodyGh = githubLink != null ? String(githubLink).trim() : existing?.draftGithubLink || '';

    if (existing) {
      existing.content = bodyContent != null ? String(bodyContent) : '';
      existing.githubLink = bodyGh;
      existing.submittedAt = new Date();
      existing.draftContent = '';
      existing.draftGithubLink = '';
      existing.draftUpdatedAt = undefined;
      await existing.save();
      return res.json(existing);
    }

    const sub = await Submission.create({
      assignmentId,
      studentId: req.user._id,
      content: bodyContent != null ? String(bodyContent) : '',
      githubLink: bodyGh,
      submittedAt: new Date(),
    });
    res.status(201).json(sub);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE /submissions/:id/retract — student retracts their own ungraded submission
router.delete('/:id/retract', requireAuth, async (req, res) => {
  try {
    if (req.user.role !== 'student') {
      return res.status(403).json({ message: 'Only students can retract submissions' });
    }
    const sub = await Submission.findById(req.params.id);
    if (!sub) return res.status(404).json({ message: 'Submission not found' });

    // Must be the owner
    if (sub.studentId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not allowed' });
    }
    // Can only retract if not yet graded
    if (sub.grade != null) {
      return res.status(409).json({ message: 'Cannot retract a submission that has already been graded.' });
    }
    // Must have been submitted (not just a draft)
    if (!sub.submittedAt) {
      return res.status(400).json({ message: 'Submission has not been finalized yet.' });
    }

    // Revert to draft state instead of deleting — preserves content for re-editing
    sub.submittedAt = undefined;
    sub.draftContent = sub.content;
    sub.draftGithubLink = sub.githubLink;
    sub.draftUpdatedAt = new Date();
    sub.content = '';
    sub.githubLink = '';
    await sub.save();

    res.json({ message: 'Submission retracted. You can now edit and re-submit.', submission: sub });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PUT /submissions/:id — teacher grades + feedback
router.put('/:id', requireAuth, requireTeacher, async (req, res) => {
  try {
    const { grade, feedback } = req.body;
    const sub = await Submission.findById(req.params.id);
    if (!sub) return res.status(404).json({ message: 'Submission not found' });
    const assignment = await Assignment.findById(sub.assignmentId);
    if (!assignment) return res.status(404).json({ message: 'Assignment not found' });
    const lesson = await Lesson.findById(assignment.lessonId);
    if (!lesson) return res.status(404).json({ message: 'Lesson not found' });
    const cls = await Classroom.findOne({ _id: lesson.classId, teacherId: req.user._id });
    if (!cls) return res.status(403).json({ message: 'Not allowed' });

    const updated = await Submission.findByIdAndUpdate(
      req.params.id,
      { grade, feedback },
      { new: true, runValidators: true }
    )
      .populate('studentId', 'name email')
      .populate('assignmentId', 'title');
    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;
