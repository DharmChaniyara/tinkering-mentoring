<?php
/**
 * api/register.php — New User Registration
 * Validates input, hashes password, creates user, sends welcome email.
 */
session_start();
require_once '../db_connect.php';
require_once '../includes/mailer.php';

$name     = trim($_POST['name']             ?? '');
$email    = strtolower(trim($_POST['email'] ?? ''));
$password =      $_POST['password']         ?? '';
$confirm  =      $_POST['confirm_password'] ?? '';

function fail(string $msg): never {
    header('Location: ../index.php?tab=register&error=' . urlencode($msg));
    exit();
}

// ── Validate ──────────────────────────────────────────────────────────────────
if (!$name || !$email || !$password || !$confirm) fail('All fields are required.');
if (!filter_var($email, FILTER_VALIDATE_EMAIL))   fail('Please enter a valid email address.');
if (strlen($password) < 8)                        fail('Password must be at least 8 characters.');
if ($password !== $confirm)                       fail('Passwords do not match.');

// ── Check duplicate ───────────────────────────────────────────────────────────
$stmt = $conn->prepare('SELECT id FROM users WHERE email = ?');
$stmt->execute([$email]);
if ($stmt->rowCount() > 0) fail('This email is already registered — please log in.');

// ── Insert user ───────────────────────────────────────────────────────────────
$hash = password_hash($password, PASSWORD_BCRYPT);
$stmt = $conn->prepare('INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?) RETURNING id');
$stmt->execute([$name, $email, $hash]);
$newUser = $stmt->fetch();

if (!$newUser) fail('Registration failed. Please try again.');

$userId   = $newUser['id'];
$safeName = htmlspecialchars($name);

// ── Start session ─────────────────────────────────────────────────────────────
$_SESSION['user_id']   = $userId;
$_SESSION['user_name'] = $name;

// ── Send welcome email (non-blocking — failure doesn't stop login) ────────────
$baseUrl  = appUrl();
$htmlBody = <<<HTML
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0d0d0d;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0d0d0d;padding:40px 20px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#111827;border-radius:16px;border:1px solid #1f2937;overflow:hidden;max-width:560px;width:100%;">

        <!-- Header -->
        <tr>
          <td style="background:linear-gradient(135deg,#6366f1,#8b5cf6);padding:36px 40px;text-align:center;">
            <h1 style="margin:0;font-size:28px;color:#fff;letter-spacing:-0.5px;">StudyShare</h1>
            <p style="margin:6px 0 0;font-size:13px;color:rgba(255,255,255,0.75);">GSFC University · Semester II</p>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:40px;">
            <h2 style="margin:0 0 12px;font-size:20px;color:#f9fafb;">Welcome aboard, {$safeName}! 🎉</h2>
            <p style="margin:0 0 20px;font-size:15px;color:#9ca3af;line-height:1.6;">
              Your StudyShare account has been created. You can now upload notes, download resources,
              and collaborate with your classmates — all in one place.
            </p>

            <!-- CTA -->
            <table cellpadding="0" cellspacing="0" style="margin:28px 0;">
              <tr>
                <td>
                  <a href="{$baseUrl}/dashboard.php"
                     style="display:inline-block;padding:14px 36px;background:linear-gradient(135deg,#6366f1,#8b5cf6);
                            color:#fff;text-decoration:none;border-radius:8px;font-size:15px;font-weight:600;">
                    Go to Dashboard →
                  </a>
                </td>
              </tr>
            </table>

            <hr style="border:none;border-top:1px solid #1f2937;margin:24px 0;">

            <table cellpadding="0" cellspacing="0" width="100%">
              <tr>
                <td width="33%" style="padding:12px;text-align:center;background:#1f2937;border-radius:8px;">
                  <p style="margin:0;font-size:22px;">📚</p>
                  <p style="margin:4px 0 0;font-size:12px;color:#9ca3af;">Study Materials</p>
                </td>
                <td width="4%"></td>
                <td width="33%" style="padding:12px;text-align:center;background:#1f2937;border-radius:8px;">
                  <p style="margin:0;font-size:22px;">⬆️</p>
                  <p style="margin:4px 0 0;font-size:12px;color:#9ca3af;">Upload Notes</p>
                </td>
                <td width="4%"></td>
                <td width="33%" style="padding:12px;text-align:center;background:#1f2937;border-radius:8px;">
                  <p style="margin:0;font-size:22px;">🤝</p>
                  <p style="margin:4px 0 0;font-size:12px;color:#9ca3af;">Collaborate</p>
                </td>
              </tr>
            </table>

            <p style="margin:24px 0 0;font-size:12px;color:#6b7280;line-height:1.6;">
              If you did not create this account, please ignore this email or contact your administrator.
            </p>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:#0d0d0d;padding:20px 40px;text-align:center;">
            <p style="margin:0;font-size:11px;color:#374151;">
              © 2024 StudyShare · GSFC University · Built for learning, not for profit.
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>
HTML;

sendMail($email, $name, 'Welcome to StudyShare! 🎓', $htmlBody);

// ── Redirect to dashboard ─────────────────────────────────────────────────────
header('Location: ../dashboard.php');
exit();
?>
