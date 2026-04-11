import api from "./axios.js";

/** Pass classId for both teacher and student to scope to a specific class. */
export const getAssignments = (classId) => {
  const params = classId ? { classId } : {};
  return api.get("/assignments", { params }).then((r) => r.data);
};

export const getAssignment = (id) =>
  api.get(`/assignments/${id}`).then((r) => r.data);
export const createAssignment = (data) =>
  api.post("/assignments", data).then((r) => r.data);
export const updateAssignment = (id, data) =>
  api.put(`/assignments/${id}`, data).then((r) => r.data);
export const deleteAssignment = (id) =>
  api.delete(`/assignments/${id}`).then((r) => r.data);
