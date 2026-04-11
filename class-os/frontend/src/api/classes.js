import api from "./axios.js";

export const getClasses = () => api.get("/classes").then((r) => r.data);
export const getClass = (id) => api.get(`/classes/${id}`).then((r) => r.data);
export const getClassInsights = (id) =>
  api.get(`/classes/${id}/insights`).then((r) => r.data);
export const createClass = (data) =>
  api.post("/classes", data).then((r) => r.data);
export const updateClass = (id, data) =>
  api.patch(`/classes/${id}`, data).then((r) => r.data);
export const deleteClass = (id) =>
  api.delete(`/classes/${id}`).then((r) => r.data);

export const addStudentToClass = (classId, data) =>
  api.post(`/classes/${classId}/students`, data).then((r) => r.data);

export const removeStudentFromClass = (classId, studentId) =>
  api.delete(`/classes/${classId}/students/${studentId}`).then((r) => r.data);

export const deleteStudentAccountFromClassFlow = (studentId) =>
  api.delete(`/auth/students/${studentId}`).then((r) => r.data);
