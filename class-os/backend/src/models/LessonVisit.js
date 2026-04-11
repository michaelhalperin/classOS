import mongoose from "mongoose";

const lessonVisitSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  lessonId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Lesson",
    required: true,
  },
  totalSeconds: { type: Number, default: 0 },
  lastOpenedAt: { type: Date, default: Date.now },
});

lessonVisitSchema.index({ userId: 1, lessonId: 1 }, { unique: true });

export default mongoose.model("LessonVisit", lessonVisitSchema);
