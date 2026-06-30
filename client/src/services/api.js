import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor — attach JWT token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('docassist_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor — handle 401 redirect
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('docassist_token');
      localStorage.removeItem('docassist_user');
      if (window.location.pathname !== '/login' && window.location.pathname !== '/signup') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// ---- Auth ----
export const signup = (email, password, name) =>
  api.post('/api/auth/signup', { email, password, name }).then((r) => r.data);

export const login = (email, password) =>
  api.post('/api/auth/login', { email, password }).then((r) => r.data);

// ---- Workspaces ----
export const getWorkspaces = () =>
  api.get('/api/workspaces').then((r) => r.data);

export const createWorkspace = (name) =>
  api.post('/api/workspaces', { name }).then((r) => r.data);

// ---- Documents ----
export const getDocuments = (workspaceId) =>
  api.get('/api/documents', { params: { workspace_id: workspaceId } }).then((r) => r.data);

export const uploadDocument = (workspaceId, file) => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('workspace_id', workspaceId);
  return api
    .post('/api/documents/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    .then((r) => r.data);
};

export const deleteDocument = (documentId) =>
  api.delete(`/api/documents/${documentId}`).then((r) => r.data);

// ---- Chat ----
export const sendMessage = (workspaceId, message) =>
  api.post('/api/chat', { message, workspace_id: workspaceId }).then((r) => r.data);

export const getChatHistory = (workspaceId) =>
  api.get('/api/chat/history', { params: { workspace_id: workspaceId } }).then((r) => r.data);

export const clearChatHistory = (workspaceId) =>
  api.delete('/api/chat/history', { params: { workspace_id: workspaceId } }).then((r) => r.data);

// ---- Tool Calls ----
export const getToolCalls = (workspaceId) =>
  api.get('/api/tool-calls', { params: { workspace_id: workspaceId } }).then((r) => r.data);

// ---- Tasks ----
export const getTasks = (workspaceId) =>
  api.get('/api/tasks', { params: { workspace_id: workspaceId } }).then((r) => r.data);

export default api;
