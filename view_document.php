<?php
session_start();
if (!isset($_SESSION['user_id'])) {
    header("Location: index.php");
    exit();
}
require_once 'db_connect.php';

$note_id = isset($_GET['id']) ? (int)$_GET['id'] : 0;

// Fetch document with joins
$stmt = $conn->prepare("SELECT notes.*, users.name as uploader_name, subjects.name as subject_name, subjects.code as subject_code, units.unit_name
                         FROM notes 
                         JOIN users ON notes.user_id = users.id 
                         JOIN subjects ON notes.subject_id = subjects.id
                         LEFT JOIN units ON notes.subject_id = units.subject_id AND notes.unit_number = units.unit_number
                         WHERE notes.id = ?");
$stmt->execute([$note_id]);
$note = $stmt->fetch();

if (!$note) {
    header("Location: dashboard.php");
    exit();
}

$file_ext = strtolower($note['file_type'] ?? pathinfo($note['file_path'], PATHINFO_EXTENSION));
$can_preview = in_array($file_ext, ['pdf', 'png', 'jpg', 'jpeg', 'gif', 'txt']);

$active_page = 'resources';
$current_document_name = $note['title'];
?>
<!DOCTYPE html>
<html lang="en" data-theme="dark">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>StudyShare | <?= htmlspecialchars($note['title']) ?></title>
    <link rel="stylesheet" href="css/style.css">
    <script>
        (function(){var t=localStorage.getItem('gsfc_theme')||'dark';document.documentElement.setAttribute('data-theme',t);})();
    </script>
</head>
<body>

<div class="app-layout">
    <!-- Sidebar -->
    <?php include 'includes/sidebar.php'; ?>

    <!-- Main Content -->
    <div class="main-content">
        <!-- Top Bar -->
        <header class="topbar">
            <div style="display:flex; align-items:center; gap:12px;">
                <a href="subject.php?id=<?= $note['subject_id'] ?>" class="cyber-btn cyber-btn-ghost" style="padding:8px 14px; font-size:0.85rem;">
                    ← Back
                </a>
                <div>
                    <h3 style="font-size:1rem; font-weight:700;"><?= htmlspecialchars($note['title']) ?></h3>
                    <p style="font-size:0.75rem; color:var(--text-muted);"><?= htmlspecialchars($note['subject_name']) ?></p>
                </div>
            </div>
            <div class="topbar-actions">
                <button class="theme-toggle" onclick="toggleTheme()" id="themeToggle">☀️</button>
                <a href="<?= htmlspecialchars($note['file_path']) ?>" target="_blank" class="cyber-btn cyber-btn-success" style="font-size:0.85rem; padding:8px 16px;">
                    ⬇ Download
                </a>
            </div>
        </header>

        <!-- Split Screen Document Viewer -->
        <div class="doc-viewer">
            <!-- Left: Document Preview -->
            <div class="doc-viewer-main">
                <?php if ($can_preview): ?>
                    <?php if ($file_ext === 'pdf'): ?>
                        <iframe src="<?= htmlspecialchars($note['file_path']) ?>" title="Document Preview"></iframe>
                    <?php elseif (in_array($file_ext, ['png','jpg','jpeg','gif'])): ?>
                        <img src="<?= htmlspecialchars($note['file_path']) ?>" alt="<?= htmlspecialchars($note['title']) ?>"
                             style="max-width:90%; max-height:90%; object-fit:contain; border-radius:8px;">
                    <?php else: ?>
                        <iframe src="<?= htmlspecialchars($note['file_path']) ?>" title="Document Preview"></iframe>
                    <?php endif; ?>
                <?php else: ?>
                    <div class="no-preview">
                        <span class="big-icon">
                            <?php
                            if (in_array($file_ext, ['doc','docx'])) echo '📘';
                            elseif (in_array($file_ext, ['ppt','pptx'])) echo '📙';
                            else echo '📄';
                            ?>
                        </span>
                        <h3>Preview not available</h3>
                        <p style="margin-top:8px; font-size:0.9rem;">This file type (.<?= $file_ext ?>) cannot be previewed in-browser.</p>
                        <a href="<?= htmlspecialchars($note['file_path']) ?>" target="_blank" class="cyber-btn cyber-btn-success" style="margin-top:1.5rem;">
                            ⬇ Download to View
                        </a>
                    </div>
                <?php endif; ?>
            </div>

            <!-- Right: Document Info Panel -->
            <div class="doc-viewer-sidebar">
                <div class="doc-info-header">
                    <h2><?= htmlspecialchars($note['title']) ?></h2>
                    <div class="doc-subject"><?= htmlspecialchars($note['subject_name']) ?> (<?= htmlspecialchars($note['subject_code']) ?>)</div>
                </div>
                <div class="doc-info-body">
                    <div class="doc-meta-item">
                        <div class="meta-icon">👤</div>
                        <div class="meta-text">
                            <div class="meta-label">Uploaded By</div>
                            <div class="meta-value"><?= htmlspecialchars($note['uploader_name']) ?></div>
                        </div>
                    </div>
                    <div class="doc-meta-item">
                        <div class="meta-icon">📅</div>
                        <div class="meta-text">
                            <div class="meta-label">Upload Date</div>
                            <div class="meta-value"><?= date('M j, Y \a\t g:i A', strtotime($note['uploaded_at'])) ?></div>
                        </div>
                    </div>
                    <div class="doc-meta-item">
                        <div class="meta-icon">📁</div>
                        <div class="meta-text">
                            <div class="meta-label">File Type</div>
                            <div class="meta-value" style="text-transform:uppercase;"><?= htmlspecialchars($file_ext) ?></div>
                        </div>
                    </div>
                    <?php if ($note['unit_number']): ?>
                    <div class="doc-meta-item">
                        <div class="meta-icon">📖</div>
                        <div class="meta-text">
                            <div class="meta-label">Syllabus Unit</div>
                            <div class="meta-value">Unit <?= $note['unit_number'] ?><?= $note['unit_name'] ? ': ' . htmlspecialchars($note['unit_name']) : '' ?></div>
                        </div>
                    </div>
                    <?php endif; ?>

                    <div style="margin-top:1.5rem;">
                        <h4 style="font-size:0.85rem; color:var(--text-muted); text-transform:uppercase; letter-spacing:0.5px; margin-bottom:10px;">
                            Quick Actions
                        </h4>
                        <div style="display:flex; flex-direction:column; gap:8px;">
                            <a href="<?= htmlspecialchars($note['file_path']) ?>" target="_blank" class="cyber-btn cyber-btn-success cyber-btn-full" style="font-size:0.85rem;">
                                ⬇ Download File
                            </a>
                            <button onclick="document.getElementById('aiFab').click();" class="cyber-btn cyber-btn-full" style="font-size:0.85rem;">
                                🤖 Ask AI About This
                            </button>
                            <a href="subject.php?id=<?= $note['subject_id'] ?>" class="cyber-btn cyber-btn-ghost cyber-btn-full" style="font-size:0.85rem;">
                                📚 More from this Subject
                            </a>
                            <button onclick="document.getElementById('reportDocModal').classList.add('open');" class="cyber-btn cyber-btn-ghost cyber-btn-full" style="font-size:0.85rem; color:var(--danger); border-color:rgba(239, 68, 68, 0.3); margin-top:0.5rem;">
                                🚩 Report Issue
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div><!-- /doc-viewer -->
    </div><!-- /main-content -->
</div><!-- /app-layout -->

<!-- AI Assistant (context-aware) -->
<?php include 'includes/ai_assistant.php'; ?>

<!-- REPORT DOC MODAL -->
<div id="reportDocModal" class="modal-overlay">
    <div class="modal-content pop-in">
        <div class="modal-header">
            <h2 style="color:var(--danger);" class="gradient-text">Report Resource</h2>
            <button class="modal-close" onclick="document.getElementById('reportDocModal').classList.remove('open')">✕</button>
        </div>
        <form action="api/report_doc.php" method="POST">
            <input type="hidden" name="note_id" value="<?= $note_id ?>">
            <div class="form-group">
                <label>Reason for reporting</label>
                <select name="reason" class="form-input" required>
                    <option value="">-- Select Reason --</option>
                    <option value="Incorrect Subject">Incorrect Subject mapping</option>
                    <option value="Low Quality">Low quality or unreadable</option>
                    <option value="Inappropriate Content">Inappropriate Content</option>
                    <option value="Spam">Spam</option>
                    <option value="Other">Other</option>
                </select>
            </div>
            <div class="form-group">
                <label>Additional Details</label>
                <textarea name="details" class="form-input" rows="3" placeholder="Please provide more context about the issue..." required></textarea>
            </div>
            <div style="display: flex; justify-content: flex-end; gap: 10px; margin-top: 1.5rem;">
                <button type="button" class="cyber-btn cyber-btn-ghost" onclick="document.getElementById('reportDocModal').classList.remove('open')">Cancel</button>
                <button type="submit" class="cyber-btn cyber-btn-danger">Submit Report</button>
            </div>
        </form>
    </div>
</div>

<script src="js/theme.js"></script>
<script src="js/app.js"></script>
</body>
</html>
