<?php
session_start();
$msg = $_GET['msg'] ?? '';
?>
<!DOCTYPE html>
<html lang="en" data-theme="dark">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>StudyShare | Password Reset</title>
    <link rel="stylesheet" href="css/style.css">
    <script>
        (function(){var t=localStorage.getItem('gsfc_theme')||'dark';document.documentElement.setAttribute('data-theme',t);})();
    </script>
</head>
<body>
<div class="scanlines"></div>
<div class="auth-page">
    <div class="auth-card fade-in">
        <div class="auth-logo">
            <h1 class="gradient-text" style="font-size: 1.8rem;">StudyShare</h1>
            <p style="color:var(--text-secondary);">Reset Your Password</p>
        </div>

        <div class="glass-panel">
            <?php if ($msg): ?>
                <div class="alert alert-success"><?= htmlspecialchars($msg) ?></div>
            <?php endif; ?>

            <form action="../backend/api/forgot.php" method="POST">
                <p style="margin-bottom: 1.2rem; font-size: 0.85rem; color:var(--text-muted);">
                    Enter your university email address. A password reset link will be generated.
                </p>
                <div class="form-group">
                    <label>Email Address</label>
                    <input class="form-input" type="email" name="email" required placeholder="you@gsfcuniversity.ac.in">
                </div>
                
                <button type="submit" class="cyber-btn cyber-btn-full">Send Reset Link</button>
            </form>
            
            <div style="margin-top: 1.5rem; text-align: center;">
                <a href="index.php?tab=login" class="forgot-link" style="display:inline-block;float:none;">Cancel & Return</a>
            </div>
        </div>

        <div style="text-align:center;margin-top:1.5rem;">
            <button class="theme-toggle" onclick="toggleTheme()" id="themeToggle">☀️ Light</button>
        </div>
    </div>
</div>
<script src="js/theme.js"></script>
</body>
</html>
