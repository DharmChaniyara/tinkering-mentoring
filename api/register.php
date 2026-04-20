<?php
session_start();
require_once '../db_connect.php';

$name     = trim($_POST['name']             ?? '');
$email    = trim($_POST['email']            ?? '');
$password =      $_POST['password']         ?? '';
$confirm  =      $_POST['confirm_password'] ?? '';

function fail($msg) {
    header("Location: ../index.php?tab=register&error=" . urlencode($msg));
    exit();
}

if (!$name || !$email || !$password || !$confirm) {
    fail('All fields are required.');
}
if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    fail('Please enter a valid email address.');
}
if (strlen($password) < 8) {
    fail('Password must be at least 8 characters.');
}
if ($password !== $confirm) {
    fail('Passwords do not match.');
}

// Check if email already registered
$stmt = $conn->prepare("SELECT id FROM users WHERE email = ?");
$stmt->execute([$email]);
if ($stmt->rowCount() > 0) {
    fail('This email is already registered. Please log in.');
}

// Insert new user
$hash = password_hash($password, PASSWORD_BCRYPT);
$stmt = $conn->prepare("INSERT INTO users (name, email, password_hash) VALUES (?,?,?)");

if ($stmt->execute([$name, $email, $hash])) {
    $_SESSION['user_id']   = $conn->lastInsertId();
    $_SESSION['user_name'] = $name;
    header("Location: ../dashboard.php");
    exit();
} else {
    fail('Registration failed. Please try again.');
}
?>
