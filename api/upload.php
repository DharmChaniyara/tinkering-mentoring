<?php
session_start();
if (!isset($_SESSION['user_id'])) {
    header("Location: ../index.php");
    exit();
}
require_once '../db_connect.php';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $user_id = $_SESSION['user_id'];
    $subject_id = isset($_POST['subject_id']) ? (int)$_POST['subject_id'] : 0;
    $title = isset($_POST['title']) ? trim($_POST['title']) : '';
    $unit_number = isset($_POST['unit_number']) && trim($_POST['unit_number']) !== '' ? (int)$_POST['unit_number'] : NULL;

    // Validate user still exists (in case of DB resets during dev)
    $userCheck = $conn->query("SELECT id FROM users WHERE id = $user_id");
    if (!$userCheck || $userCheck->num_rows === 0) {
        session_destroy();
        die("<h1 style='color:red;'>[ERROR] Invalid Session. Your user account was not found in the database. Please log out and log back in.</h1><a href='../index.php'>Go to Login</a>");
    }

    if ($subject_id === 0 || empty($title) || !isset($_FILES['file']) || $_FILES['file']['error'] !== UPLOAD_ERR_OK) {
        die("<h1 style='color:red; font-family: monospace;'>[ERROR] INVALID UPLOAD PARAMETERS</h1><a href='../dashboard.php'>Go Back</a>");
    }

    $upload_dir = '../uploads/';
    if (!is_dir($upload_dir)) mkdir($upload_dir, 0777, true);

    $file = $_FILES['file'];
    $file_ext = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
    
    // Allowed extensions
    $allowed_ext = ['pdf', 'doc', 'docx', 'ppt', 'pptx', 'txt', 'png', 'jpg', 'jpeg'];
    if (!in_array($file_ext, $allowed_ext)) {
         die("<h1 style='color:red; font-family: monospace;'>[ERROR] SECURITY EXCEPTION: INVALID FILE TYPE</h1><a href='../dashboard.php'>Go Back</a>");
    }

    $new_filename = uniqid('res_') . '.' . $file_ext;
    $target_file = $upload_dir . $new_filename;

    if (move_uploaded_file($file['tmp_name'], $target_file)) {
        $db_path = 'uploads/' . $new_filename;

        $category = isset($_POST['category']) ? $conn->real_escape_string($_POST['category']) : 'Notes';
        $stmt = $conn->prepare("INSERT INTO notes (user_id, subject_id, unit_number, title, file_path, file_type, category) VALUES (?, ?, ?, ?, ?, ?, ?)");
        $stmt->bind_param("iiissss", $user_id, $subject_id, $unit_number, $title, $db_path, $file_ext, $category);
        
        if ($stmt->execute()) {
            $redirect = "../subject.php?id=" . $subject_id;
            if ($unit_number) $redirect .= "&unit=" . $unit_number;
            header("Location: $redirect");
            exit();
        } else {
            die("<h1 style='color:red;'>[DB ERROR] " . $conn->error . "</h1>");
        }
    } else {
        die("<h1 style='color:red;'>[SYSTEM ERROR] File transfer failed.</h1>");
    }
}
?>
