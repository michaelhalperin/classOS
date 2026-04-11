import api from "./axios.js";

/** Pass classId for both teacher and student to scope to a specific class. */
export const getLessons = (classId) => {
  const id = typeof classId === "string" && classId ? classId : undefined;
  const params = id ? { classId: id } : {};
  return api.get("/lessons", { params }).then((r) => r.data);
};

export const getLesson = (id) => api.get(`/lessons/${id}`).then((r) => r.data);
export const createLesson = (data) =>
  api.post("/lessons", data).then((r) => r.data);
export const updateLesson = (id, data) =>
  api.put(`/lessons/${id}`, data).then((r) => r.data);
export const deleteLesson = (id) =>
  api.delete(`/lessons/${id}`).then((r) => r.data);

/** Teacher: bulk-save new week + orderIndex for all lessons after a drag-and-drop reorder. */
export const reorderLessons = (classId, order) =>
  api.patch("/lessons/reorder", { classId, order }).then((r) => r.data);

/** Student: report seconds spent (capped server-side per request). */
export const trackLessonTime = (lessonId, seconds) =>
  api.post(`/lessons/${lessonId}/track-time`, { seconds }).then((r) => r.data);

/** Teacher: upload a file attachment to a lesson (pass a File object). */
export const uploadAttachment = (lessonId, file) => {
  const form = new FormData();
  form.append("file", file);
  return api
    .post(`/lessons/${lessonId}/attachments`, form, {
      headers: { "Content-Type": "multipart/form-data" },
    })
    .then((r) => r.data);
};

/** Teacher: delete an attachment from a lesson. */
export const deleteAttachment = (lessonId, attachId) =>
  api
    .delete(`/lessons/${lessonId}/attachments/${attachId}`)
    .then((r) => r.data);
