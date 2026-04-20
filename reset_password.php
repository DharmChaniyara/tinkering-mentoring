<?php
require_once 'db_connect.php';

$token = $_GET['token'] ?? '';
$error = '';
$success = '';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $token = $_POST['token'] ?? '';
    $password = $_POST['password'] ?? '';
    $confirm = $_POST['confirm'] ?? '';

    if (strlen($password) < 8) {
        $error = "Auth key must be at least 8 characters.";
    } elseif ($password !== $confirm) {
        $error = "Auth keys do not match.";
    } else {
        // Verify token again before saving
        $stmt = $conn->prepare("SELECT user_id FROM password_reset_tokens WHERE token = ? AND expires_at > NOW() AND used = 0");
        $stmt->bind_param("s", $token);
        $stmt->execute();
        $reset = $stmt->get_result()->fetch_assoc();
        
        if ($reset) {
            $hash = password_hash($password, PASSWORD_BCRYPT);
            $conn->query("UPDATE users SET password_hash = '$hash' WHERE id = {$reset['user_id']}");
            $conn->query("UPDATE password_reset_tokens SET used = 1 WHERE token = '$token'");
            $success = "Authorization overwritten successfully.";
        } else {
            $error = "Token expired or already used.";
        }
    }
} else {
    // Initial load check
    if (!$token) {
        $error = "Missing reset token.";
    } else {
        $stmt = $conn->prepare("SELECT id FROM password_reset_tokens WHERE token = ? AND expires_at > NOW() AND used = 0");
        $stmt->bind_param("s", $token);
        $stmt->execute();
        if ($stmt->get_result()->num_rows === 0) {
            $error = "Invalid or expired reset token.";
        }
    }
}
?>
<!DOCTYPE html>
<html lang="en" data-theme="dark">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>StudyShare | Reset Password</title>
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
            <p style="color:var(--text-secondary);">Set new password</p>
        </div>

        <div class="glass-panel">
            <?php if ($error): ?>
                <div class="alert alert-error"><?= htmlspecialchars($error) ?></div>
                <div style="text-align: center;"><a href="index.php" class="cyber-btn">Return Login</a></div>
            <?php elseif ($success): ?>
                <div class="alert alert-success"><?= htmlspecialchars($success) ?></div>
                <div style="text-align: center;"><a href="index.php?tab=login" class="cyber-btn cyber-btn-success">Go to Login</a></div>
            <?php else: ?>
                <form action="reset_password.php" method="POST">
                    <input type="hidden" name="token" value="<?= htmlspecialchars($token) ?>">
                    
                    <div class="form-group">
                        <label>New Password</label>
                        <input class="form-input" type="password" name="password" minlength="8" required placeholder="••••••••">
                    </div>

                    <div class="form-group">
                        <label>Confirm Password</label>
                        <input class="form-input" type="password" name="confirm" minlength="8" required placeholder="••••••••">
                    </div>
                    
                    <button type="submit" class="cyber-btn cyber-btn-success cyber-btn-full">Update Password</button>
                </form>
            <?php endif; ?>
        </div>
        <div style="text-align:center;margin-top:1.5rem;">
            <button class="theme-toggle" onclick="toggleTheme()" id="themeToggle">☀️ Light</button>
        </div>
    </div>
</div>
<script src="js/theme.js"></script>
</body>
</html>
