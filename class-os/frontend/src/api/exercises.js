import api from './axios.js';

/**
 * Teacher: pass { classId } for full list, or { lessonId } to filter one lesson.
 * Student: omit params or { lessonId }.
 */
export const getExercises = (opts = {}) => {
  const params = {};
  if (opts.lessonId) params.lessonId = opts.lessonId;
  else if (opts.classId) params.classId = opts.classId;
  return api.get('/exercises', { params }).then((r) => r.data);
};

export const getExercise = (id) => api.get(`/exercises/${id}`).then((r) => r.data);
export const createExercise = (data) => api.post('/exercises', data).then((r) => r.data);
export const updateExercise = (id, data) => api.put(`/exercises/${id}`, data).then((r) => r.data);
export const deleteExercise = (id) => api.delete(`/exercises/${id}`).then((r) => r.data);
export const runCode = (data) => api.post('/code/run', data).then((r) => r.data);
