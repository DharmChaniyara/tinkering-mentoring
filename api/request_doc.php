<?php
session_start();
require_once '../db_connect.php';

if (!isset($_SESSION['user_id'])) {
    header("Location: ../index.php");
    exit();
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $user_id = $_SESSION['user_id'];
    $subject_id = (int)$_POST['subject_id'];
    $title = trim($_POST['title']);
    $details = trim($_POST['details'] ?? '');

    if (empty($title) || empty($subject_id)) {
        header("Location: ../dashboard.php?error=Missing+fields");
        exit();
    }

    $stmt = $conn->prepare("INSERT INTO document_requests (user_id, subject_id, title, details) VALUES (?, ?, ?, ?)");
    if ($stmt) {
        $stmt->execute([$user_id, $subject_id, $title, $details]);
        header("Location: ../dashboard.php?msg=Request+submitted");
    } else {
        // Table mighty not exist if migration failed, gracefully fail
        header("Location: ../dashboard.php?error=Unable+to+submit+request");
    }
} else {
    header("Location: ../dashboard.php");
}
