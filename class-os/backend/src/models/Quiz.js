import mongoose from "mongoose";

const questionSchema = new mongoose.Schema(
  {
    text: { type: String, required: true, trim: true },
    type: {
      type: String,
      enum: ["mcq", "true_false", "short"],
      required: true,
    },
    options: [{ type: String, trim: true }], // MCQ options
    correctAnswer: { type: String, trim: true }, // correct option text or 'true'/'false'
    explanation: { type: String, default: "" }, // shown after answering
    points: { type: Number, default: 1 },
  },
  { _id: true },
);

const quizSchema = new mongoose.Schema({
  lessonId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Lesson",
    required: true,
    index: true,
  },
  title: { type: String, required: true, trim: true },
  description: { type: String, default: "" },
  questions: [questionSchema],
  isPublished: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.model("Quiz", quizSchema);
