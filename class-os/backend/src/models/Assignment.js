import mongoose from 'mongoose';

const assignmentSchema = new mongoose.Schema({
  lessonId: { type: mongoose.Types.ObjectId, ref: 'Lesson', required: true },
  title: { type: String, required: true, trim: true },
  instructions: { type: String, required: true },
  dueDate: { type: Date },
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.model('Assignment', assignmentSchema);
