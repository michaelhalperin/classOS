import mongoose from "mongoose";

const submissionSchema = new mongoose.Schema({
  assignmentId: {
    type: mongoose.Types.ObjectId,
    ref: "Assignment",
    required: true,
  },
  studentId: { type: mongoose.Types.ObjectId, ref: "User", required: true },
  content: { type: String, default: "" },
  githubLink: { type: String, default: "" },
  /** Set only after a final submit; missing means draft-only row. */
  submittedAt: { type: Date },
  draftContent: { type: String, default: "" },
  draftGithubLink: { type: String, default: "" },
  draftUpdatedAt: { type: Date },
  grade: { type: Number, min: 0, max: 100 },
  feedback: { type: String, default: "" },
});

export default mongoose.model("Submission", submissionSchema);
