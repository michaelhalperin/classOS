import api from "./axios.js";

/** @returns {Promise<{ notes: Array<{_id, title, content, createdAt, updatedAt}> }>} */
export function getLessonNotes(lessonId) {
  return api.get(`/lesson-notes/${lessonId}`).then((r) => r.data);
}

/** Same as {@link getLessonNotes} (`{ notes }` array). Kept so older imports don’t break. */
export const getLessonNote = getLessonNotes;

/** @returns {Promise<{ note: object }>} */
export function createLessonNote(lessonId, payload = {}) {
  return api.post(`/lesson-notes/${lessonId}`, payload).then((r) => r.data);
}

/** @returns {Promise<{ note: object }>} */
export function updateLessonNote(lessonId, noteId, payload) {
  return api
    .put(`/lesson-notes/${lessonId}/${noteId}`, payload)
    .then((r) => r.data);
}

export function deleteLessonNote(lessonId, noteId) {
  return api.delete(`/lesson-notes/${lessonId}/${noteId}`).then((r) => r.data);
}
