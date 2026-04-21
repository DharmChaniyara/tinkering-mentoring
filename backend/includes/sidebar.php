<?php
// Reusable Sidebar Component
// Usage: include 'includes/sidebar.php'; (set $active_page before including)
$user_name = $_SESSION['user_name'] ?? 'Student';
$user_initials = strtoupper(substr($user_name, 0, 2));
?>
<button class="sidebar-toggle" id="sidebarToggle" aria-label="Toggle Menu">☰</button>
<div class="sidebar-overlay" id="sidebarOverlay"></div>

<aside class="sidebar" id="sidebar">
    <a href="dashboard.php" class="sidebar-logo">
        <div class="logo-icon">SS</div>
        <div class="logo-text-wrap">
            <div class="logo-text">Study<span>Share</span></div>
            <div class="logo-tagline">Your Campus Brain</div>
        </div>
    </a>

    <nav class="sidebar-nav">
        <a href="dashboard.php" class="<?= ($active_page ?? '') === 'dashboard' ? 'active' : '' ?>">
            <span class="nav-icon nav-icon-bounce">🏠</span> Home
        </a>
        <a href="#" onclick="openModal(); return false;" class="<?= ($active_page ?? '') === 'upload' ? 'active' : '' ?>">
            <span class="nav-icon nav-icon-bounce">📤</span> Upload
        </a>
        <a href="dashboard.php#subjects" class="<?= ($active_page ?? '') === 'resources' ? 'active' : '' ?>">
            <span class="nav-icon nav-icon-bounce">📚</span> Resources
        </a>
        <a href="#" class="">
            <span class="nav-icon nav-icon-bounce">🔖</span> Bookmarks
        </a>
        <a href="#" class="">
            <span class="nav-icon nav-icon-bounce">👤</span> Profile
        </a>
    </nav>

    <div class="sidebar-footer">
        <div class="sidebar-user">
            <div class="sidebar-avatar"><?= htmlspecialchars($user_initials) ?></div>
            <div class="sidebar-user-info">
                <div class="name"><?= htmlspecialchars($user_name) ?></div>
                <div class="role">CSE Student</div>
            </div>
        </div>
        <a href="../backend/api/logout.php" class="cyber-btn cyber-btn-ghost cyber-btn-full" style="margin-top:8px; font-size:0.8rem;">
            Log Out
        </a>
    </div>
</aside>
