import api from './axios.js';

export const loginUser = (data) => api.post('/auth/login', data).then((r) => r.data);
export const registerUser = (data) => api.post('/auth/register', data).then((r) => r.data);

function normalizeUser(payload) {
  const u = payload;
  const id = u.id ?? u._id;
  return {
    id: typeof id === 'string' ? id : id?.toString?.() ?? id,
    name: u.name,
    email: u.email,
    role: u.role,
    createdAt: u.createdAt,
  };
}

export const getCurrentUser = () =>
  api.get('/auth/me').then((r) => normalizeUser(r.data));

export const updateCurrentUser = (data) =>
  api.patch('/auth/me', data).then((r) => normalizeUser(r.data));

/** Permanently delete the signed-in account (requires correct password). */
export const deleteAccount = (password) =>
  api.delete('/auth/me', { data: { password } }).then((r) => r.data);
