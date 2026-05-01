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
