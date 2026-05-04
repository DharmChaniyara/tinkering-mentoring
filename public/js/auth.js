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
      <a href="/dashboard" class="sidebar-logo" style="margin-bottom: 2.5rem; display: flex; align-items: center; gap: 14px; text-decoration: none;">
        <div class="logo-wrapper" style="width: 54px; height: 54px; position: relative; display: flex; align-items: center; justify-content: center; background: rgba(255,255,255,0.03); border-radius: 16px; border: 1px solid var(--glass-border);">
          <svg width="40" height="40" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
            <!-- Graduation Cap (Yellow) -->
            <path d="M50 20L15 35L50 50L85 35L50 20Z" fill="#FFB700"/>
            <path d="M25 40V55C25 55 35 62 50 62C65 62 75 55 75 55V40" stroke="#FFB700" stroke-width="6" stroke-linecap="round"/>
            <path d="M80 37V55" stroke="#FFB700" stroke-width="4" stroke-linecap="round"/>
            <circle cx="80" cy="58" r="4" fill="#FFB700"/>
            
            <!-- Modern 'S' (Theme Responsive) -->
            <path d="M65 45C65 40 60 35 50 35C40 35 35 40 35 45C35 50 40 55 50 57C65 60 70 65 70 75C70 85 62 90 50 90C38 90 30 85 30 75" stroke="currentColor" stroke-width="12" stroke-linecap="round" style="color: var(--text-main);"/>
          </svg>
        </div>
        <div class="logo-text-wrap">
          <div class="logo-text" style="font-size: 1.6rem; font-weight: 900; color: var(--text-main); line-height: 1; letter-spacing: -0.5px;">Study<span style="color:#FFB700;">Share</span></div>
          <div class="logo-tagline" style="font-size: 0.7rem; color: var(--text-muted); text-transform: uppercase; letter-spacing: 1.5px; margin-top: 5px; font-weight: 600;">Your Campus Brain</div>
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
              ? `<img src="${user.profile_pic}" class="sidebar-avatar" style="width:44px; height:44px; object-fit:cover; border-radius:12px; margin-right:12px; border: 1px solid var(--glass-border);">` 
              : `<div class="sidebar-avatar" style="width:44px; height:44px; border-radius:12px; margin-right:12px; background: linear-gradient(135deg, #6366f1, #a855f7); display: flex; align-items: center; justify-content: center; color: #fff; font-weight: 800; font-size: 0.9rem; border: 1px solid rgba(255,255,255,0.1); flex-shrink: 0;">${initials}</div>`
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
