import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '',
});

// Attach JWT from sessionStorage to every request
api.interceptors.request.use((config) => {
  const token = sessionStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// On 401 — clear token and redirect to login (but not for failed login/register;
// those return 401/400 and must not force a full page reload on the auth forms)
function isFailedAuthAttempt(config) {
  const url = config?.url || '';
  return url.includes('/auth/login') || url.includes('/auth/register');
}

api.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error.response?.status === 401 && !isFailedAuthAttempt(error.config)) {
      sessionStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
