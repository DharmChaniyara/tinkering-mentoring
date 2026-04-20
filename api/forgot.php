<?php
require_once '../db_connect.php';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $email = trim($_POST['email'] ?? '');
    if (!$email) die("Email required");

    $stmt = $conn->prepare("SELECT id FROM users WHERE email = ?");
    $stmt->execute([$email]);
    $user = $stmt->fetch();

    if ($user) {
        // Generate secure random token
        $token = bin2hex(random_bytes(32));
        $expires = date('Y-m-d H:i:s', strtotime('+1 hour'));
        
        $stmt = $conn->prepare("INSERT INTO password_reset_tokens (user_id, token, expires_at) VALUES (?, ?, ?)");
        $stmt->execute([$user['id'], $token, $expires]);

        // [DEV/DEMO MODE] Simulate email by outputting the link directly to the screen.
        // In production, you would use PHPMailer here.
        $domain = $_SERVER['HTTP_HOST'];
        $path = str_replace('\\', '/', dirname($_SERVER['PHP_SELF'], 2)); // Resolve to /test directory
        $reset_link = "http://" . $domain . $path . "/reset_password.php?token=" . $token;
        
        $msg = "DEV OVERRIDE: Email simulation triggered. <br><br> Reset link generated:<br> <a href='$reset_link' style='color:#0ff;word-break:break-all;text-decoration:underline;'>$reset_link</a>";
        header("Location: ../forgot_password.php?msg=" . urlencode($msg));
        exit();
    } else {
        // Generic message so attackers cannot guess registered emails
        header("Location: ../forgot_password.php?msg=" . urlencode("If an account exists, a reset link was sent."));
        exit();
    }
}
?>
