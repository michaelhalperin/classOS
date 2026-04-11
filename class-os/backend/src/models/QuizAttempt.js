import mongoose from "mongoose";

const answerSchema = new mongoose.Schema(
  {
    questionId: { type: mongoose.Schema.Types.ObjectId, required: true },
    answer: { type: String, default: "" },
    isCorrect: { type: Boolean },
    pointsEarned: { type: Number, default: 0 },
  },
  { _id: false },
);

const attemptSchema = new mongoose.Schema({
  quizId: { type: mongoose.Schema.Types.ObjectId, ref: "Quiz", required: true },
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  answers: [answerSchema],
  score: { type: Number }, // total points earned
  maxScore: { type: Number }, // total possible points
  pct: { type: Number }, // 0-100
  submittedAt: { type: Date, default: Date.now },
});

attemptSchema.index({ quizId: 1, studentId: 1 });

export default mongoose.model("QuizAttempt", attemptSchema);
