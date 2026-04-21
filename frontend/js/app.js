/* ================================================================
   StudyShare | Main Application JS v5.0
   Carousel Control, Ripple Effects, Sidebar Toggle, Animations
   ================================================================ */

// -------  CAROUSEL SCROLLING  -------
function scrollCarousel(id, direction) {
    const track = document.getElementById('carousel-' + id);
    if (!track) return;
    const cardWidth = track.querySelector('.subject-card, .resource-card')?.offsetWidth || 300;
    const scrollAmount = (cardWidth + 16) * 2; // scroll 2 cards
    track.scrollBy({ left: direction * scrollAmount, behavior: 'smooth' });
}

// -------  BUTTON RIPPLE EFFECT  -------
document.addEventListener('click', function(e) {
    const btn = e.target.closest('.cyber-btn');
    if (!btn) return;

    const ripple = document.createElement('span');
    ripple.className = 'ripple';
    const rect = btn.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    ripple.style.width = ripple.style.height = size + 'px';
    ripple.style.left = (e.clientX - rect.left - size / 2) + 'px';
    ripple.style.top = (e.clientY - rect.top - size / 2) + 'px';
    btn.appendChild(ripple);
    ripple.addEventListener('animationend', () => ripple.remove());
});

// -------  SIDEBAR TOGGLE (Mobile)  -------
document.addEventListener('DOMContentLoaded', function() {
    const sidebar = document.getElementById('sidebar');
    const toggle = document.getElementById('sidebarToggle');
    const overlay = document.getElementById('sidebarOverlay');

    if (toggle && sidebar) {
        toggle.addEventListener('click', () => {
            sidebar.classList.toggle('open');
            overlay?.classList.toggle('active');
        });

        overlay?.addEventListener('click', () => {
            sidebar.classList.remove('open');
            overlay.classList.remove('active');
        });
    }

    // -------  SCROLL-BASED FADE-IN ANIMATIONS  -------
    const observerOptions = { threshold: 0.1, rootMargin: '0px 0px -50px 0px' };
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);

    document.querySelectorAll('.carousel-section, .stat-card, .note-card').forEach(el => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(20px)';
        el.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
        observer.observe(el);
    });

    // Add visible class styles
    const style = document.createElement('style');
    style.textContent = '.visible { opacity: 1 !important; transform: translateY(0) !important; }';
    document.head.appendChild(style);

    // -------  KEYBOARD SHORTCUTS  -------
    document.addEventListener('keydown', function(e) {
        // Ctrl+K = Focus search
        if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
            e.preventDefault();
            document.getElementById('globalSearch')?.focus();
        }
        // Escape = Close modals
        if (e.key === 'Escape') {
            document.getElementById('uploadModal')?.classList.remove('open');
            document.getElementById('aiChatPanel')?.classList.remove('open');
            document.getElementById('docViewerOverlay')?.classList.remove('open');
        }
    });

    // -------  HORIZONTAL SCROLLING FOR CAROUSELS  -------
    document.querySelectorAll('.carousel-track').forEach(track => {
        track.setAttribute('tabindex', '0'); // Make focusable
        track.addEventListener('wheel', function(e) {
            if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) return; // Already horizontal scroll
            e.preventDefault();
            track.scrollLeft += e.deltaY * 2; // Scroll horizontally with vertical wheel
        }, { passive: false });

        // Keyboard navigation
        track.addEventListener('keydown', function(e) {
            if (e.key === 'ArrowLeft') {
                e.preventDefault();
                const cardWidth = track.querySelector('.subject-card, .resource-card')?.offsetWidth || 300;
                const scrollAmount = cardWidth + 16; // scroll 1 card
                track.scrollBy({ left: -scrollAmount, behavior: 'smooth' });
            } else if (e.key === 'ArrowRight') {
                e.preventDefault();
                const cardWidth = track.querySelector('.subject-card, .resource-card')?.offsetWidth || 300;
                const scrollAmount = cardWidth + 16; // scroll 1 card
                track.scrollBy({ left: scrollAmount, behavior: 'smooth' });
            }
        });
    });
});
