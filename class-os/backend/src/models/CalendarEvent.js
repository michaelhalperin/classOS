import mongoose from "mongoose";

const calendarEventSchema = new mongoose.Schema({
  classId: {
    type: mongoose.Types.ObjectId,
    ref: "Classroom",
    required: true,
    index: true,
  },
  title: { type: String, required: true, trim: true },
  description: { type: String, default: "" },
  type: {
    type: String,
    enum: ["lesson", "assignment", "custom"],
    required: true,
  },
  // refId links to a Lesson or Assignment document (auto-synced events)
  refId: { type: mongoose.Types.ObjectId, default: null },
  startDate: { type: Date, required: true, index: true },
  endDate: { type: Date, default: null },
  allDay: { type: Boolean, default: true },
  color: { type: String, default: "" },
  createdBy: { type: mongoose.Types.ObjectId, ref: "User", required: true },
  createdAt: { type: Date, default: Date.now },
});

// Compound index for efficient per-class queries sorted by date
calendarEventSchema.index({ classId: 1, startDate: 1 });

// Unique index to prevent duplicate auto-synced events for the same lesson/assignment
calendarEventSchema.index(
  { classId: 1, refId: 1, type: 1 },
  { unique: true, partialFilterExpression: { refId: { $ne: null } } },
);

export default mongoose.model("CalendarEvent", calendarEventSchema);
