<?php
/**
 * includes/mailer.php
 *
 * Shared PHPMailer helper — reads SMTP credentials from environment variables.
 *
 * Required env vars (set in Render Dashboard → Environment):
 *   SMTP_HOST   e.g. smtp-relay.brevo.com
 *   SMTP_PORT   e.g. 587
 *   SMTP_USER   Your Brevo login email (or Gmail address)
 *   SMTP_PASS   Your Brevo SMTP key (or Gmail App Password)
 *   SMTP_FROM   Sender address  e.g. noreply@gsfcuniversity.ac.in
 *   SMTP_NAME   Sender display name  e.g. StudyShare
 *   APP_URL     Your Render URL  e.g. https://tinkering-mentoring.onrender.com
 *
 * Usage:
 *   require_once __DIR__ . '/mailer.php';
 *   $ok = sendMail('to@example.com', 'Subject', '<p>HTML body</p>');
 */

use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\SMTP;
use PHPMailer\PHPMailer\Exception;

// Load Composer autoloader — works whether vendor/ is at the project root or one level up
$autoloadPaths = [
    __DIR__ . '/../vendor/autoload.php',  // from includes/
    __DIR__ . '/vendor/autoload.php',     // fallback
];
foreach ($autoloadPaths as $ap) {
    if (file_exists($ap)) { require_once $ap; break; }
}

/**
 * Send an HTML email.
 *
 * @param  string      $toEmail
 * @param  string      $toName       Display name of recipient (optional)
 * @param  string      $subject
 * @param  string      $htmlBody     Full HTML string
 * @param  string|null $textBody     Plain-text fallback (auto-stripped if null)
 * @return true|string               true on success, error message string on failure
 */
function sendMail(string $toEmail, string $toName, string $subject, string $htmlBody, ?string $textBody = null)
{
    $smtpHost = getenv('SMTP_HOST') ?: 'smtp-relay.brevo.com';
    $smtpPort = (int)(getenv('SMTP_PORT') ?: 587);
    $smtpUser = getenv('SMTP_USER') ?: '';
    $smtpPass = getenv('SMTP_PASS') ?: '';
    $fromAddr = getenv('SMTP_FROM') ?: 'noreply@gsfcuniversity.ac.in';
    $fromName = getenv('SMTP_NAME') ?: 'StudyShare';

    // If no SMTP credentials configured, fall back to a log entry so the app
    // doesn't crash completely in a dev/local environment.
    if (!$smtpUser || !$smtpPass) {
        error_log("[StudyShare Mailer] SMTP not configured. Would have sent to: $toEmail — Subject: $subject");
        return true; // Soft-fail: don't break the user flow
    }

    $mail = new PHPMailer(true);
    try {
        $mail->isSMTP();
        $mail->Host       = $smtpHost;
        $mail->SMTPAuth   = true;
        $mail->Username   = $smtpUser;
        $mail->Password   = $smtpPass;
        $mail->SMTPSecure = PHPMailer::ENCRYPTION_STARTTLS;
        $mail->Port       = $smtpPort;
        $mail->CharSet    = 'UTF-8';

        // Sender & Recipient
        $mail->setFrom($fromAddr, $fromName);
        $mail->addAddress($toEmail, $toName);
        $mail->addReplyTo($fromAddr, $fromName);

        // Content
        $mail->isHTML(true);
        $mail->Subject = $subject;
        $mail->Body    = $htmlBody;
        $mail->AltBody = $textBody ?? strip_tags(str_replace(['<br>', '<br/>', '<br />'], "\n", $htmlBody));

        $mail->send();
        return true;
    } catch (Exception $e) {
        error_log("[StudyShare Mailer] Error sending to $toEmail: " . $mail->ErrorInfo);
        return $mail->ErrorInfo;
    }
}

/**
 * Returns the app's base URL — either from APP_URL env var or auto-detected.
 */
function appUrl(): string
{
    $env = getenv('APP_URL');
    if ($env) return rtrim($env, '/');

    $proto = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https' : 'http';
    $host  = $_SERVER['HTTP_HOST'] ?? 'localhost';
    return $proto . '://' . $host;
}
?>
