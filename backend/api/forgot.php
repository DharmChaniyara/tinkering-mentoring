<?php
/**
 * api/forgot.php — Password Reset: Request Handler
 *
 * Generates a secure token, stores it in the DB, and sends a real email
 * via PHPMailer (Brevo/Gmail SMTP configured through env vars).
 */
require_once '../db_connect.php';
require_once '../includes/mailer.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    header('Location: ../../frontend/forgot_password.php');
    exit();
}

$email = strtolower(trim($_POST['email'] ?? ''));

if (!$email || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
    header('Location: ../../frontend/forgot_password.php?msg=' . urlencode('Please enter a valid email address.'));
    exit();
}

// ── Look up user ─────────────────────────────────────────────────────────────
$stmt = $conn->prepare('SELECT id, name FROM users WHERE email = ?');
$stmt->execute([$email]);
$user = $stmt->fetch();

// Always show a generic message — prevents email enumeration attacks
$genericMsg = 'If an account with that email exists, a reset link has been sent. Check your inbox (and spam folder).';

if ($user) {

    // ── Invalidate any existing unused tokens for this user ─────────────────
    $conn->prepare('UPDATE password_reset_tokens SET used = TRUE WHERE user_id = ? AND used = FALSE')
         ->execute([$user['id']]);

    // ── Generate token ───────────────────────────────────────────────────────
    $token   = bin2hex(random_bytes(32));
    $expires = date('Y-m-d H:i:s', time() + 3600); // 1 hour

    $conn->prepare('INSERT INTO password_reset_tokens (user_id, token, expires_at) VALUES (?, ?, ?)')
         ->execute([$user['id'], $token, $expires]);

    // ── Build reset URL ──────────────────────────────────────────────────────
    $baseUrl    = appUrl();
    $resetLink  = $baseUrl . '/reset_password.php?token=' . $token;
    $userName   = htmlspecialchars($user['name']);

    // ── Build branded HTML email ─────────────────────────────────────────────
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
            <h2 style="margin:0 0 12px;font-size:20px;color:#f9fafb;">Password Reset Request</h2>
            <p style="margin:0 0 20px;font-size:15px;color:#9ca3af;line-height:1.6;">
              Hi <strong style="color:#e5e7eb;">{$userName}</strong>,<br><br>
              We received a request to reset the password for your StudyShare account.
              Click the button below to choose a new password. This link is valid for <strong>1 hour</strong>.
            </p>

            <!-- CTA Button -->
            <table cellpadding="0" cellspacing="0" style="margin:28px 0;">
              <tr>
                <td align="center">
                  <a href="{$resetLink}"
                     style="display:inline-block;padding:14px 36px;background:linear-gradient(135deg,#6366f1,#8b5cf6);
                            color:#fff;text-decoration:none;border-radius:8px;font-size:15px;
                            font-weight:600;letter-spacing:0.3px;">
                    Reset My Password
                  </a>
                </td>
              </tr>
            </table>

            <p style="margin:0 0 16px;font-size:13px;color:#6b7280;line-height:1.6;">
              If the button doesn't work, copy and paste this link into your browser:
            </p>
            <p style="margin:0 0 24px;font-size:12px;word-break:break-all;">
              <a href="{$resetLink}" style="color:#818cf8;">{$resetLink}</a>
            </p>

            <hr style="border:none;border-top:1px solid #1f2937;margin:24px 0;">
            <p style="margin:0;font-size:12px;color:#6b7280;line-height:1.6;">
              If you didn't request a password reset, you can safely ignore this email.
              Your password will remain unchanged.<br><br>
              — The StudyShare Team
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

    // ── Send email ───────────────────────────────────────────────────────────
    sendMail($email, $user['name'], 'Reset Your StudyShare Password', $htmlBody);
}

header('Location: ../../frontend/forgot_password.php?msg=' . urlencode($genericMsg));
exit();
?>
