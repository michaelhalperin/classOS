import api from './axios.js';

export const getQuizzes = (params) =>
  api.get('/quizzes', { params }).then((r) => r.data);

export const getQuiz = (id) =>
  api.get(`/quizzes/${id}`).then((r) => r.data);

export const createQuiz = (data) =>
  api.post('/quizzes', data).then((r) => r.data);

export const updateQuiz = (id, data) =>
  api.put(`/quizzes/${id}`, data).then((r) => r.data);

export const deleteQuiz = (id) =>
  api.delete(`/quizzes/${id}`).then((r) => r.data);

export const submitQuizAttempt = (quizId, answers) =>
  api.post(`/quizzes/${quizId}/attempt`, { answers }).then((r) => r.data);

export const getQuizAttempts = (quizId) =>
  api.get(`/quizzes/${quizId}/attempts`).then((r) => r.data);
