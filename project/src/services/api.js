import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid
      localStorage.removeItem('authToken');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  login: (credentials) => api.post('/auth/login', credentials),
  verify: () => api.get('/auth/verify'),
  changePassword: (data) => api.post('/auth/change-password', data),
};

// Users API
export const usersAPI = {
  getAll: () => api.get('/users'),
  getById: (id) => api.get(`/users/${id}`),
  create: (userData) => api.post('/users', userData),
  update: (id, userData) => api.put(`/users/${id}`, userData),
  delete: (id) => api.delete(`/users/${id}`),
  getStats: () => api.get('/users/stats/overview'),
};

// Bodies API
export const bodiesAPI = {
  getAll: (params = {}) => api.get('/bodies', { params }),
  getById: (id) => api.get(`/bodies/${id}`),
  create: (bodyData) => api.post('/bodies', bodyData),
  update: (id, bodyData) => api.put(`/bodies/${id}`, bodyData),
  delete: (id) => api.delete(`/bodies/${id}`),
  getStats: () => api.get('/bodies/stats/overview'),
};

// Storage API
export const storageAPI = {
  getAll: (params = {}) => api.get('/storage', { params }),
  getById: (id) => api.get(`/storage/${id}`),
  updateStatus: (id, status) => api.put(`/storage/${id}/status`, { status }),
  getStats: () => api.get('/storage/stats/capacity'),
  getAvailable: (type) => api.get('/storage/available/list', { params: { type } }),
};

// Autopsies API
export const autopsiesAPI = {
  getAll: (params = {}) => api.get('/autopsies', { params }),
  getById: (id) => api.get(`/autopsies/${id}`),
  create: (autopsyData) => api.post('/autopsies', autopsyData),
  update: (id, autopsyData) => api.put(`/autopsies/${id}`, autopsyData),
  delete: (id) => api.delete(`/autopsies/${id}`),
  getStats: () => api.get('/autopsies/stats/overview'),
};

// Tasks API
export const tasksAPI = {
  getAll: (params = {}) => api.get('/tasks', { params }),
  getById: (id) => api.get(`/tasks/${id}`),
  create: (taskData) => api.post('/tasks', taskData),
  update: (id, taskData) => api.put(`/tasks/${id}`, taskData),
  delete: (id) => api.delete(`/tasks/${id}`),
  getStats: () => api.get('/tasks/stats/overview'),
  getOverdue: () => api.get('/tasks/overdue/list'),
};

// Releases API
export const releasesAPI = {
  getAll: (params = {}) => api.get('/releases', { params }),
  getById: (id) => api.get(`/releases/${id}`),
  create: (releaseData) => api.post('/releases', releaseData),
  updateStatus: (id, status, notes) => api.put(`/releases/${id}/status`, { status, notes }),
  delete: (id) => api.delete(`/releases/${id}`),
  getStats: () => api.get('/releases/stats/overview'),
};

// Notifications API
export const notificationsAPI = {
  getAll: (params = {}) => api.get('/notifications', { params }),
  getUnreadCount: () => api.get('/notifications/unread/count'),
  markAsRead: (id) => api.put(`/notifications/${id}/read`),
  markAllAsRead: () => api.put('/notifications/read-all'),
  delete: (id) => api.delete(`/notifications/${id}`),
  create: (notificationData) => api.post('/notifications', notificationData),
};

// Reports API
export const reportsAPI = {
  getOverview: (params = {}) => api.get('/reports/overview', { params }),
  getBodies: (params = {}) => api.get('/reports/bodies', { params }),
  getAutopsies: (params = {}) => api.get('/reports/autopsies', { params }),
  getTasks: (params = {}) => api.get('/reports/tasks', { params }),
  getReleases: (params = {}) => api.get('/reports/releases', { params }),
  getStorage: () => api.get('/reports/storage'),
  getPerformance: (params = {}) => api.get('/reports/performance', { params }),
};

export default api;