import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { connectDB } from './config/db.js';
import { rateLimit } from './middleware/rateLimit.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
import authRoutes from './routes/auth.js';
import classRoutes from './routes/classes.js';
import lessonRoutes from './routes/lessons.js';
import assignmentRoutes from './routes/assignments.js';
import submissionRoutes from './routes/submissions.js';
import exerciseRoutes from './routes/exercises.js';
import codeRoutes from './routes/code.js';
import questionRoutes from './routes/questions.js';
import answerRoutes from './routes/answers.js';
import aiRoutes from './routes/ai.js';
import lessonNoteRoutes from './routes/lessonNotes.js';
import quizRoutes from './routes/quizzes.js';
import calendarRoutes from './routes/calendar.js';

const app = express();
const PORT = process.env.PORT || 5001;

// Middleware
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

// Routes
app.use('/auth', authRoutes);
app.use('/classes', classRoutes);
app.use('/lessons', lessonRoutes);
app.use('/lesson-notes', lessonNoteRoutes);
app.use('/assignments', assignmentRoutes);
app.use('/submissions', submissionRoutes);
app.use('/exercises', exerciseRoutes);
// Code execution: 15 runs per minute per user
app.use('/code', rateLimit({ windowMs: 60_000, max: 15 }), codeRoutes);
app.use('/questions', questionRoutes);
app.use('/answers', answerRoutes);
// AI endpoints: 30 requests per minute per user
app.use('/ai', rateLimit({ windowMs: 60_000, max: 30 }), aiRoutes);
app.use('/quizzes', quizRoutes);
app.use('/calendar', calendarRoutes);

app.get('/health', (req, res) => res.json({ status: 'ok' }));

// Connect DB and start server
connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
  });
});
