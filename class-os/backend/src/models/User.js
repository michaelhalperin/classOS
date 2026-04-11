import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
  },
  passwordHash: { type: String, required: true },
  role: { type: String, enum: ["teacher", "student"], required: true },
  /** Lesson IDs the student has marked complete (students only; ignored for teachers). */
  completedLessonIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "Lesson" }],
  /** Updated on each successful login (for teacher “stale activity” insights). */
  lastLoginAt: { type: Date },
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.model("User", userSchema);
