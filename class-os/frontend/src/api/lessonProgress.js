import api from "./axios.js";

export function getCompletedLessonIds() {
  return api.get("/auth/me/completed-lessons").then((r) => r.data);
}

export function patchLessonCompleted(lessonId, completed) {
  return api
    .patch("/auth/me/completed-lessons", { lessonId, completed })
    .then((r) => r.data);
}

export function syncLegacyCompletedLessons(lessonIds) {
  return api
    .post("/auth/me/completed-lessons/sync", { lessonIds })
    .then((r) => r.data);
}
