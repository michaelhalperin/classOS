import api from "./axios.js";

export const getQuestions = (lessonId) =>
  api.get("/questions", { params: { lessonId } }).then((r) => r.data);
export const createQuestion = (data) =>
  api.post("/questions", data).then((r) => r.data);
export const pinQuestion = (id) =>
  api.put(`/questions/${id}/pin`).then((r) => r.data);
export const deleteQuestion = (id) =>
  api.delete(`/questions/${id}`).then((r) => r.data);

export const getAnswers = (questionId) =>
  api.get("/answers", { params: { questionId } }).then((r) => r.data);
export const createAnswer = (data) =>
  api.post("/answers", data).then((r) => r.data);
export const deleteAnswer = (id) =>
  api.delete(`/answers/${id}`).then((r) => r.data);
