/**
 * js/view_document.js
 * Fetches a single note's data and renders the document viewer page.
 */

document.addEventListener('DOMContentLoaded', async () => {
  const user = requireAuth();
  if (!user) return;

  renderSidebar('resources');
  applyTheme(getTheme());

  const params = new URLSearchParams(location.search);
  const noteId = params.get('id');
  if (!noteId) { window.location.href = '/dashboard'; return; }

  const note = await fetch(`/api/notes?id=${noteId}`).then(r => r.ok ? r.json() : null);
  if (!note) { window.location.href = '/dashboard'; return; }

  // Set page title
  document.title = `StudyShare | ${note.title}`;

  // Topbar
  document.getElementById('back-link').href    = `/subject?id=${note.subject_id}`;
  document.getElementById('doc-title-h3').textContent   = note.title;
  document.getElementById('doc-subject-p').textContent  = note.subject_name || '';
  document.getElementById('download-btn').href = note.file_path;

  // Document viewer
  const ext = (note.file_type || '').toLowerCase();
  const canPreview = ['pdf','png','jpg','jpeg','gif','txt'].includes(ext);
  const viewerEl = document.getElementById('doc-viewer-main');

  if (canPreview) {
    if (ext === 'pdf' || ext === 'txt') {
      viewerEl.innerHTML = `<iframe src="${escHtml(note.file_path)}" title="Document Preview" style="width:100%;height:100%;border:none;border-radius:8px;"></iframe>`;
    } else {
      viewerEl.innerHTML = `<img src="${escHtml(note.file_path)}" alt="${escHtml(note.title)}" style="max-width:90%;max-height:90%;object-fit:contain;border-radius:8px;">`;
    }
  } else {
    const icons = { doc:'📘', docx:'📘', ppt:'📙', pptx:'📙' };
    viewerEl.innerHTML = `
      <div class="no-preview">
        <span class="big-icon">${icons[ext] || '📄'}</span>
        <h3>Preview not available</h3>
        <p style="margin-top:8px;font-size:0.9rem;">This file type (.${ext}) cannot be previewed in-browser.</p>
        <a href="${escHtml(note.file_path)}" target="_blank" class="cyber-btn cyber-btn-success" style="margin-top:1.5rem;">⬇ Download to View</a>
      </div>`;
  }

  // Sidebar info
  document.getElementById('info-title').textContent   = note.title;
  document.getElementById('info-subject').textContent = `${note.subject_name || ''} (${note.subject_code || ''})`;
  document.getElementById('info-uploader').textContent = note.uploader_name || 'Unknown';
  document.getElementById('info-date').textContent = new Date(note.uploaded_at).toLocaleString('en-GB', {
    day:'numeric', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit'
  });
  document.getElementById('info-type').textContent = ext.toUpperCase();

  const unitRow = document.getElementById('info-unit-row');
  if (note.unit_number) {
    document.getElementById('info-unit').textContent =
      `Unit ${note.unit_number}${note.unit_name ? ': ' + note.unit_name : ''}`;
    unitRow.style.display = '';
  } else { unitRow.style.display = 'none'; }

  document.getElementById('info-downloads').textContent = note.download_count || 0;
  document.getElementById('doc-rating-avg').textContent = note.avg_rating || '0.0';

  // Fetch uploader profile for rating
  if (note.user_id) {
    fetch(`/api/profile?id=${note.user_id}`, { headers: getAuthHeaders() })
      .then(r => r.json())
      .then(data => {
        if (data.stats) {
          document.getElementById('user-rating-avg').textContent = data.stats.avgRating || '0.0';
        }
      });
  }

  // Download tracking
  const trackDownload = async () => {
    fetch('/api/download_track', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ id: note.id })
    });
    // Optimistic UI
    const countEl = document.getElementById('info-downloads');
    countEl.textContent = parseInt(countEl.textContent) + 1;
  };
  document.getElementById('download-btn').addEventListener('click', trackDownload);
  document.getElementById('download-btn-sidebar').addEventListener('click', trackDownload);

  // Document Rating Logic
  document.querySelectorAll('#doc-rating-stars [data-star]').forEach(star => {
    star.addEventListener('click', async () => {
      const rating = parseInt(star.dataset.star);
      const res = await fetch('/api/rate_document', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ document_id: note.id, rating })
      });
      if (res.ok) {
        alert('Rating submitted!');
        location.reload();
      } else {
        const d = await res.json();
        alert(d.error || 'Failed to submit rating.');
      }
    });
    star.addEventListener('mouseover', () => highlightStars('doc-rating-stars', star.dataset.star));
    star.addEventListener('mouseout', () => resetStars('doc-rating-stars', note.avg_rating));
  });

  // User Rating Logic
  document.getElementById('rate-user-btn')?.addEventListener('click', async () => {
    const rating = prompt('Rate this contributor (1-5):');
    if (!rating) return;
    const res = await fetch('/api/rate_user', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ reviewee_id: note.user_id, rating: parseInt(rating) })
    });
    if (res.ok) {
      alert('Review submitted!');
      location.reload();
    } else {
      const d = await res.json();
      alert(d.error || 'Failed to submit review.');
    }
  });

  function highlightStars(containerId, count) {
    document.querySelectorAll(`#${containerId} [data-star]`).forEach(s => {
      s.textContent = parseInt(s.dataset.star) <= count ? '★' : '☆';
    });
  }
  function resetStars(containerId, avg) {
    highlightStars(containerId, Math.round(avg));
  }
  resetStars('doc-rating-stars', note.avg_rating);


  // Download / more-from-subject links
  document.getElementById('download-btn-sidebar').href        = note.file_path;
  document.getElementById('more-from-subject-btn').href       = `/subject?id=${note.subject_id}`;
  document.getElementById('report-note-id').value             = note.id;

  // Set AI context
  if (window.setAIContext) window.setAIContext(note.title);

  // Report form
  document.getElementById('reportDocForm')?.addEventListener('submit', async function (e) {
    e.preventDefault();
    const body = Object.fromEntries(new FormData(this));
    const res = await fetch('/api/report_doc', {
      method: 'POST', headers: getAuthHeaders(), body: JSON.stringify(body),
    });
    const data = await res.json();
    document.getElementById('reportDocModal').classList.remove('open');
    alert(res.ok ? data.message : 'Error: ' + data.error);
  });
});

function getTheme() { return localStorage.getItem('gsfc_theme') || 'dark'; }
function applyTheme(t) { document.documentElement.setAttribute('data-theme', t); }
