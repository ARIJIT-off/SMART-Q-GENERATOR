/**
 * api.js — Shared API client for all HTML pages
 * All fetch calls go through apiFetch() which auto-attaches the JWT token.
 */

const API_BASE = '/api';

function getToken() { return localStorage.getItem('sqg_token'); }
function getUser()  { try { return JSON.parse(localStorage.getItem('sqg_user')); } catch { return null; } }
function setAuth(token, user) {
  localStorage.setItem('sqg_token', token);
  localStorage.setItem('sqg_user', JSON.stringify(user));
}
function clearAuth() {
  localStorage.removeItem('sqg_token');
  localStorage.removeItem('sqg_user');
}
function isLoggedIn() { return !!getToken(); }

async function apiFetch(endpoint, options = {}) {
  const token = getToken();
  const headers = { 'Content-Type': 'application/json', ...options.headers };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${endpoint}`, { ...options, headers });

  // If 401, clear auth and redirect to login
  if (res.status === 401) {
    clearAuth();
    window.location.href = '/login.html';
    return;
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || `Request failed (${res.status})`);
  return data;
}

// Multipart form-data upload (for PDF)
async function apiUpload(endpoint, formData) {
  const token = getToken();
  const headers = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${API_BASE}${endpoint}`, { method: 'POST', headers, body: formData });
  if (res.status === 401) { clearAuth(); window.location.href = '/login.html'; return; }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || `Upload failed (${res.status})`);
  return data;
}

// Toast notification helper
function showToast(msg, type = 'info') {
  let toast = document.getElementById('toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'toast';
    document.body.appendChild(toast);
  }
  toast.textContent = msg;
  toast.className = `toast-${type} show`;
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => toast.classList.remove('show'), 3500);
}

// Format seconds to MM:SS
function fmtTime(sec) {
  const m = Math.floor(sec / 60), s = sec % 60;
  return `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
}

// Format seconds to human-readable
function fmtDuration(sec) {
  if (sec < 60) return `${sec}s`;
  const m = Math.floor(sec / 60), s = sec % 60;
  return s > 0 ? `${m}m ${s}s` : `${m}m`;
}
