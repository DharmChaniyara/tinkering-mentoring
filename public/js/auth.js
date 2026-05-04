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
      <a href="/dashboard" class="sidebar-logo" style="margin-bottom: 2.5rem; display: flex; align-items: center; gap: 12px; text-decoration: none;">
        <div class="logo-wrapper" style="width: 48px; height: 48px; position: relative; display: flex; align-items: center; justify-content: center; background: linear-gradient(135deg, #6366f1, #a855f7); border-radius: 14px; box-shadow: 0 8px 16px rgba(99, 102, 241, 0.3);">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M2 17L12 22L22 17" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M2 12L12 17L22 12" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          <div style="position: absolute; top: -5px; right: -5px; background: #ff9800; width: 12px; height: 12px; border-radius: 50%; border: 2px solid #1a1a2e;"></div>
        </div>
        <div class="logo-text-wrap">
          <div class="logo-text" style="font-size: 1.5rem; font-weight: 800; color: #fff; line-height: 1;">Study<span style="color:var(--primary);">Share</span></div>
          <div class="logo-tagline" style="font-size: 0.7rem; color: var(--text-muted); text-transform: uppercase; letter-spacing: 1px; margin-top: 4px;">Your Campus Brain</div>
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
