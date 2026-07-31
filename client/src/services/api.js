import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor — attach JWT token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => Promise.reject(error));

// Response interceptor — handle auth errors globally
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      // Only redirect if not already on auth pages
      if (!window.location.pathname.includes('/login') && !window.location.pathname.includes('/signup')) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  signup: (data) => api.post('/auth/signup', data),
  login: (data) => api.post('/auth/login', data),
  getProfile: () => api.get('/auth/profile'),
};

// Resume API
export const resumeAPI = {
  upload: (formData, onProgress) =>
    api.post('/resumes/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: onProgress,
    }),
  get: (id) => api.get(`/resumes/${id}`),
  list: (page = 1, limit = 20) => api.get(`/resumes?page=${page}&limit=${limit}`),
  delete: (id) => api.delete(`/resumes/${id}`),
};

// Job Description API
export const jobAPI = {
  create: (data) => api.post('/jobs', data),
  get: (id) => api.get(`/jobs/${id}`),
  list: (page = 1, limit = 20) => api.get(`/jobs?page=${page}&limit=${limit}`),
};

// Score API
export const scoreAPI = {
  create: (data) => api.post('/scores', data),
  get: (id) => api.get(`/scores/${id}`),
  getHistory: (resumeId, page = 1, limit = 20) =>
    api.get(`/scores/resume/${resumeId}/history?page=${page}&limit=${limit}`),
};

export default api;