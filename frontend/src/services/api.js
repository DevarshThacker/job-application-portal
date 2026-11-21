import axios from 'axios';

// Same-origin '/api' by default (Vite proxy in dev, reverse proxy in prod). Auth lives in an httpOnly cookie.
export const api = axios.create({ baseURL: import.meta.env.VITE_API_URL || '/api', withCredentials: true, timeout: 20000 });

export function errorMessage(err, fallback = 'Something went wrong. Please try again.') {
  if (err?.response?.data?.error) {
    const e = err.response.data.error;
    if (e.details?.length) return `${e.message}: ${e.details.map((d) => d.message).join(', ')}`;
    return e.message;
  }
  if (err?.code === 'ERR_NETWORK') return 'Cannot reach the server. Check your connection.';
  return fallback;
}

export const auth = {
  me: () => api.get('/auth/me').then((r) => r.data.data.user),
  login: (body) => api.post('/auth/login', body).then((r) => r.data.data.user),
  register: (body) => api.post('/auth/register', body).then((r) => r.data.data.user),
  logout: () => api.post('/auth/logout'),
};
export const jobsApi = {
  list: (params) => api.get('/jobs', { params }).then((r) => r.data),
  get: (id) => api.get(`/jobs/${id}`).then((r) => r.data.data),
  create: (b) => api.post('/jobs', b).then((r) => r.data.data),
  update: (id, b) => api.patch(`/jobs/${id}`, b).then((r) => r.data.data),
  remove: (id) => api.delete(`/jobs/${id}`),
};
export const appsApi = {
  apply: (b) => api.post('/applications', b).then((r) => r.data.data),
  mine: (params) => api.get('/applications/my', { params }).then((r) => r.data),
  list: (params) => api.get('/applications', { params }).then((r) => r.data),
  get: (id) => api.get(`/applications/${id}`).then((r) => r.data.data),
  setStatus: (id, b) => api.patch(`/applications/${id}/status`, b).then((r) => r.data.data),
  withdraw: (id) => api.patch(`/applications/${id}/withdraw`).then((r) => r.data.data),
};
export const resumesApi = {
  mine: () => api.get('/resumes/my').then((r) => r.data.data),
  upload: (file) => { const f = new FormData(); f.append('resume', file); return api.post('/resumes', f).then((r) => r.data.data); },
  remove: (id) => api.delete(`/resumes/${id}`),
  async download(id, fileName) {
    const res = await api.get(`/resumes/${id}/download`, { responseType: 'blob' });
    const url = URL.createObjectURL(res.data);
    const a = document.createElement('a'); a.href = url; a.download = fileName; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  },
};
export const dashApi = { get: (role) => api.get(`/dashboard/${role}`).then((r) => r.data.data) };
export const profileApi = { get: () => api.get('/profile').then((r) => r.data.data), update: (b) => api.put('/profile', b).then((r) => r.data.data) };
export const adminApi = {
  users: (params) => api.get('/admin/users', { params }).then((r) => r.data),
  setActive: (id, isActive) => api.patch(`/admin/users/${id}`, { isActive }).then((r) => r.data.data),
};
