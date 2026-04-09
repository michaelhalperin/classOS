import api from './axios.js';

export const tutorChat = (lessonId, messages) =>
  api.post('/ai/tutor', { lessonId, messages }).then((r) => r.data);

export const codeHint = (payload) =>
  api.post('/ai/code-hint', payload).then((r) => r.data);

export const generateDrills = (lessonId) =>
  api.post('/ai/drills/generate', { lessonId }).then((r) => r.data);

export const checkDrill = (drill, userAnswer) =>
  api.post('/ai/drills/check', { drill, userAnswer }).then((r) => r.data);

export const getLessonInsights = (lessonId) =>
  api.get(`/ai/insights/${lessonId}`).then((r) => r.data);

export const polishLesson = (lessonId, mode) =>
  api.post('/ai/polish', { lessonId, mode }).then((r) => r.data);

export const generateQuizFromLesson = (lessonId, questionCount = 8) =>
  api.post('/ai/generate-quiz', { lessonId, questionCount }).then((r) => r.data);

export const aiGradeSubmission = (submissionId) =>
  api.post('/ai/grade-submission', { submissionId }).then((r) => r.data);
