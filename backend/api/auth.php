<?php
session_start();
require_once '../db_connect.php';

$action = $_POST['action'] ?? '';

// ─── DEMO LOGIN ──────────────────────────────────────────────────────────────
if ($action === 'demo') {
    loginOrCreateUser('demo_google_001', 'demo@gsfcuniversity.ac.in', 'CSE Student (Demo)');
}

// ─── EMAIL / PASSWORD LOGIN ──────────────────────────────────────────────────
if ($action === 'login') {
    $email    = trim($_POST['email']    ?? '');
    $password =      $_POST['password'] ?? '';
    if (!$email || !$password) redirect('login', 'Email and password are required.');

    $stmt = $conn->prepare("SELECT id, name, password_hash FROM users WHERE email = ? AND password_hash IS NOT NULL");
    $stmt->execute([$email]);
    $user = $stmt->fetch();

    if (!$user || !password_verify($password, $user['password_hash'])) {
        redirect('login', 'Invalid email or password.');
    }
    startSession($user['id'], $user['name']);
    header("Location: ../../frontend/dashboard.php"); exit();
}

// ─── GOOGLE OAUTH ────────────────────────────────────────────────────────────
if ($action === 'google') {
    $credential = $_POST['credential'] ?? '';
    if (!$credential) redirect('google', 'Google sign-in failed. No credential received.');

    // Verify token via Google's tokeninfo endpoint
    $tokenInfoUrl = 'https://oauth2.googleapis.com/tokeninfo?id_token=' . urlencode($credential);
    $context = stream_context_create(['http' => ['timeout' => 10]]);
    $response = @file_get_contents($tokenInfoUrl, false, $context);

    if (!$response) redirect('google', 'Could not verify Google token. Check your internet connection.');

    $info = json_decode($response, true);
    if (isset($info['error_description'])) redirect('google', 'Google token invalid: ' . $info['error_description']);

    $google_id = $info['sub'];
    $email     = $info['email'];
    $name      = $info['name'];
    $pic       = $info['picture'] ?? '';

    // Check if user already exists by google_id or email
    $stmt = $conn->prepare("SELECT id, name FROM users WHERE google_id = ? OR email = ?");
    $stmt->execute([$google_id, $email]);
    $user = $stmt->fetch();

    if ($user) {
        // Update google_id & pic if logging in via Google for first time
        $stmtUpdate = $conn->prepare("UPDATE users SET google_id=?, profile_pic=? WHERE id=?");
        $stmtUpdate->execute([$google_id, $pic, $user['id']]);
        startSession($user['id'], $user['name']);
    } else {
        // Create new user
        $stmt = $conn->prepare("INSERT INTO users (google_id, name, email, profile_pic) VALUES (?,?,?,?)");
        $stmt->execute([$google_id, $name, $email, $pic]);
        startSession($conn->lastInsertId(), $name);
    }
    header("Location: ../../frontend/dashboard.php"); exit();
}

// ─── HELPERS ─────────────────────────────────────────────────────────────────
function loginOrCreateUser($google_id, $email, $name) {
    global $conn;
    $stmt = $conn->prepare("SELECT id, name FROM users WHERE google_id = ? OR email = ?");
    $stmt->execute([$google_id, $email]);
    $user = $stmt->fetch();
    if ($user) {
        startSession($user['id'], $user['name']);
    } else {
        $stmt = $conn->prepare("INSERT INTO users (google_id, name, email) VALUES (?,?,?)");
        $stmt->execute([$google_id, $name, $email]);
        startSession($conn->lastInsertId(), $name);
    }
    header("Location: ../../frontend/dashboard.php"); exit();
}

function startSession($id, $name) {
    $_SESSION['user_id']   = $id;
    $_SESSION['user_name'] = $name;
}

function redirect($tab, $msg) {
    header("Location: ../../frontend/index.php?tab=" . urlencode($tab) . "&error=" . urlencode($msg));
    exit();
}
?>
