<?php
session_start();
if (isset($_SESSION['user_id'])) {
    header("Location: dashboard.php"); exit();
}

$error   = $_GET['error']   ?? '';
$success = $_GET['success'] ?? '';
$tab     = $_GET['tab']     ?? 'google';
?>
<!DOCTYPE html>
<html lang="en" data-theme="dark">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="description" content="StudyShare – log in to access and share study materials.">
    <title>StudyShare | Login</title>
    <link rel="stylesheet" href="css/style.css">
    <!-- Apply theme before render to prevent flash -->
    <script>
        (function(){var t=localStorage.getItem('gsfc_theme')||'dark';document.documentElement.setAttribute('data-theme',t);})();
    </script>
    <!-- Google Identity Services -->
    <script src="https://accounts.google.com/gsi/client" async defer></script>
</head>
<body>
<div class="scanlines"></div>

<div class="auth-page">
  <div class="auth-card fade-in">

    <div class="auth-logo">
      <h1 class="gradient-text">StudyShare</h1>
      <p style="color:var(--text-secondary);">Your creative learning and sharing space<br>
        <span class="mono" style="font-size:0.75rem;color:var(--text-muted);">GSFC University · Semester II</span>
      </p>
    </div>

    <div class="glass-panel">

      <!-- Alerts -->
      <?php if ($error): ?>
        <div class="alert alert-error">⚠ <?= htmlspecialchars($error) ?></div>
      <?php endif; ?>
      <?php if ($success): ?>
        <div class="alert alert-success">✓ <?= htmlspecialchars($success) ?></div>
      <?php endif; ?>

      <!-- Tabs -->
      <div class="auth-tabs">
        <button class="auth-tab <?= $tab==='google'   ?'active':'' ?>" onclick="switchTab('google')"   id="tab-google">🔑 Google</button>
        <button class="auth-tab <?= $tab==='login'    ?'active':'' ?>" onclick="switchTab('login')"    id="tab-login">Login</button>
        <button class="auth-tab <?= $tab==='register' ?'active':'' ?>" onclick="switchTab('register')" id="tab-register">Register</button>
      </div>

      <!-- ===== PANEL: Google ===== -->
      <div class="auth-panel <?= $tab==='google'?'active':'' ?>" id="panel-google">
        <p style="font-size:0.85rem;color:var(--text-secondary);margin-bottom:1.2rem;">
          Sign in instantly using your Google account. No password needed.
        </p>

        <!-- Google Sign-In Button (official GIS) -->
        <div id="g_id_onload"
             data-client_id="YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com"
             data-callback="handleGoogleSignIn"
             data-auto_select="false"
             data-cancel_on_tap_outside="true">
        </div>
        <div class="g_id_signin"
             data-type="standard"
             data-size="large"
             data-theme="outline"
             data-text="sign_in_with"
             data-shape="rectangular"
             data-logo_alignment="left"
             style="display:flex;justify-content:center;margin:1rem 0;">
        </div>

        <!-- Demo fallback while Google Client ID isn't configured -->
        <div class="or-divider">LOCAL DEMO ACCESS</div>
        <form action="../backend/api/auth.php" method="POST" id="demo-form">
          <input type="hidden" name="action" value="demo">
          <button type="submit" class="cyber-btn" style="width:100%;border-color:var(--input-border);color:var(--text-muted);background:transparent;box-shadow:none;">
            ⚡ Quick Demo Sign-In [Testing Only]
          </button>
        </form>

        <p style="font-size:0.7rem;color:var(--text-muted);margin-top:1rem;font-family:'Space Mono',monospace;">
          [!] To enable real Google sign-in, replace <code>YOUR_GOOGLE_CLIENT_ID</code><br>
          in index.php with your credential from console.cloud.google.com
        </p>
      </div>

      <!-- ===== PANEL: Email Login ===== -->
      <div class="auth-panel <?= $tab==='login'?'active':'' ?>" id="panel-login">
        <form action="../backend/api/auth.php" method="POST">
          <input type="hidden" name="action" value="login">
          <div class="form-group">
            <label for="login-email">University Email</label>
            <input id="login-email" class="form-input" type="email" name="email" placeholder="you@gsfcuniversity.ac.in" required autocomplete="email">
          </div>
          <div class="form-group">
            <label for="login-pass">Password</label>
            <input id="login-pass" class="form-input" type="password" name="password" placeholder="••••••••" required autocomplete="current-password">
          </div>
          <a href="forgot_password.php" class="forgot-link">Forgot Password?</a>
          <button type="submit" class="cyber-btn cyber-btn-full" style="margin-top:0.5rem;">
            Secure Sign-In
          </button>
        </form>
        <div class="or-divider">or</div>
        <button onclick="switchTab('google')" class="google-btn">
          <img src="https://www.gstatic.com/images/branding/googleg/1x/googleg_standard_color_128dp.png" alt="Google">
          Continue with Google
        </button>
      </div>

      <!-- ===== PANEL: Register ===== -->
      <div class="auth-panel <?= $tab==='register'?'active':'' ?>" id="panel-register">
        <form action="../backend/api/register.php" method="POST">
          <div class="form-group">
            <label for="reg-name">Full Name</label>
            <input id="reg-name" class="form-input" type="text" name="name" placeholder="Your Full Name" required autocomplete="name">
          </div>
          <div class="form-group">
            <label for="reg-email">University Email</label>
            <input id="reg-email" class="form-input" type="email" name="email" placeholder="you@gsfcuniversity.ac.in" required autocomplete="email">
          </div>
          <div class="form-group">
            <label for="reg-pass">Password <span style="color:var(--text-muted)">(min 8 chars)</span></label>
            <input id="reg-pass" class="form-input" type="password" name="password" placeholder="••••••••" minlength="8" required autocomplete="new-password">
          </div>
          <div class="form-group">
            <label for="reg-confirm">Confirm Password</label>
            <input id="reg-confirm" class="form-input" type="password" name="confirm_password" placeholder="••••••••" minlength="8" required autocomplete="new-password">
          </div>
          <button type="submit" class="cyber-btn cyber-btn-success cyber-btn-full">
            Create Account
          </button>
        </form>
        <div class="or-divider">already registered?</div>
        <button onclick="switchTab('login')" class="cyber-btn" style="width:100%;text-align:center;">
          Log In Instead
        </button>
      </div>

    </div><!-- /glass-panel -->

    <!-- Theme toggle on auth page -->
    <div style="text-align:center;margin-top:1.5rem;">
      <button class="theme-toggle" onclick="toggleTheme()" id="themeToggle">☀️ Light</button>
    </div>

  </div><!-- /auth-card -->
</div>

<script src="js/theme.js"></script>
<script>
  // Tab switching
  function switchTab(name) {
    document.querySelectorAll('.auth-tab,.auth-panel').forEach(el => el.classList.remove('active'));
    document.getElementById('tab-'   + name).classList.add('active');
    document.getElementById('panel-' + name).classList.add('active');
  }

  // Activate tab from URL param
  const urlTab = new URLSearchParams(location.search).get('tab');
  if (urlTab) switchTab(urlTab);

  // Google Sign-In Callback
  async function handleGoogleSignIn(response) {
    const form = document.createElement('form');
    form.method = 'POST'; form.action = '../backend/api/auth.php';
    const actionInput = document.createElement('input');
    actionInput.name = 'action'; actionInput.value = 'google';
    const credInput = document.createElement('input');
    credInput.name = 'credential'; credInput.value = response.credential;
    form.appendChild(actionInput); form.appendChild(credInput);
    document.body.appendChild(form); form.submit();
  }
</script>
</body>
</html>
