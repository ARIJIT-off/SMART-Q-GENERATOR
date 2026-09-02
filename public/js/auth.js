/**
 * auth.js — Auth guards for HTML pages
 * Include AFTER api.js on any protected page.
 */

function requireAuth() {
 if (!isLoggedIn()) {
 window.location.href = '/login.html';
 return null;
 }
 return getUser();
}

function requireRole(role) {
 const user = requireAuth();
 if (!user) return null;
 if (user.role !== role) {
 // Wrong role — redirect to the right dashboard
 window.location.href = user.role === 'admin' ? '/admin.html' : '/student.html';
 return null;
 }
 return user;
}

function logout() {
 clearAuth();
 window.location.href = '/login.html';
}

// Render user chip in navbar
function renderUserChip(selector = '#user-chip') {
 const user = getUser();
 const el = document.querySelector(selector);
 if (el && user) {
 el.innerHTML = `Logged in as <b>${user.name || user.email}</b>`;
 }
}
