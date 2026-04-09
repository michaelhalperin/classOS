import api from './axios.js';

/** Roster for a class (teacher). */
export const getStudents = (classId) =>
  api.get('/auth/students', { params: { classId } }).then((r) => r.data);

export const getStudent = (id) => api.get(`/auth/students/${id}`).then((r) => r.data);

/** Legacy global create — prefer addStudentToClass from api/classes.js */
export const createStudent = (data) => api.post('/auth/students', data).then((r) => r.data);

export const updateStudent = (id, data) => api.patch(`/auth/students/${id}`, data).then((r) => r.data);

/** Permanently delete student account (removed from all classes). */
export const deleteStudent = (id) => api.delete(`/auth/students/${id}`).then((r) => r.data);
