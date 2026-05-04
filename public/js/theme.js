const THEME_KEY = 'gsfc_theme';
function getTheme() { return localStorage.getItem(THEME_KEY) || 'dark'; }
function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem(THEME_KEY, theme);
    const btn = document.getElementById('themeToggle');
    if (btn) { btn.innerHTML = theme === 'dark' ? '☀️ Light' : '🌙 Dark'; btn.setAttribute('aria-label', 'Switch to ' + (theme === 'dark' ? 'light' : 'dark') + ' mode'); }
}
function toggleTheme() { applyTheme(getTheme() === 'dark' ? 'light' : 'dark'); }
(function () { const t = localStorage.getItem(THEME_KEY) || 'dark'; document.documentElement.setAttribute('data-theme', t); })();
document.addEventListener('DOMContentLoaded', () => {
    applyTheme(getTheme());
    const hamburger = document.getElementById('hamburger'), mobileMenu = document.getElementById('mobileMenu');
    if (hamburger && mobileMenu) { hamburger.addEventListener('click', () => mobileMenu.classList.toggle('open')); }
});

// -------  GLOBAL NOTIFICATION SYSTEM  -------
function showToast(message, type = 'info') {
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    const icons = { success: '✅', error: '❌', info: 'ℹ️' };
    toast.innerHTML = `
        <span class="toast-icon">${icons[type] || 'ℹ️'}</span>
        <span class="toast-message">${message}</span>
    `;

    container.appendChild(toast);
    
    // Trigger reflow for animation
    toast.offsetHeight;
    toast.classList.add('show');

    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 400);
    }, 4000);
}
