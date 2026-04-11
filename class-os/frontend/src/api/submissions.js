import api from "./axios.js";

/** Teacher: pass classId. Student: omit classId. */
export const getSubmissions = (classId) => {
  const params = classId ? { classId } : {};
  return api.get("/submissions", { params }).then((r) => r.data);
};

export const getSubmissionsByAssignment = (assignmentId) =>
  api.get(`/submissions/by-assignment/${assignmentId}`).then((r) => r.data);
export const submitAssignment = (data) =>
  api.post("/submissions", data).then((r) => r.data);
export const saveSubmissionDraft = (data) =>
  api.put("/submissions/draft", data).then((r) => r.data);
export const gradeSubmission = (id, data) =>
  api.put(`/submissions/${id}`, data).then((r) => r.data);

/** Student: retract a finalized (but ungraded) submission back to draft state. */
export const retractSubmission = (id) =>
  api.delete(`/submissions/${id}/retract`).then((r) => r.data);
