import api from './axios.js';

export const getCalendarEvents = (classId) =>
  api.get(`/calendar/${classId}`).then((r) => r.data);

export const createCalendarEvent = (classId, data) =>
  api.post(`/calendar/${classId}`, data).then((r) => r.data);

export const updateCalendarEvent = (classId, eventId, data) =>
  api.put(`/calendar/${classId}/${eventId}`, data).then((r) => r.data);

export const deleteCalendarEvent = (classId, eventId) =>
  api.delete(`/calendar/${classId}/${eventId}`).then((r) => r.data);

/** Returns the public iCal feed URL for a class (no auth needed, use directly).
 *  Falls back to the current origin so it works via the Vite proxy in dev. */
export const getCalendarFeedUrl = (classId) => {
  const base = (import.meta.env.VITE_API_URL || window.location.origin).replace(/\/$/, '');
  return `${base}/calendar/${classId}/feed.ics`;
};
