import mongoose from 'mongoose';

/** Multiple notes per student per lesson (rich HTML in `content`). */
const lessonNoteSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    lessonId: { type: mongoose.Schema.Types.ObjectId, ref: 'Lesson', required: true },
    title: { type: String, default: '' },
    content: { type: String, default: '' },
  },
  { timestamps: true }
);

lessonNoteSchema.index({ userId: 1, lessonId: 1 });

export default mongoose.model('LessonNote', lessonNoteSchema);
