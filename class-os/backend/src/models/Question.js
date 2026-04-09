import mongoose from 'mongoose';

const questionSchema = new mongoose.Schema({
  lessonId: { type: mongoose.Types.ObjectId, ref: 'Lesson', required: true },
  authorId: { type: mongoose.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, required: true, trim: true },
  body: { type: String, required: true },
  isPinned: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.model('Question', questionSchema);
