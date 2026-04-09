import mongoose from 'mongoose';

const attachmentSchema = new mongoose.Schema(
  {
    filename: { type: String, required: true },   // original name
    storedName: { type: String, required: true },  // name on disk (uuid)
    mimetype: { type: String, default: '' },
    size: { type: Number, default: 0 },
    uploadedAt: { type: Date, default: Date.now },
  },
  { _id: true }
);

const lessonSchema = new mongoose.Schema({
  classId: { type: mongoose.Schema.Types.ObjectId, ref: 'Classroom', required: true, index: true },
  title: { type: String, required: true, trim: true },
  content: { type: String, default: '' }, // markdown string
  /** Optional learning objectives (bullet list or prose) — used by AI tutor & drills */
  objectives: { type: String, default: '' },
  /** Optional markdown for teachers (e.g. AI misconception warnings); shown on student lesson page */
  misconceptionWarnings: { type: String, default: '' },
  weekNumber: { type: Number, required: true },
  orderIndex: { type: Number, required: true },
  attachments: { type: [attachmentSchema], default: [] },
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.model('Lesson', lessonSchema);
