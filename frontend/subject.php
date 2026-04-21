<?php
session_start();
if (!isset($_SESSION['user_id'])) {
    header("Location: index.php");
    exit();
}
require_once '../backend/db_connect.php';

$subject_id = isset($_GET['id']) ? (int)$_GET['id'] : 0;
$unit_filter = isset($_GET['unit']) ? (int)$_GET['unit'] : 0;

// Fetch subject
$stmt = $conn->prepare("SELECT * FROM subjects WHERE id = ?");
$stmt->execute([$subject_id]);
$subject = $stmt->fetch(PDO::FETCH_ASSOC);

if (!$subject) {
    die("<h1 style='color:red; padding:2rem;'>Subject not found.</h1><a href='dashboard.php'>← Dashboard</a>");
}

// Fetch Notes
$query = "SELECT notes.*, users.name as uploader_name, units.unit_name 
          FROM notes 
          JOIN users ON notes.user_id = users.id 
          LEFT JOIN units ON notes.subject_id = units.subject_id AND notes.unit_number = units.unit_number
          WHERE notes.subject_id = ?";
$params = [$subject_id];

if ($unit_filter > 0) {
    $query .= " AND notes.unit_number = ?";
    $params[] = $unit_filter;
}

$query .= " ORDER BY notes.uploaded_at DESC";

$stmt = $conn->prepare($query);
$stmt->execute($params);
$notes = $stmt->fetchAll(PDO::FETCH_ASSOC);

// Get ALL defined units/practicals for this subject from syllabus (not just those with notes)
$stmt = $conn->prepare("SELECT unit_number, unit_name FROM units WHERE subject_id = ? ORDER BY unit_number ASC");
$stmt->execute([$subject_id]);
$units_result = $stmt->fetchAll(PDO::FETCH_ASSOC);

$active_page = 'resources';
$current_document_name = null;
?>
<!DOCTYPE html>
<html lang="en" data-theme="dark">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>StudyShare | <?= htmlspecialchars($subject['name']) ?></title>
    <link rel="stylesheet" href="css/style.css">
    <script>
        (function(){var t=localStorage.getItem('gsfc_theme')||'dark';document.documentElement.setAttribute('data-theme',t);})();
    </script>
</head>
<body>

<div class="app-layout">
    <!-- Sidebar -->
    <?php include '../backend/includes/sidebar.php'; ?>

    <!-- Main Content -->
    <div class="main-content">
        <!-- Top Bar -->
        <header class="topbar">
            <div style="display:flex; align-items:center; gap:12px;">
                <a href="dashboard.php" class="cyber-btn cyber-btn-ghost" style="padding:8px 14px; font-size:0.85rem;">
                    ← Dashboard
                </a>
                <div>
                    <h3 style="font-size:1rem; font-weight:700;"><?= htmlspecialchars($subject['name']) ?></h3>
                    <p style="font-size:0.75rem; color:var(--text-muted);"><?= htmlspecialchars($subject['code']) ?> · <?= ucfirst($subject['type']) ?></p>
                </div>
            </div>
            <div class="topbar-actions">
                <button class="theme-toggle" onclick="toggleTheme()" id="themeToggle">☀️</button>
                <?php if (!empty($subject['syllabus_file'])): ?>
                <a href="<?= htmlspecialchars($subject['syllabus_file']) ?>" target="_blank" class="cyber-btn" style="font-size:0.85rem; padding:8px 14px;">
                    📄 Official Syllabus
                </a>
                <?php endif; ?>
            </div>
        </header>

        <!-- Page Content -->
        <div class="page-content">

            <!-- Subject Header -->
            <div class="subject-header slide-in-up" style="margin-bottom: 1.5rem;">
                <h1 style="font-size: 1.6rem; margin-bottom: 4px;">
                    <span class="gradient-text"><?= htmlspecialchars($subject['name']) ?></span>
                </h1>
                <p style="color: var(--text-muted);"><?= count($units_result) ?> <?= $subject['type'] === 'practical' ? 'Lab Experiments' : 'Syllabus Units' ?> · <?= count($notes) ?> Resources Available</p>
            </div>

            <!-- Unit / Lab Filters -->
            <?php if (!empty($units_result)): ?>
            <?php $label = $subject['type'] === 'practical' ? 'Practical' : 'Unit'; ?>
            <div class="unit-filters slide-in-up">
                <a href="subject.php?id=<?= $subject_id ?>" class="unit-btn <?= $unit_filter === 0 ? 'active' : '' ?>">
                    All <?= $subject['type'] === 'practical' ? 'Labs' : 'Units' ?>
                </a>
                <?php foreach ($units_result as $u): ?>
                    <?php if ($u['unit_number']): ?>
                    <a href="subject.php?id=<?= $subject_id ?>&unit=<?= $u['unit_number'] ?>"
                       class="unit-btn <?= $unit_filter == $u['unit_number'] ? 'active' : '' ?>">
                        <?= $label ?> <?= $u['unit_number'] ?><?= $u['unit_name'] ? ': ' . htmlspecialchars($u['unit_name']) : '' ?>
                    </a>
                    <?php endif; ?>
                <?php endforeach; ?>
            </div>
            <?php endif; ?>

            <!-- Notes Grid -->
            <div class="notes-grid stagger-children">
                <?php if (empty($notes)): ?>
                    <div class="glass-panel empty-state" style="grid-column: 1 / -1;">
                        <div style="font-size:3rem; margin-bottom:1rem;">📭</div>
                        <h3 style="margin-bottom:8px;">No documents yet</h3>
                        <p style="color:var(--text-muted);">Be the first to upload a resource for this subject!</p>
                    </div>
                <?php else: ?>
                    <?php foreach ($notes as $note): ?>
                    <div class="note-card" onclick="window.location='view_document.php?id=<?= $note['id'] ?>'">
                        <div class="note-file-icon">
                            <?php
                            $ext = strtolower($note['file_type'] ?? '');
                            if ($ext === 'pdf') echo '📕';
                            elseif (in_array($ext, ['doc','docx'])) echo '📘';
                            elseif (in_array($ext, ['ppt','pptx'])) echo '📙';
                            elseif (in_array($ext, ['png','jpg','jpeg'])) echo '🖼️';
                            else echo '📄';
                            ?>
                        </div>
                        <div class="note-info">
                            <h4><?= htmlspecialchars($note['title']) ?></h4>
                            <div class="note-detail">
                                <span class="file-badge"><?= htmlspecialchars($note['file_type']) ?></span>
                                <?php if ($note['unit_number']): ?>
                                    <?php $noteLbl = $subject['type'] === 'practical' ? 'Practical' : 'Unit'; ?>
                                    <span class="file-badge" style="background:rgba(6,182,212,0.1); color:var(--secondary);">
                                        <?= $noteLbl ?> <?= $note['unit_number'] ?>
                                    </span>
                                <?php endif; ?>
                            </div>
                            <div class="note-detail" style="margin-top:6px;">
                                <?= htmlspecialchars($note['uploader_name']) ?> · <?= date('M j, Y', strtotime($note['uploaded_at'])) ?>
                            </div>
                        </div>
                    </div>
                    <?php endforeach; ?>
                <?php endif; ?>
            </div>

        </div><!-- /page-content -->
    </div><!-- /main-content -->
</div><!-- /app-layout -->

<!-- AI Assistant -->
<?php include '../backend/includes/ai_assistant.php'; ?>

<script src="js/theme.js"></script>
<script src="js/app.js"></script>
</body>
</html>
