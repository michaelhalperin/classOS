import mongoose from 'mongoose';

const exerciseSchema = new mongoose.Schema({
  lessonId: { type: mongoose.Types.ObjectId, ref: 'Lesson', required: true },
  title: { type: String, required: true, trim: true },
  instructions: { type: String, required: true },
  starterCode: { type: String, default: '' },
  language: { type: String, default: 'javascript' },
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.model('Exercise', exerciseSchema);
