import mongoose from 'mongoose';
import LessonNote from '../models/LessonNote.js';

export async function connectDB() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('MongoDB connected');
    try {
      await LessonNote.syncIndexes();
    } catch (e) {
      console.warn('LessonNote.syncIndexes:', e.message);
    }
  } catch (err) {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  }
}
