<?php
session_start();
require_once '../db_connect.php';

if (!isset($_SESSION['user_id'])) {
    header("Location: ../index.php");
    exit();
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $user_id = $_SESSION['user_id'];
    $note_id = (int)$_POST['note_id'];
    $reason = $_POST['reason'] ?? '';
    $details = trim($_POST['details'] ?? '');

    if (empty($note_id) || empty($reason)) {
        header("Location: ../view_document.php?id=$note_id&error=Missing+fields");
        exit();
    }

    $stmt = $conn->prepare("INSERT INTO reported_documents (user_id, note_id, reason, details) VALUES (?, ?, ?, ?)");
    if ($stmt) {
        $stmt->execute([$user_id, $note_id, $reason, $details]);
        header("Location: ../view_document.php?id=$note_id&msg=Report+submitted");
    } else {
        header("Location: ../view_document.php?id=$note_id&error=Unable+to+submit+report");
    }
} else {
    header("Location: ../dashboard.php");
}
