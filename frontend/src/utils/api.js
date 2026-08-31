import axios from 'axios';

// In production: VITE_API_URL = https://your-backend.vercel.app
// In development: falls back to Vite proxy (/api → localhost:5000)
const BASE_URL = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/api`
  : '/api';

const api = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 120000, // 2 min for MCQ generation
});

// Attach JWT token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('qgen_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Handle auth expiry
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('qgen_token');
      localStorage.removeItem('qgen_user');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export default api;
