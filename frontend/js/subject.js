/**
 * js/subject.js
 * Fetches subject info, notes, and units from the API and renders the subject page.
 */

document.addEventListener('DOMContentLoaded', async () => {
  const user = requireAuth();
  if (!user) return;

  renderSidebar('resources');
  applyTheme(getTheme());

  const params     = new URLSearchParams(location.search);
  const subjectId  = params.get('id');
  const unitFilter = params.get('unit') ? parseInt(params.get('unit')) : 0;

  if (!subjectId) { window.location.href = '/dashboard'; return; }

  // Fetch subject from subjects list, and notes + units in parallel
  const [subjectsRes, notesRes, unitsRes] = await Promise.all([
    fetch('/api/subjects').then(r => r.json()),
    fetch(`/api/notes?subject_id=${subjectId}${unitFilter ? '&unit=' + unitFilter : ''}`).then(r => r.json()),
    fetch(`/api/get_units?subject_id=${subjectId}`).then(r => r.json()),
  ]);

  const subject = (subjectsRes.subjects || []).find(s => s.id == subjectId);
  if (!subject) { window.location.href = '/dashboard'; return; }

  const notes = Array.isArray(notesRes) ? notesRes : [];
  const units = Array.isArray(unitsRes) ? unitsRes  : [];
  const isPractical = subject.type === 'practical';
  const label = isPractical ? 'Practical' : 'Unit';

  // ── Topbar ──────────────────────────────────────────────────────────────────
  document.getElementById('subject-name-h3').textContent = subject.name;
  document.getElementById('subject-code-p').textContent = `${subject.code || ''} · ${isPractical ? 'Practical' : 'Theory'}`;
  const syllabusBtnEl = document.getElementById('syllabus-btn');
  if (subject.syllabus_file) {
    syllabusBtnEl.href = '/' + subject.syllabus_file;
    syllabusBtnEl.style.display = '';
  } else { syllabusBtnEl.style.display = 'none'; }

  // ── Subject header ──────────────────────────────────────────────────────────
  document.getElementById('subject-title').textContent = subject.name;
  document.getElementById('subject-meta').textContent = `${units.length} ${isPractical ? 'Lab Experiments' : 'Syllabus Units'} · ${notes.length} Resources Available`;

  // ── Unit filters ────────────────────────────────────────────────────────────
  const filtersEl = document.getElementById('unit-filters');
  if (units.length) {
    filtersEl.innerHTML =
      `<a href="/subject?id=${subjectId}" class="unit-btn ${unitFilter === 0 ? 'active' : ''}">All ${isPractical ? 'Labs' : 'Units'}</a>` +
      units.filter(u => u.unit_number).map(u =>
        `<a href="/subject?id=${subjectId}&unit=${u.unit_number}" class="unit-btn ${unitFilter == u.unit_number ? 'active' : ''}">
          ${label} ${u.unit_number}${u.unit_name ? ': ' + escHtml(u.unit_name) : ''}
        </a>`
      ).join('');
  } else { filtersEl.style.display = 'none'; }

  // ── Notes Grid ──────────────────────────────────────────────────────────────
  const gridEl = document.getElementById('notes-grid');
  if (!notes.length) {
    gridEl.innerHTML = `
      <div class="glass-panel empty-state" style="grid-column:1/-1;">
        <div style="font-size:3rem;margin-bottom:1rem;">📭</div>
        <h3 style="margin-bottom:8px;">No documents yet</h3>
        <p style="color:var(--text-muted);">Be the first to upload a resource for this subject!</p>
      </div>`;
  } else {
    gridEl.innerHTML = notes.map(n => {
      const noteLbl = isPractical ? 'Practical' : 'Unit';
      return `
        <div class="note-card" onclick="window.location='/view_document?id=${n.id}'">
          <div class="note-file-icon">${fileIcon(n.file_type)}</div>
          <div class="note-info">
            <h4>${escHtml(n.title)}</h4>
            <div class="note-detail">
              <span class="file-badge">${escHtml(n.file_type || '')}</span>
              ${n.unit_number ? `<span class="file-badge" style="background:rgba(6,182,212,0.1);color:var(--secondary);">${noteLbl} ${n.unit_number}</span>` : ''}
            </div>
            <div class="note-detail" style="margin-top:6px;">
              ${escHtml(n.uploader_name)} · ${new Date(n.uploaded_at).toLocaleDateString('en-GB', {day:'numeric',month:'short',year:'numeric'})}
            </div>
          </div>
        </div>`;
    }).join('');
  }
});

function fileIcon(ext) {
  const e = (ext || '').toLowerCase();
  if (e === 'pdf') return '📕';
  if (['doc','docx'].includes(e)) return '📘';
  if (['ppt','pptx'].includes(e)) return '📙';
  if (['png','jpg','jpeg'].includes(e)) return '🖼️';
  return '📄';
}

function getTheme() { return localStorage.getItem('gsfc_theme') || 'dark'; }
function applyTheme(t) { document.documentElement.setAttribute('data-theme', t); }
