// ── Central API fetch wrapper with automatic JWT injection ───────────────────

import { getToken, clearAuth } from './auth.js';

const BASE = '/api'; // Proxied to http://localhost:5000 by Vite

const request = async (method, path, body = null) => {
  const token = getToken();

  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const config = { method, headers };
  if (body) config.body = JSON.stringify(body);

  const res = await fetch(`${BASE}${path}`, config);
  const data = await res.json().catch(() => ({}));

  // Auto-clear auth on 401 (expired/invalid token)
  if (res.status === 401) {
    clearAuth();
    window.location.href = '/login';
    return;
  }

  if (!res.ok) {
    throw new Error(data.error || `Request failed (${res.status})`);
  }

  return data;
};

// ── Auth ─────────────────────────────────────────────────────────────────────
export const api = {
  register: (email, password) =>
    request('POST', '/auth/register', { email, password }),

  login: (email, password) =>
    request('POST', '/auth/login', { email, password }),

  // ── Jobs ────────────────────────────────────────────────────────────────
  startResearch: (companyName) =>
    request('POST', '/jobs', { companyName }),

  getJob: (jobId) =>
    request('GET', `/jobs/${jobId}`),

  getJobStreamUrl: (jobId) => {
    const token = getToken();
    return `${BASE}/jobs/${jobId}/stream?token=${token}`;
  },

  // ── Reports ─────────────────────────────────────────────────────────────
  getMyReports: () =>
    request('GET', '/reports/me'),

  getReport: (id) =>
    request('GET', `/reports/${id}`),

  // ── Compare ──────────────────────────────────────────────────────────────
  compare: (jobIds) =>
    request('POST', '/compare', { jobIds }),
};
