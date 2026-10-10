// ---------- Central API client ----------
const API_BASE = 'http://localhost:5000/api';

function authHeader() {
  const token = sessionStorage.getItem('skillswap_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function api(path, { method = 'GET', body } = {}) {
  const isFormData = body instanceof FormData;
  const headers = { ...authHeader() };
  if (!isFormData) headers['Content-Type'] = 'application/json';

  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: isFormData ? body : (body ? JSON.stringify(body) : undefined)
  });

  let data = null;
  try { data = await res.json(); } catch (e) { /* no body */ }

  if (!res.ok) {
    if (res.status === 401) {
      sessionStorage.removeItem('skillswap_token');
      sessionStorage.removeItem('skillswap_user');
      if (!location.pathname.endsWith('index.html') && !location.pathname.endsWith('register.html') && location.pathname !== '/') {
        location.href = 'index.html';
      }
    }
    throw new Error((data && data.message) || `Request failed (${res.status})`);
  }
  return data;
}

function getCurrentUser() {
  try { return JSON.parse(sessionStorage.getItem('skillswap_user')); } catch (e) { return null; }
}

function saveSession(token, user) {
  sessionStorage.setItem('skillswap_token', token);
  sessionStorage.setItem('skillswap_user', JSON.stringify(user));
}

function logout() {
  sessionStorage.removeItem('skillswap_token');
  sessionStorage.removeItem('skillswap_user');
  location.href = 'index.html';
}
