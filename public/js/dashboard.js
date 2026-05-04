document.addEventListener('DOMContentLoaded', async () => {
  const user = requireAuth();
  if (!user) return;
  document.getElementById('welcome-name').textContent = user.name;
  renderSidebar('dashboard');
  const [subjectsRes, notesRes] = await Promise.all([
    fetch('/api/content?action=get_subjects').then((r) => r.json()),
    fetch('/api/content?action=get_notes').then((r) => r.json()),
  ]);
  const { subjects = [], stats = {} } = subjectsRes;
  const allNotes = Array.isArray(notesRes) ? notesRes : [];
  const theorySubjects = subjects.filter((s) => s.type === 'theory');
  const practicalSubjects = subjects.filter((s) => s.type === 'practical');
  document.getElementById('stat-notes').textContent = stats.total_notes || 0;
  document.getElementById('stat-subjects').textContent = stats.total_subjects || 0;
  document.getElementById('stat-users').textContent = stats.total_users || 0;
  const catNotes = { Notes: [], PYQs: [], Assignments: [] };
  allNotes.forEach((n) => { const cat = n.category || 'Notes'; if (!catNotes[cat]) catNotes[cat] = []; catNotes[cat].push(n); });
  renderNoteCarousel('carousel-notes-cat', catNotes['Notes'], 'carousel-section-notes');
  renderNoteCarousel('carousel-pyq-cat', catNotes['PYQs'], 'carousel-section-pyq', 'rgba(6,182,212,0.1)', 'var(--secondary)');
  renderNoteCarousel('carousel-ass-cat', catNotes['Assignments'], 'carousel-section-ass', 'rgba(236,72,153,0.1)', 'var(--pink)');
  renderSubjectCarousel('carousel-theory', theorySubjects, 'theory');
  renderSubjectCarousel('carousel-practical', practicalSubjects, 'practical');
  populateSubjectSelect('subjectSelect', subjects);
  populateSubjectSelect('req-subject-select', subjects);
  storeSubjectTypes(subjects);
  setupUploadForm();
  setupRequestForm();
  setupSearch(allNotes, subjects);
});
function fileIcon(ext) {
  const e = (ext || '').toLowerCase();
  if (e === 'pdf') return '📕';
  if (['doc','docx'].includes(e)) return '📘';
  if (['ppt','pptx'].includes(e)) return '📙';
  if (['png','jpg','jpeg'].includes(e)) return '🖼️';
  return '📄';
}
function renderNoteCarousel(trackId, notes, sectionId, badgeBg = 'rgba(99,102,241,0.1)', badgeColor = 'var(--accent)') {
  const section = document.getElementById(sectionId);
  if (!notes || !notes.length) { if (section) section.style.display = 'none'; return; }
  if (section) section.style.display = '';
  const track = document.getElementById(trackId);
  if (!track) return;
  track.innerHTML = notes.map((n) => `
    <div class="resource-card" onclick="window.location='/view_document?id=${n.id}'">
      <div class="file-icon">${fileIcon(n.file_type)}</div>
      <h3>${escHtml(n.title)}</h3>
      <p style="color:var(--text-muted);font-size:0.8rem;margin-top:4px;">${escHtml(n.subject_name)}</p>
      <div class="resource-meta">
        <span class="file-badge" style="background:${badgeBg};color:${badgeColor};">${escHtml(n.file_type || '')}</span>
        · ${escHtml(n.uploader_name)}
      </div>
    </div>`).join('');
}
function renderSubjectCarousel(trackId, subjects, type) {
  const track = document.getElementById(trackId);
  if (!track) return;
  track.innerHTML = subjects.map((s) => `
    <div class="subject-card ${type === 'practical' ? 'practical' : ''}" onclick="window.location='/subject?id=${s.id}'">
      <span class="card-type-label">${type === 'practical' ? 'Practical' : 'Theory'}</span>
      <h3>${escHtml(s.name)}</h3>
      <p style="color:var(--text-muted);font-size:0.85rem;">${s.total_units} Units</p>
      <div class="card-footer">
        <span class="card-code">${escHtml(s.code || '')}</span>
        <span class="cyber-btn" style="padding:6px 14px;font-size:0.8rem;">Open →</span>
      </div>
    </div>`).join('');
}
function populateSubjectSelect(selectId, subjects) {
  const sel = document.getElementById(selectId);
  if (!sel) return;
  const theory = subjects.filter(s => s.type === 'theory'), practical = subjects.filter(s => s.type === 'practical');
  sel.innerHTML = `<option value="">-- Select Subject --</option>
    <optgroup label="Theory">${theory.map(s => `<option value="${s.id}">${escHtml(s.name)}</option>`).join('')}</optgroup>
    <optgroup label="Practical">${practical.map(s => `<option value="${s.id}">${escHtml(s.name)}</option>`).join('')}</optgroup>`;
}
let subjectTypesMap = {};
function storeSubjectTypes(subjects) { subjects.forEach(s => { subjectTypesMap[s.id] = s.type; }); }
function setupUploadForm() {
  const subjectSelect = document.getElementById('subjectSelect'), unitSelect = document.getElementById('unit-select'), unitLabel = document.getElementById('unit-label');
  subjectSelect?.addEventListener('change', async function () {
    const sid = this.value, isPractical = subjectTypesMap[sid] === 'practical', termUnit = isPractical ? 'Practical' : 'Unit';
    unitLabel.innerHTML = `${isPractical ? 'Lab Practical' : 'Syllabus Unit'} <span style="color:var(--text-muted)">(Optional)</span>`;
    unitSelect.innerHTML = '<option value="">-- Loading... --</option>';
    if (!sid) { unitSelect.innerHTML = '<option value="">-- Select subject first --</option>'; return; }
    const units = await fetch(`/api/content?action=get_units&sid=${sid}`).then(r => r.json());
    unitSelect.innerHTML = units.length
      ? `<option value="">-- Select ${termUnit} --</option>` + units.map(u => `<option value="${u.unit_number}">${termUnit} ${u.unit_number}: ${escHtml(u.title || 'Untitled')}</option>`).join('')
      : `<option value="">-- No ${termUnit.toLowerCase()}s found --</option>`;
  });
  const dropzone = document.getElementById('dropzone'), fileInput = document.getElementById('fileInput');
  dropzone?.addEventListener('click', () => fileInput.click());
  dropzone?.addEventListener('dragover', e => { e.preventDefault(); dropzone.classList.add('drag-over'); });
  dropzone?.addEventListener('dragleave', () => dropzone.classList.remove('drag-over'));
  dropzone?.addEventListener('drop', e => { e.preventDefault(); dropzone.classList.remove('drag-over'); if (e.dataTransfer.files.length) { fileInput.files = e.dataTransfer.files; showFilePreview(e.dataTransfer.files[0]); } });
  fileInput?.addEventListener('change', () => { if (fileInput.files.length) showFilePreview(fileInput.files[0]); });
  document.getElementById('uploadForm')?.addEventListener('submit', async function (e) {
    e.preventDefault();
    const btn = this.querySelector('button[type="submit"]'), fileInput = document.getElementById('fileInput'), file = fileInput?.files?.[0];
    if (!file) return alert('Please select a file first.');
    if (file.size > 8 * 1024 * 1024) return alert('File size exceeds 8 MB limit.');
    btn.disabled = true; btn.textContent = 'Uploading...';
    const fileBase64 = await new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(reader.result.split(',')[1]); reader.onerror = reject; reader.readAsDataURL(file); });
    const formData = new FormData(this);
    const payload = { fileBase64, fileName: file.name, mimeType: file.type || 'application/octet-stream', category: formData.get('category') || 'Notes', subject_id: formData.get('subject_id'), title: formData.get('title'), unit_number: formData.get('unit_number') || null };
    const res = await fetch('/api/upload', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getToken()}` }, body: JSON.stringify(payload) });
    const data = await res.json();
    btn.disabled = false; btn.textContent = 'Upload →';
    if (res.ok) { 
      showToast('Document uploaded successfully!', 'success');
      closeModal(); 
      setTimeout(() => {
        window.location.href = `/subject?id=${data.subjectId}` + (data.unitNumber ? `&unit=${data.unitNumber}` : '');
      }, 1500);
    } else { 
      showToast('Upload failed: ' + (data.error || 'Unknown error'), 'error'); 
    }
  });
}
function showFilePreview(file) {
  const icons = { pdf:'📕', doc:'📘', docx:'📘', ppt:'📙', pptx:'📙', png:'🖼️', jpg:'🖼️', jpeg:'🖼️', txt:'📄' }, ext = file.name.split('.').pop().toLowerCase();
  document.getElementById('previewIcon').textContent = icons[ext] || '📄';
  document.getElementById('previewName').textContent = file.name;
  const sizeMB = (file.size / 1024 / 1024).toFixed(2);
  document.getElementById('previewSize').textContent = sizeMB > 0 ? sizeMB + ' MB' : (file.size / 1024).toFixed(0) + ' KB';
  document.getElementById('dropzone').style.display = 'none';
  const preview = document.getElementById('filePreview');
  preview.style.display = 'flex'; preview.style.animation = 'none'; preview.offsetHeight; preview.style.animation = null;
}
function setupRequestForm() {
  document.getElementById('requestDocForm')?.addEventListener('submit', async function (e) {
    e.preventDefault();
    const body = Object.fromEntries(new FormData(this));
    const res = await fetch('/api/content', { method: 'POST', headers: getAuthHeaders(), body: JSON.stringify({ ...body, action: 'request_doc' }) });
    const data = await res.json();
    document.getElementById('requestDocModal').classList.remove('open');
    if (res.ok) {
      showToast('Request submitted successfully!', 'success');
      this.reset();
    } else {
      showToast('Error: ' + data.error, 'error');
    }
  });
}
function setupSearch(notes, subjects) {
  document.getElementById('globalSearch')?.addEventListener('input', function () {
    const q = this.value.toLowerCase();
    document.querySelectorAll('.subject-card,.resource-card').forEach(card => card.style.display = card.textContent.toLowerCase().includes(q) ? '' : 'none');
  });
  const advSearch = document.getElementById('advancedSearch');
  if (advSearch) {
    advSearch.addEventListener('input', function () {
      const q = this.value.toLowerCase().trim(), container = document.getElementById('advancedSearchResults');
      if (!q) { container.innerHTML = '<p style="color:var(--text-muted);font-size:0.9rem;text-align:center;">Type above to search across all resources.</p>'; return; }
      const results = notes.filter(n => n.title.toLowerCase().includes(q) || n.subject_name.toLowerCase().includes(q));
      container.innerHTML = results.length ? results.slice(0, 15).map(n => `<div class="resource-card" style="margin-bottom:8px;cursor:pointer;" onclick="window.location='/view_document?id=${n.id}'"><div class="file-icon" style="font-size:1.5rem">${fileIcon(n.file_type)}</div><div><strong>${escHtml(n.title)}</strong><p style="font-size:0.8rem;color:var(--text-muted)">${escHtml(n.subject_name)}</p></div></div>`).join('') : '<p style="color:var(--text-muted);text-align:center">No results found.</p>';
    });
  }
}
function openModal() { document.getElementById('uploadModal')?.classList.add('open'); }
function closeModal() { document.getElementById('uploadModal')?.classList.remove('open'); }
window.addEventListener('click', e => { if (e.target.id === 'uploadModal') closeModal(); });
window.openModal = openModal; window.closeModal = closeModal;
