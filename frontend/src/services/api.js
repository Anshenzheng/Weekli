import axios from 'axios';

const API_BASE_URL = '/api';

const api = axios.create({
  baseURL: API_BASE_URL,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;

export const authAPI = {
  login: (username, password) => api.post('/login', { username, password }),
  getProfile: () => api.get('/profile'),
  register: (userData) => api.post('/register', userData),
  init: () => api.get('/init'),
};

export const teamAPI = {
  getAll: () => api.get('/teams'),
  create: (data) => api.post('/teams', data),
  update: (id, data) => api.put(`/teams/${id}`, data),
  delete: (id) => api.delete(`/teams/${id}`),
};

export const userAPI = {
  getAll: (params) => api.get('/users', { params }),
  update: (id, data) => api.put(`/users/${id}`, data),
  delete: (id) => api.delete(`/users/${id}`),
};

export const reportAPI = {
  getMyReports: (params) => api.get('/reports/my', { params }),
  getMyWeekReport: (week) => api.get(`/reports/my/${week}`),
  create: (data) => api.post('/reports', data),
  getAll: (params) => api.get('/reports/all', { params }),
  getById: (id) => api.get(`/reports/${id}`),
  returnReport: (id, reason) => api.post(`/reports/${id}/return`, { reason }),
};

export const statsAPI = {
  getUnsubmitted: (params) => api.get('/submissions/unsubmitted', { params }),
  sendReminders: (data) => api.post('/reminders/send', data),
  getSubmissionStats: (params) => api.get('/stats/submissions', { params }),
};
