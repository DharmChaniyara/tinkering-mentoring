<?php
session_start();
require_once '../db_connect.php';

header('Content-Type: application/json');

if (!isset($_SESSION['user_id'])) {
    echo json_encode(['error' => 'Unauthorized']);
    exit();
}

$subject_id = isset($_GET['subject_id']) ? (int)$_GET['subject_id'] : 0;

if ($subject_id === 0) {
    echo json_encode([]);
    exit();
}

$stmt = $conn->prepare("SELECT unit_number, unit_name FROM units WHERE subject_id = ? ORDER BY unit_number ASC");
$stmt->execute([$subject_id]);
$units = $stmt->fetchAll(PDO::FETCH_ASSOC);

echo json_encode($units);
?>
