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
    if (redirectTo === false) return;
    if (data.role === 'admin' && redirectTo !== false) { window.location.href = '/admin/dashboard.html'; } else if (redirectTo) { window.location.href = redirectTo; }
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
        
        <div style="margin-top: auto;"></div>
        
        <a href="/profile" class="${activePage === 'profile' ? 'active' : ''}">
          <span class="nav-icon nav-icon-bounce">👤</span> Profile
        </a>
        ${user.role === 'admin' ? `
        <a href="/admin/dashboard.html" class="${activePage === 'admin' ? 'active' : ''}">
          <span class="nav-icon nav-icon-bounce">⚙️</span> Admin Panel
        </a>` : ''}
      </nav>
      <div class="sidebar-footer" style="padding: 1.5rem; background: rgba(0,0,0,0.2);">
        <div class="sidebar-user" style="margin-bottom: 1rem;">
          ${user.profile_pic 
              ? `<img src="${user.profile_pic}" class="sidebar-avatar" style="width:44px; height:44px; object-fit:cover; border-radius:12px; margin-right:12px;">` 
              : `<div class="sidebar-avatar" style="width:44px; height:44px; border-radius:12px; margin-right:12px;">${initials}</div>`
          }
          <div class="sidebar-user-info">
            <div class="name" style="font-size:0.95rem; font-weight:700;">${escHtml(user.name || 'Student')}</div>
            <div class="role" style="font-size:0.75rem; color:var(--text-muted);">${user.role === 'admin' ? 'Admin' : 'CSE Student'}</div>
          </div>
        </div>
        
        <div class="contributor-rating" style="background: rgba(124, 58, 237, 0.1); border: 1px solid rgba(124, 58, 237, 0.2); border-radius: 12px; padding: 12px; margin-bottom: 1rem; text-align: center;">
          <div style="font-size: 0.65rem; text-transform: uppercase; letter-spacing: 1px; color: var(--text-muted); margin-bottom: 4px;">Contributor Rating</div>
          <div style="font-size: 1.1rem; font-weight: 800; color: #fff;">5 <span style="color:var(--primary);">⭐</span></div>
          <div style="font-size: 0.65rem; color: var(--text-muted);">(0 Downloads)</div>
        </div>

        <button onclick="logout()" class="cyber-btn cyber-btn-ghost cyber-btn-full" style="padding: 10px; font-size: 0.85rem; border-radius: 12px;">Log Out</button>
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
