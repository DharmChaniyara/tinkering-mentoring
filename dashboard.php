<?php
session_start();
if (!isset($_SESSION['user_id'])) {
    header("Location: index.php");
    exit();
}
require_once 'db_connect.php';

// Fetch all subjects
$stmt = $conn->query("SELECT * FROM subjects ORDER BY type ASC, name ASC");
$all_subjects = $stmt->fetchAll(PDO::FETCH_ASSOC);

$theory_subjects = [];
$practical_subjects = [];

foreach ($all_subjects as $sub) {
    if ($sub['type'] === 'theory') {
        $theory_subjects[$sub['id']] = $sub;
    } else {
        $practical_subjects[] = $sub;
    }
}

// Fetch notes grouped by category
$notes_data = $conn->query("SELECT notes.*, users.name as uploader_name, subjects.name as subject_name 
                            FROM notes 
                            JOIN users ON notes.user_id = users.id 
                            JOIN subjects ON notes.subject_id = subjects.id 
                            ORDER BY notes.uploaded_at DESC");
$all_notes = $notes_data ? $notes_data->fetchAll(PDO::FETCH_ASSOC) : [];
$cat_notes = ['Notes' => [], 'PYQs' => [], 'Assignments' => []];
foreach ($all_notes as $n) {
    // If category field is missing from DB (prior to migration), array key will be empty/null, so we default to 'Notes'
    $cat = !empty($n['category']) ? $n['category'] : 'Notes';
    if (!isset($cat_notes[$cat])) $cat_notes[$cat] = [];
    $cat_notes[$cat][] = $n;
}

// Stats
$total_notes = $conn->query("SELECT COUNT(*) as c FROM notes")->fetch(PDO::FETCH_ASSOC)['c'] ?? 0;
$total_users = $conn->query("SELECT COUNT(*) as c FROM users")->fetch(PDO::FETCH_ASSOC)['c'] ?? 0;
$total_subjects = count($all_subjects);

$active_page = 'dashboard';
?>
<!DOCTYPE html>
<html lang="en" data-theme="dark">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="description" content="StudyShare – Campus Resource Dashboard">
    <title>StudyShare | Dashboard</title>
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
            <div class="topbar-search">
                <span class="search-icon">🔍</span>
                <input type="text" id="globalSearch" placeholder="Search resources, subjects..." autocomplete="off">
            </div>
            <div class="topbar-actions">
                <button class="cyber-btn cyber-btn-secondary" onclick="document.getElementById('searchPanel').classList.add('open')" style="font-size:0.85rem; padding:8px 18px; margin-right:8px;">
                    <span style="margin-right:6px;">🔍</span> Discovery
                </button>
                <button class="theme-toggle" onclick="toggleTheme()" id="themeToggle">☀️</button>
                <button class="cyber-btn cyber-btn-success" onclick="openModal()" style="font-size:0.85rem; padding:8px 18px;">
                    + Upload
                </button>
            </div>
        </header>

        <!-- Page Content -->
        <div class="page-content">

            <!-- Welcome -->
            <div style="margin-bottom: 2rem;" class="slide-in-up">
                <h1 style="font-size: 1.8rem; margin-bottom: 4px;">
                    Welcome back, <span class="gradient-text"><?php echo htmlspecialchars($_SESSION['user_name']); ?></span>
                </h1>
                <p style="color: var(--text-muted); font-size: 0.95rem;">Access your study materials and resources</p>
            </div>

            <!-- Stats Row -->
            <div class="stats-row stagger-children">
                <div class="stat-card">
                    <div class="stat-icon">📄</div>
                    <div class="stat-value"><?= $total_notes ?></div>
                    <div class="stat-label">Total Resources</div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon">📚</div>
                    <div class="stat-value"><?= $total_subjects ?></div>
                    <div class="stat-label">Subjects</div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon">👥</div>
                    <div class="stat-value"><?= $total_users ?></div>
                    <div class="stat-label">Contributors</div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon">⚡</div>
                    <div class="stat-value">24/7</div>
                    <div class="stat-label">Available</div>
                </div>
            </div>

            <!-- Notes Category Carousel -->
            <?php if (!empty($cat_notes['Notes'])): ?>
            <div class="carousel-section slide-in-up">
                <div class="carousel-header">
                    <h3>📚 Study Notes</h3>
                    <div class="carousel-nav">
                        <button onclick="scrollCarousel('notes-cat', -1)">◀</button>
                        <button onclick="scrollCarousel('notes-cat', 1)">▶</button>
                    </div>
                </div>
                <div class="carousel-track" id="carousel-notes-cat">
                    <?php foreach ($cat_notes['Notes'] as $note): ?>
                    <div class="resource-card" onclick="window.location='view_document.php?id=<?= $note['id'] ?>'">
                        <div class="file-icon">
                            <?php
                            $ext = strtolower($note['file_type'] ?? '');
                            if ($ext === 'pdf') echo '📕';
                            elseif (in_array($ext, ['doc','docx'])) echo '📘';
                            elseif (in_array($ext, ['ppt','pptx'])) echo '📙';
                            elseif (in_array($ext, ['png','jpg','jpeg'])) echo '🖼️';
                            else echo '📄';
                            ?>
                        </div>
                        <h3><?= htmlspecialchars($note['title']) ?></h3>
                        <p style="color:var(--text-muted); font-size:0.8rem; margin-top:4px;">
                            <?= htmlspecialchars($note['subject_name']) ?>
                        </p>
                        <div class="resource-meta">
                            <span class="file-badge"><?= htmlspecialchars($note['file_type']) ?></span>
                            · <?= htmlspecialchars($note['uploader_name']) ?>
                        </div>
                    </div>
                    <?php endforeach; ?>
                </div>
            </div>
            <?php endif; ?>

            <!-- PYQs Category Carousel -->
            <?php if (!empty($cat_notes['PYQs'])): ?>
            <div class="carousel-section slide-in-up">
                <div class="carousel-header">
                    <h3>📜 Previous Year Questions</h3>
                    <div class="carousel-nav">
                        <button onclick="scrollCarousel('pyq-cat', -1)">◀</button>
                        <button onclick="scrollCarousel('pyq-cat', 1)">▶</button>
                    </div>
                </div>
                <div class="carousel-track" id="carousel-pyq-cat">
                    <?php foreach ($cat_notes['PYQs'] as $note): ?>
                    <div class="resource-card" onclick="window.location='view_document.php?id=<?= $note['id'] ?>'" style="border-color: rgba(6, 182, 212, 0.3);">
                        <div class="file-icon">
                            <?php
                            $ext = strtolower($note['file_type'] ?? '');
                            if ($ext === 'pdf') echo '📕';
                            elseif (in_array($ext, ['doc','docx'])) echo '📘';
                            elseif (in_array($ext, ['ppt','pptx'])) echo '📙';
                            else echo '📄';
                            ?>
                        </div>
                        <h3><?= htmlspecialchars($note['title']) ?></h3>
                        <p style="color:var(--text-muted); font-size:0.8rem; margin-top:4px;">
                            <?= htmlspecialchars($note['subject_name']) ?>
                        </p>
                        <div class="resource-meta">
                            <span class="file-badge" style="background:rgba(6, 182, 212, 0.1); color:var(--secondary);"><?= htmlspecialchars($note['file_type']) ?></span>
                            · <?= htmlspecialchars($note['uploader_name']) ?>
                        </div>
                    </div>
                    <?php endforeach; ?>
                </div>
            </div>
            <?php endif; ?>

            <!-- Assignments Category Carousel -->
            <?php if (!empty($cat_notes['Assignments'])): ?>
            <div class="carousel-section slide-in-up">
                <div class="carousel-header">
                    <h3>✏️ Assignments & Solved Labs</h3>
                    <div class="carousel-nav">
                        <button onclick="scrollCarousel('ass-cat', -1)">◀</button>
                        <button onclick="scrollCarousel('ass-cat', 1)">▶</button>
                    </div>
                </div>
                <div class="carousel-track" id="carousel-ass-cat">
                    <?php foreach ($cat_notes['Assignments'] as $note): ?>
                    <div class="resource-card" onclick="window.location='view_document.php?id=<?= $note['id'] ?>'" style="border-color: rgba(236, 72, 153, 0.3);">
                        <div class="file-icon">
                            <?php
                            $ext = strtolower($note['file_type'] ?? '');
                            if ($ext === 'pdf') echo '📕';
                            elseif (in_array($ext, ['doc','docx'])) echo '📘';
                            else echo '📄';
                            ?>
                        </div>
                        <h3><?= htmlspecialchars($note['title']) ?></h3>
                        <p style="color:var(--text-muted); font-size:0.8rem; margin-top:4px;">
                            <?= htmlspecialchars($note['subject_name']) ?>
                        </p>
                        <div class="resource-meta">
                            <span class="file-badge" style="background:rgba(236, 72, 153, 0.1); color:var(--pink);"><?= htmlspecialchars($note['file_type']) ?></span>
                            · <?= htmlspecialchars($note['uploader_name']) ?>
                        </div>
                    </div>
                    <?php endforeach; ?>
                </div>
            </div>
            <?php endif; ?>

            <!-- Theory Subjects Carousel -->
            <div class="carousel-section slide-in-up" id="subjects">
                <div class="carousel-header">
                    <h3>Theory Subjects</h3>
                    <div class="carousel-nav">
                        <button onclick="scrollCarousel('theory', -1)">◀</button>
                        <button onclick="scrollCarousel('theory', 1)">▶</button>
                    </div>
                </div>
                <div class="carousel-track" id="carousel-theory">
                    <?php foreach ($theory_subjects as $subject): ?>
                    <div class="subject-card" onclick="window.location='subject.php?id=<?= $subject['id'] ?>'">
                        <span class="card-type-label">Theory</span>
                        <h3><?= htmlspecialchars($subject['name']) ?></h3>
                        <p style="color:var(--text-muted); font-size:0.85rem;"><?= $subject['total_units'] ?> Units</p>
                        <div class="card-footer">
                            <span class="card-code"><?= htmlspecialchars($subject['code']) ?></span>
                            <span class="cyber-btn" style="padding:6px 14px; font-size:0.8rem;">Open →</span>
                        </div>
                    </div>
                    <?php endforeach; ?>
                </div>
            </div>

            <!-- Practical Subjects Carousel -->
            <?php if (!empty($practical_subjects)): ?>
            <div class="carousel-section slide-in-up">
                <div class="carousel-header">
                    <h3>Practical & Lab Work</h3>
                    <div class="carousel-nav">
                        <button onclick="scrollCarousel('practical', -1)">◀</button>
                        <button onclick="scrollCarousel('practical', 1)">▶</button>
                    </div>
                </div>
                <div class="carousel-track" id="carousel-practical">
                    <?php foreach ($practical_subjects as $subject): ?>
                    <div class="subject-card practical" onclick="window.location='subject.php?id=<?= $subject['id'] ?>'">
                        <span class="card-type-label">Practical</span>
                        <h3><?= htmlspecialchars($subject['name']) ?></h3>
                        <p style="color:var(--text-muted); font-size:0.85rem;">Lab Manuals & Code</p>
                        <div class="card-footer">
                            <span class="card-code"><?= htmlspecialchars($subject['code']) ?></span>
                            <span class="cyber-btn cyber-btn-secondary" style="padding:6px 14px; font-size:0.8rem;">Open →</span>
                        </div>
                    </div>
                    <?php endforeach; ?>
                </div>
            </div>
            <?php endif; ?>

        </div><!-- /page-content -->
    </div><!-- /main-content -->
</div><!-- /app-layout -->

<!-- UPLOAD MODAL -->
<div id="uploadModal" class="modal-overlay">
    <div class="modal-content pop-in">
        <div class="modal-header">
            <h2 class="gradient-text">Upload Resource</h2>
            <button class="modal-close" onclick="closeModal()">✕</button>
        </div>

        <form action="api/upload.php" method="POST" enctype="multipart/form-data" id="uploadForm">
            <!-- Dropzone -->
            <div class="dropzone" id="dropzone">
                <span class="drop-icon">📁</span>
                <p>Drag & drop your file here</p>
                <p class="drop-hint">or click to browse (PDF, DOC, PPT, IMG)</p>
                <input type="file" name="file" id="fileInput" required style="display:none;">
            </div>
            <!-- Upload File Preview Animation -->
            <div id="filePreview" class="preview-card" style="display:none;">
                <div class="preview-icon" id="previewIcon">📄</div>
                <div class="preview-details">
                    <span id="previewName" class="name">filename.pdf</span>
                    <span id="previewSize" class="size">2.4 MB</span>
                </div>
            </div>

            <div style="display:grid; grid-template-columns: 1fr 1fr; gap:12px; margin-top:1rem;">
                <div class="form-group">
                    <label>Category</label>
                    <select name="category" class="form-input" required>
                        <option value="Notes">Study Notes</option>
                        <option value="PYQs">Previous Year Questions (PYQs)</option>
                        <option value="Assignments">Assignments / Labs</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Subject</label>
                    <select name="subject_id" class="form-input" id="subjectSelect" required>
                        <option value="">-- Select Subject --</option>
                        <optgroup label="Theory">
                            <?php foreach ($theory_subjects as $s) echo "<option value='{$s['id']}'>" . htmlspecialchars($s['name']) . "</option>"; ?>
                        </optgroup>
                        <optgroup label="Practical">
                            <?php foreach ($practical_subjects as $s) echo "<option value='{$s['id']}'>" . htmlspecialchars($s['name']) . "</option>"; ?>
                        </optgroup>
                    </select>
                </div>
            </div>

            <div class="form-group">
                <label id="unit-label">Syllabus Unit <span style="text-transform:none; color:var(--text-muted);">(Optional)</span></label>
                <select id="unit-select" name="unit_number" class="form-input">
                    <option value="">-- Select subject first --</option>
                </select>
            </div>

            <div class="form-group">
                <label>Resource Title</label>
                <input type="text" name="title" class="form-input" required placeholder="e.g. Unit 1 Complete Notes">
            </div>

            <div style="display: flex; justify-content: flex-end; gap: 10px; margin-top: 1.5rem;">
                <button type="button" class="cyber-btn cyber-btn-ghost" onclick="closeModal()">Cancel</button>
                <button type="submit" class="cyber-btn cyber-btn-success">Upload →</button>
            </div>
        </form>
    </div>
</div>

<!-- AI Assistant -->
<?php $current_document_name = null; include 'includes/ai_assistant.php'; ?>

<!-- SEARCH & REQUEST PANEL -->
<div id="searchPanel" class="slide-panel">
    <div class="panel-header">
        <h2 class="gradient-text">Search & Request</h2>
        <button class="modal-close" onclick="document.getElementById('searchPanel').classList.remove('open')">✕</button>
    </div>
    <div class="panel-body">
        <div class="form-group" style="margin-bottom:2rem;">
            <input type="text" id="advancedSearch" class="form-input" placeholder="Type to search..." autocomplete="off">
        </div>
        
        <div id="advancedSearchResults">
            <p style="color:var(--text-muted); font-size:0.9rem; text-align:center;">Type above to search across all resources.</p>
        </div>
        
        <div class="not-found" style="margin-top: 3rem; padding: 1.5rem; background: rgba(124, 58, 237, 0.05); border: 1px dashed rgba(124, 58, 237, 0.3); border-radius: 16px; text-align: center;">
            <span style="font-size: 2rem; margin-bottom:10px; display:block;">🤔</span>
            <h4 style="margin-bottom:8px; font-size:1rem; color:var(--text-primary);">Didn't find what you need?</h4>
            <p style="color: var(--text-secondary); font-size:0.85rem; margin-bottom: 1.2rem;">You can request a specific document, PYQ, or notes from the community.</p>
            <button class="cyber-btn cyber-btn-full" onclick="document.getElementById('requestDocModal').classList.add('open')">📝 Request Document</button>
        </div>
    </div>
</div>

<!-- REQUEST DOC MODAL -->
<div id="requestDocModal" class="modal-overlay">
    <div class="modal-content pop-in">
        <div class="modal-header">
            <h2 class="gradient-text">Request Resource</h2>
            <button class="modal-close" onclick="document.getElementById('requestDocModal').classList.remove('open')">✕</button>
        </div>
        <form action="api/request_doc.php" method="POST">
            <div class="form-group">
                <label>Resource Title / Topic</label>
                <input type="text" name="title" class="form-input" required placeholder="e.g. 2023 End Sem Paper">
            </div>
            <div class="form-group">
                <label>Subject</label>
                <select name="subject_id" class="form-input" required>
                    <option value="">-- Select Subject --</option>
                    <optgroup label="Theory">
                        <?php foreach ($theory_subjects as $s) echo "<option value='{$s['id']}'>" . htmlspecialchars($s['name']) . "</option>"; ?>
                    </optgroup>
                    <optgroup label="Practical">
                        <?php foreach ($practical_subjects as $s) echo "<option value='{$s['id']}'>" . htmlspecialchars($s['name']) . "</option>"; ?>
                    </optgroup>
                </select>
            </div>
            <div class="form-group">
                <label>Additional Details</label>
                <textarea name="details" class="form-input" rows="3" placeholder="Any specific requirements..."></textarea>
            </div>
            <div style="display: flex; justify-content: flex-end; gap: 10px; margin-top: 1.5rem;">
                <button type="button" class="cyber-btn cyber-btn-ghost" onclick="document.getElementById('requestDocModal').classList.remove('open')">Cancel</button>
                <button type="submit" class="cyber-btn cyber-btn-success">Submit Request →</button>
            </div>
        </form>
    </div>
</div>

<script src="js/theme.js"></script>
<script src="js/app.js"></script>
<script>
    // Upload modal
    function openModal() { document.getElementById('uploadModal').classList.add('open'); }
    function closeModal() { document.getElementById('uploadModal').classList.remove('open'); }
    window.addEventListener('click', e => { if (e.target.id === 'uploadModal') closeModal(); });

    // Build a map of subject_id => type from PHP
    const subjectTypes = {
        <?php foreach ($theory_subjects as $s): ?>
        <?= $s['id'] ?>: 'theory',
        <?php endforeach; ?>
        <?php foreach ($practical_subjects as $s): ?>
        <?= $s['id'] ?>: 'practical',
        <?php endforeach; ?>
    };

    // Dynamic unit fetch
    const subjectSelect = document.getElementById('subjectSelect');
    const unitSelect = document.getElementById('unit-select');
    const unitLabel = document.getElementById('unit-label');

    subjectSelect.addEventListener('change', async function() {
        const sid = this.value;
        const isPractical = subjectTypes[sid] === 'practical';
        const termUnit = isPractical ? 'Practical' : 'Unit';

        // Update label
        unitLabel.innerHTML = isPractical
            ? `Lab Practical <span style="text-transform:none; color:var(--text-muted);">(Optional)</span>`
            : `Syllabus Unit <span style="text-transform:none; color:var(--text-muted);">(Optional)</span>`;

        unitSelect.innerHTML = '<option value="">-- Loading... --</option>';
        if (!sid) { unitSelect.innerHTML = '<option value="">-- Select subject first --</option>'; return; }

        try {
            const res = await fetch(`api/get_units.php?subject_id=${sid}`);
            const units = await res.json();
            if (units.length > 0) {
                unitSelect.innerHTML = `<option value="">-- Select ${termUnit} --</option>`;
                units.forEach(u => {
                    const opt = document.createElement('option');
                    opt.value = u.unit_number;
                    opt.textContent = `${termUnit} ${u.unit_number}: ${u.unit_name}`;
                    unitSelect.appendChild(opt);
                });
            } else {
                unitSelect.innerHTML = `<option value="">-- No ${termUnit.toLowerCase()}s mapped --</option>`;
            }
        } catch(err) {
            unitSelect.innerHTML = '<option value="">-- Error loading --</option>';
        }
    });

    // Dropzone
    const dropzone = document.getElementById('dropzone');
    const fileInput = document.getElementById('fileInput');

    dropzone.addEventListener('click', () => fileInput.click());
    dropzone.addEventListener('dragover', e => { e.preventDefault(); dropzone.classList.add('drag-over'); });
    dropzone.addEventListener('dragleave', () => dropzone.classList.remove('drag-over'));
    dropzone.addEventListener('drop', e => {
        e.preventDefault();
        dropzone.classList.remove('drag-over');
        if (e.dataTransfer.files.length) {
            fileInput.files = e.dataTransfer.files;
            showFilePreview(e.dataTransfer.files[0]);
        }
    });
    fileInput.addEventListener('change', () => {
        if (fileInput.files.length) showFilePreview(fileInput.files[0]);
    });

    function showFilePreview(file) {
        const ext = file.name.split('.').pop().toLowerCase();
        const icons = {pdf:'📕', doc:'📘', docx:'📘', ppt:'📙', pptx:'📙', png:'🖼️', jpg:'🖼️', jpeg:'🖼️', txt:'📄'};
        document.getElementById('previewIcon').textContent = icons[ext] || '📄';
        document.getElementById('previewName').textContent = file.name;
        
        let size = (file.size / 1024 / 1024).toFixed(2);
        document.getElementById('previewSize').textContent = size > 0 ? size + ' MB' : (file.size / 1024).toFixed(0) + ' KB';
        
        // Hide dropzone, show preview card with animation
        dropzone.style.display = 'none';
        
        const preview = document.getElementById('filePreview');
        preview.style.display = 'flex';
        
        // Reset animation by removing and re-adding
        preview.style.animation = 'none';
        preview.offsetHeight; /* trigger reflow */
        preview.style.animation = null;
        
        // Append input to form so it stays
        document.getElementById('uploadForm').appendChild(fileInput);
    }

    // Search filter
    document.getElementById('globalSearch').addEventListener('input', function() {
        const q = this.value.toLowerCase();
        document.querySelectorAll('.subject-card, .resource-card').forEach(card => {
            const text = card.textContent.toLowerCase();
            card.style.display = text.includes(q) ? '' : 'none';
        });
    });
</script>
</body>
</html>
