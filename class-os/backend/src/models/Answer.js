import mongoose from 'mongoose';

const answerSchema = new mongoose.Schema({
  questionId: { type: mongoose.Types.ObjectId, ref: 'Question', required: true },
  authorId: { type: mongoose.Types.ObjectId, ref: 'User', required: true },
  body: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.model('Answer', answerSchema);
