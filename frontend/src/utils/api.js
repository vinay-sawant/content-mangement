import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API_BASE = `${BACKEND_URL}/api`;

const api = axios.create({
  baseURL: API_BASE,
});

// Add token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/';
    }
    return Promise.reject(error);
  }
);

export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (email, password) =>
    api.post('/auth/login', new URLSearchParams({ username: email, password }), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    }),
  getMe: () => api.get('/auth/me'),
};

export const documentsAPI = {
  upload: (formData) => api.post('/documents/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  getMy: () => api.get('/documents/my'),
  getShared: () => api.get('/documents/shared'),
  getById: (id) => api.get(`/documents/${id}`),
  download: (id) => api.get(`/documents/${id}/download`, { responseType: 'blob' }),
  delete: (id) => api.delete(`/documents/${id}`),
};

export const permissionsAPI = {
  request: (data) => api.post('/permissions/request', data),
  grant: (data) => api.post('/permissions/grant', data),
  getIncoming: () => api.get('/permissions/incoming'),
  getOutgoing: () => api.get('/permissions/outgoing'),
};

export const activityAPI = {
  getLogs: (documentId) => api.get('/activity/logs', { params: { document_id: documentId } }),
  getSummary: () => api.get('/activity/summary'),
  logView: (documentId, durationSeconds) =>
    api.post('/activity/log-view', null, {
      params: { document_id: documentId, duration_seconds: durationSeconds },
    }),
};

export default api;
