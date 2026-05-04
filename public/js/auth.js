const SS_TOKEN_KEY = 'ss_token';
function getToken() { return localStorage.getItem(SS_TOKEN_KEY); }
function getAuthHeaders() { return { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getToken()}` }; }
function getUser() {
  const token = getToken();
  if (!token) return null;
  try { return JSON.parse(atob(token.split('.')[1])); } catch { return null; }
}
function requireAuth() {
  const user = getUser();
  if (!user) { window.location.href = '/'; return null; }
  return user;
}
function logout() {
  localStorage.removeItem(SS_TOKEN_KEY);
  window.location.href = '/';
}
function handleAuthResponse(data, redirectTo = '/dashboard') {
  if (data.token) {
    localStorage.setItem(SS_TOKEN_KEY, data.token);
    if (data.role === 'admin') { window.location.href = '/admin/dashboard.html'; } else { window.location.href = redirectTo; }
  }
}
function renderSidebar(activePage = '') {
  const user = getUser();
  if (!user) return;
  const initials = (user.name || 'ST').slice(0, 2).toUpperCase();
  const html = `
    <button class="sidebar-toggle" id="sidebarToggle" aria-label="Toggle Menu">☰</button>
    <div class="sidebar-overlay" id="sidebarOverlay"></div>
    <aside class="sidebar" id="sidebar">
      <a href="/dashboard" class="sidebar-logo">
        <img src="/img/logo.png" alt="StudyShare Logo" style="height: 40px; width: auto; object-fit: contain; margin-right: 10px;" onerror="this.outerHTML='<div class=\\'logo-icon\\'>SS</div>'">
        <div class="logo-text-wrap">
          <div class="logo-text">Study<span>Share</span></div>
          <div class="logo-tagline">Your Campus Brain</div>
        </div>
      </a>
      <nav class="sidebar-nav">
        <a href="/dashboard" class="${activePage === 'dashboard' ? 'active' : ''}">
          <span class="nav-icon nav-icon-bounce">🏠</span> Home
        </a>
        <a href="#" onclick="if(document.getElementById('uploadModal'))document.getElementById('uploadModal').classList.add('open');return false;"
           class="${activePage === 'upload' ? 'active' : ''}">
          <span class="nav-icon nav-icon-bounce">📤</span> Upload
        </a>
        <a href="/dashboard#subjects" class="${activePage === 'resources' ? 'active' : ''}">
          <span class="nav-icon nav-icon-bounce">📚</span> Resources
        </a>
        <a href="#"><span class="nav-icon nav-icon-bounce">🔖</span> Bookmarks</a>
        <a href="/profile"><span class="nav-icon nav-icon-bounce">👤</span> Profile</a>
        ${user.role === 'admin' ? `
        <a href="/admin/dashboard.html" class="${activePage === 'admin' ? 'active' : ''}">
          <span class="nav-icon nav-icon-bounce">⚙️</span> Admin Panel
        </a>` : ''}
      </nav>
      <div class="sidebar-footer">
        <div class="sidebar-user">
          <div class="sidebar-avatar">${initials}</div>
          <div class="sidebar-user-info">
            <div class="name">${escHtml(user.name || 'Student')}</div>
            <div class="role">CSE Student</div>
          </div>
        </div>
        <button onclick="logout()" class="cyber-btn cyber-btn-ghost cyber-btn-full" style="margin-top:8px;font-size:0.8rem;">Log Out</button>
      </div>
    </aside>`;
  const container = document.getElementById('sidebar-container');
  if (container) {
    container.innerHTML = html;
    const sidebar = document.getElementById('sidebar'), toggle = document.getElementById('sidebarToggle'), overlay = document.getElementById('sidebarOverlay');
    toggle?.addEventListener('click', () => { sidebar?.classList.toggle('open'); overlay?.classList.toggle('active'); });
    overlay?.addEventListener('click', () => { sidebar?.classList.remove('open'); overlay?.classList.remove('active'); });
  }
}
function showAlert(msg, type = 'error') {
  const c = document.getElementById('alert-container');
  if (!c) return;
  c.innerHTML = `<div class="alert alert-${type}">${escHtml(msg)}</div>`;
  c.style.display = 'block';
}
function escHtml(str) { return String(str).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
window.getToken = getToken; window.getAuthHeaders = getAuthHeaders; window.getUser = getUser; window.requireAuth = requireAuth; window.logout = logout; window.handleAuthResponse = handleAuthResponse; window.renderSidebar = renderSidebar; window.showAlert = showAlert; window.escHtml = escHtml;
