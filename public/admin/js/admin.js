document.addEventListener('DOMContentLoaded', () => {
  const user = requireAuth();
  const SUPER_ADMIN = 'dharmchaniyara7368@gmail.com';
  if (!user || user.role !== 'admin' || user.email !== SUPER_ADMIN) { 
    alert('Access Denied. Only the Super Admin can access this panel.'); 
    window.location.href = '/dashboard'; 
    return; 
  }
  const adminNameEl = document.getElementById('adminName');
  if (adminNameEl) adminNameEl.textContent = user.name || 'Admin';
  const navItems = document.querySelectorAll('.admin-tab[data-target]'), sections = document.querySelectorAll('.view-section');
  navItems.forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      navItems.forEach(nav => nav.classList.remove('active')); sections.forEach(sec => sec.classList.remove('active'));
      item.classList.add('active');
      document.getElementById(`view-${item.dataset.target}`).classList.add('active');
      loadDataForSection(item.dataset.target);
    });
  });
  loadDataForSection('dashboard');
  const searchUsers = document.getElementById('searchUsers');
  if (searchUsers) { let timeout = null; searchUsers.addEventListener('input', () => { clearTimeout(timeout); timeout = setTimeout(() => fetchUsers(searchUsers.value), 500); }); }
  const searchDocs = document.getElementById('searchDocs'), filterDocs = document.getElementById('filterDocsStatus');
  if (searchDocs && filterDocs) {
    const handleDocsSearch = () => { fetchDocuments(searchDocs.value, filterDocs.value); };
    let timeout = null; searchDocs.addEventListener('input', () => { clearTimeout(timeout); timeout = setTimeout(handleDocsSearch, 500); });
    filterDocs.addEventListener('change', handleDocsSearch);
  }

  // Hook up subjectForm submission
  const subjectForm = document.getElementById('subjectForm');
  if (subjectForm) {
    subjectForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const id = document.getElementById('subjectId').value;
      const name = document.getElementById('subjName').value;
      const code = document.getElementById('subjCode').value;
      const type = document.getElementById('subjType').value;
      const syllabus_file = document.getElementById('subjSyllabusFile').value;

      try {
        const payload = { action: 'subject_update', name, code, type, syllabus_file };
        if (id) payload.id = parseInt(id);
        const res = await fetch('/api/admin_panel', {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify(payload)
        });
        if (res.ok) {
          closeSubjectModal();
          fetchSubjects();
        } else {
          alert('Failed to save subject.');
        }
      } catch (err) {
        console.error(err);
      }
    });
  }
});

function loadDataForSection(section) {
  switch(section) {
    case 'dashboard': fetchStats(); break;
    case 'users': fetchUsers(); break;
    case 'documents': fetchDocuments(); break;
    case 'subjects': fetchSubjects(); break;
    case 'reports': fetchReports(); break;
    case 'requests': fetchRequests(); break;
  }
}

async function fetchStats() {
  try {
    const res = await fetch('/api/admin_panel?action=stats', { headers: getAuthHeaders() });
    if (!res.ok) { if (res.status === 403) return logout(); throw new Error('Failed to fetch stats'); }
    const data = await res.json();
    document.getElementById('stat-users').textContent = data.totalUsers;
    document.getElementById('stat-docs').textContent = data.totalDocuments;
    document.getElementById('stat-subjects').textContent = data.totalSubjects;
    document.getElementById('stat-reports').textContent = data.totalReports;
    const tbody = document.getElementById('recentDocsTable');
    tbody.innerHTML = '';
    if (data.recentDocuments.length === 0) { tbody.innerHTML = '<tr><td colspan="3">No recent documents</td></tr>'; return; }
    data.recentDocuments.forEach(doc => { tbody.innerHTML += `<tr><td>${escHtml(doc.title)}</td><td>${escHtml(doc.uploader_name)}</td><td>${new Date(doc.uploaded_at).toLocaleDateString()}</td></tr>`; });
  } catch (err) { console.error(err); }
}

async function fetchUsers(search = '') {
  try {
    const res = await fetch(`/api/admin_panel?action=users_list&search=${encodeURIComponent(search)}`, { headers: getAuthHeaders() });
    const { users } = await res.json();
    const tbody = document.getElementById('usersTable');
    tbody.innerHTML = '';
    users.forEach(u => {
      const isBlocked = u.status === 'blocked', actionBtn = isBlocked ? `<button class="cyber-btn cyber-btn-success" onclick="updateUserStatus(${u.id}, 'unblock')">Unblock</button>` : `<button class="cyber-btn cyber-btn-danger" onclick="updateUserStatus(${u.id}, 'block')">Block</button>`;
      
      const ratingStr = u.avg_rating !== 'N/A'
        ? `<a href="#" onclick="showUserReviews(event, ${u.id}, '${escHtml(u.name.replace(/'/g, "\\'"))}')" style="color: var(--secondary); text-decoration: underline;">⭐ ${u.avg_rating} (${u.review_count})</a>`
        : '<span style="color: var(--text-muted)">No reviews</span>';

      tbody.innerHTML += `<tr>
        <td>${escHtml(u.name)}</td>
        <td>${escHtml(u.email)}</td>
        <td><span class="badge ${u.role}">${u.role}</span></td>
        <td>${ratingStr}</td>
        <td><span class="badge ${u.status}">${u.status}</span></td>
        <td style="display: flex; gap: 8px;">
          ${u.role !== 'admin' ? actionBtn : ''}
          ${u.role !== 'admin' ? `<button class="cyber-btn cyber-btn-danger" onclick="deleteUser(${u.id})">Delete</button>` : ''}
        </td>
      </tr>`;
    });
  } catch (err) { console.error(err); }
}

async function updateUserStatus(id, action) {
  if (!confirm(`Are you sure you want to ${action} this user?`)) return;
  try {
    const res = await fetch('/api/admin_panel', { method: 'POST', headers: getAuthHeaders(), body: JSON.stringify({ action: 'user_update', id, subAction: action }) });
    if (res.ok) fetchUsers(document.getElementById('searchUsers')?.value || ''); else alert(await res.text());
  } catch (err) { console.error(err); }
}

async function deleteUser(id) {
  if (!confirm('Warning: This will permanently delete the user and their uploads. Continue?')) return;
  try {
    const res = await fetch('/api/admin_panel', { method: 'POST', headers: getAuthHeaders(), body: JSON.stringify({ action: 'user_update', id, subAction: 'delete' }) });
    if (res.ok) fetchUsers(document.getElementById('searchUsers')?.value || ''); else alert(await res.text());
  } catch (err) { console.error(err); }
}

async function fetchDocuments(search = '', status = '') {
  try {
    const res = await fetch(`/api/admin_panel?action=docs_list&docSearch=${encodeURIComponent(search)}&docStatus=${status}`, { headers: getAuthHeaders() });
    const { documents } = await res.json();
    const tbody = document.getElementById('docsTable');
    tbody.innerHTML = '';
    documents.forEach(d => {
      const ratingStr = d.avg_rating !== 'N/A'
        ? `<a href="#" onclick="showDocRatings(event, ${d.id}, '${escHtml(d.title.replace(/'/g, "\\'"))}')" style="color: var(--secondary); text-decoration: underline;">⭐ ${d.avg_rating} (${d.rating_count})</a>`
        : '<span style="color: var(--text-muted)">No ratings</span>';

      tbody.innerHTML += `<tr>
        <td><a href="${d.file_path}" target="_blank" style="color: var(--accent); text-decoration: none;">${escHtml(d.title)}</a></td>
        <td>${escHtml(d.subject_name)}</td>
        <td>${escHtml(d.uploader_name)}</td>
        <td>${new Date(d.uploaded_at).toLocaleDateString()}</td>
        <td>${ratingStr}</td>
        <td><span class="badge ${d.status}">${d.status || 'approved'}</span></td>
        <td style="display: flex; gap: 8px;">
          ${d.status !== 'approved' ? `<button class="cyber-btn cyber-btn-success" onclick="updateDocStatus(${d.id}, 'approve')">Approve</button>` : ''}
          ${d.status !== 'rejected' ? `<button class="cyber-btn cyber-btn-danger" onclick="updateDocStatus(${d.id}, 'reject')">Reject</button>` : ''}
          <button class="cyber-btn cyber-btn-danger" onclick="deleteDoc(${d.id})">Delete</button>
        </td>
      </tr>`;
    });
  } catch (err) { console.error(err); }
}

async function updateDocStatus(id, action) {
  try {
    const res = await fetch('/api/admin_panel', { method: 'POST', headers: getAuthHeaders(), body: JSON.stringify({ action: 'doc_update', id, status: action }) });
    if (res.ok) fetchDocuments();
  } catch(e) { console.error(e); }
}

async function deleteDoc(id) {
  if (!confirm('Permanently delete this document?')) return;
  try {
    const res = await fetch('/api/admin_panel', { method: 'POST', headers: getAuthHeaders(), body: JSON.stringify({ action: 'doc_update', id, subAction: 'delete' }) });
    if (res.ok) fetchDocuments();
  } catch(e) { console.error(e); }
}

async function fetchSubjects() {
  try {
    const res = await fetch('/api/admin_panel?action=subjects_list', { headers: getAuthHeaders() });
    const { subjects } = await res.json();
    const tbody = document.getElementById('subjectsTable');
    tbody.innerHTML = '';
    subjects.forEach(s => {
      const syllabusLink = s.syllabus_file
        ? `<a href="${s.syllabus_file}" target="_blank" style="color:var(--accent); text-decoration: underline;">View PDF</a>`
        : '<span style="color:var(--text-muted)">None</span>';

      tbody.innerHTML += `<tr>
        <td>${escHtml(s.name)}</td>
        <td>${escHtml(s.code || '')}</td>
        <td>${escHtml(s.type || 'theory')}</td>
        <td>${syllabusLink}</td>
        <td style="display: flex; gap: 8px;">
          <button class="cyber-btn cyber-btn-ghost" onclick="openSubjectModal(${s.id}, '${escHtml(s.name.replace(/'/g, "\\'"))}', '${escHtml((s.code || '').replace(/'/g, "\\'"))}', '${escHtml(s.type || 'theory')}', '${escHtml((s.syllabus_file || '').replace(/'/g, "\\'"))}')">Edit</button>
          <button class="cyber-btn cyber-btn-danger" onclick="deleteSubject(${s.id})">Delete</button>
        </td>
      </tr>`;
    });
  } catch(e) { console.error(e); }
}

function openSubjectModal(id = '', name = '', code = '', type = 'theory', syllabusFile = '') {
  document.getElementById('subjectId').value = id;
  document.getElementById('subjName').value = name;
  document.getElementById('subjCode').value = code;
  document.getElementById('subjType').value = type;
  document.getElementById('subjSyllabusFile').value = syllabusFile;
  document.getElementById('subjectModalTitle').textContent = id ? 'Edit Subject' : 'Add Subject';
  document.getElementById('subjectModal').classList.add('open');
}

function closeSubjectModal() {
  document.getElementById('subjectModal').classList.remove('open');
}

async function deleteSubject(id) {
  if (!confirm('Permanently delete this subject?')) return;
  try {
    const res = await fetch('/api/admin_panel', { method: 'POST', headers: getAuthHeaders(), body: JSON.stringify({ action: 'subject_update', id, subAction: 'delete' }) });
    if (res.ok) fetchSubjects();
  } catch(e) { console.error(e); }
}

async function fetchReports() {
  try {
    const res = await fetch('/api/admin_panel?action=reports_list', { headers: getAuthHeaders() });
    const { reports } = await res.json();
    const tbody = document.getElementById('reportsTable');
    tbody.innerHTML = '';
    reports.forEach(r => {
      tbody.innerHTML += `<tr><td>${escHtml(r.reported_by)}</td><td>${escHtml(r.document_title)}</td><td><strong>${escHtml(r.reason)}</strong><br><small style="color:var(--text-muted)">${escHtml(r.details || '')}</small></td><td>${new Date(r.created_at).toLocaleDateString()}</td><td style="display: flex; gap: 8px;"><button class="cyber-btn cyber-btn-ghost" onclick="actionReport(${r.id}, 'ignore')">Ignore</button><button class="cyber-btn cyber-btn-danger" onclick="actionReport(${r.id}, 'delete_document')">Del Doc</button></td></tr>`;
    });
  } catch(e) { console.error(e); }
}

async function actionReport(id, action) {
  if (action === 'delete_document' && !confirm('Delete the document associated with this report?')) return;
  try {
    const res = await fetch('/api/admin_panel', { method: 'POST', headers: getAuthHeaders(), body: JSON.stringify({ action: 'report_resolve', id, reportAction: action }) });
    if (res.ok) fetchReports();
  } catch(e) { console.error(e); }
}

async function fetchRequests() {
  try {
    const res = await fetch('/api/admin_panel?action=requests_list', { headers: getAuthHeaders() });
    const { requests } = await res.json();
    const tbody = document.getElementById('requestsTable');
    tbody.innerHTML = '';
    requests.forEach(r => {
      tbody.innerHTML += `<tr><td>${escHtml(r.title)}</td><td>${escHtml(r.description || '')}</td><td>${escHtml(r.requested_by)}</td><td><span class="badge ${r.status}">${r.status}</span></td><td style="display: flex; gap: 8px;">${r.status === 'pending' ? `<button class="cyber-btn cyber-btn-success" onclick="actionRequest(${r.id}, 'fulfill')">Mark Fulfilled</button>` : ''}<button class="cyber-btn cyber-btn-danger" onclick="actionRequest(${r.id}, 'delete')">Delete</button></td></tr>`;
    });
  } catch(e) { console.error(e); }
}

async function actionRequest(id, action) {
  try {
    const res = await fetch('/api/admin_panel', { method: 'POST', headers: getAuthHeaders(), body: JSON.stringify({ action: 'request_update', id, status: action }) });
    if (res.ok) fetchRequests();
  } catch(e) { console.error(e); }
}

// Custom Modal for Reviews & Ratings details
function closeDetailsModal() {
  document.getElementById('detailsModal').classList.remove('open');
}

async function showUserReviews(e, userId, userName) {
  if (e) e.preventDefault();
  document.getElementById('detailsModalTitle').textContent = `Reviews for ${userName}`;
  const header = document.getElementById('detailsModalHeader');
  const body = document.getElementById('detailsModalBody');
  header.innerHTML = `<tr><th>Reviewer</th><th>Rating</th><th>Comment</th><th>Date</th><th>Action</th></tr>`;
  body.innerHTML = `<tr><td colspan="5">Loading...</td></tr>`;
  document.getElementById('detailsModal').classList.add('open');

  try {
    const res = await fetch(`/api/admin_panel?action=user_reviews_details&userId=${userId}`, { headers: getAuthHeaders() });
    const { reviews } = await res.json();
    body.innerHTML = '';
    if (reviews.length === 0) {
      body.innerHTML = `<tr><td colspan="5">No reviews found</td></tr>`;
      return;
    }
    reviews.forEach(r => {
      body.innerHTML += `<tr>
        <td>${escHtml(r.reviewer_name)}<br><small style="color:var(--text-muted)">${escHtml(r.reviewer_email)}</small></td>
        <td>⭐ ${r.rating}</td>
        <td>${escHtml(r.comment || '')}</td>
        <td>${new Date(r.created_at).toLocaleDateString()}</td>
        <td><button class="cyber-btn cyber-btn-danger" onclick="deleteUserReview(${r.id}, ${userId}, '${userName.replace(/'/g, "\\'")}')">Delete</button></td>
      </tr>`;
    });
  } catch (err) {
    console.error(err);
    body.innerHTML = `<tr><td colspan="5">Error loading reviews</td></tr>`;
  }
}

async function deleteUserReview(reviewId, userId, userName) {
  if (!confirm('Are you sure you want to delete this review?')) return;
  try {
    const res = await fetch('/api/admin_panel', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ action: 'delete_user_review', reviewId })
    });
    if (res.ok) {
      showUserReviews(null, userId, userName);
      fetchUsers(document.getElementById('searchUsers')?.value || '');
    } else {
      alert('Failed to delete review.');
    }
  } catch (err) {
    console.error(err);
  }
}

async function showDocRatings(e, docId, docTitle) {
  if (e) e.preventDefault();
  document.getElementById('detailsModalTitle').textContent = `Ratings for ${docTitle}`;
  const header = document.getElementById('detailsModalHeader');
  const body = document.getElementById('detailsModalBody');
  header.innerHTML = `<tr><th>User</th><th>Rating</th><th>Date</th><th>Action</th></tr>`;
  body.innerHTML = `<tr><td colspan="4">Loading...</td></tr>`;
  document.getElementById('detailsModal').classList.add('open');

  try {
    const res = await fetch(`/api/admin_panel?action=doc_ratings_details&docId=${docId}`, { headers: getAuthHeaders() });
    const { ratings } = await res.json();
    body.innerHTML = '';
    if (ratings.length === 0) {
      body.innerHTML = `<tr><td colspan="4">No ratings found</td></tr>`;
      return;
    }
    ratings.forEach(r => {
      body.innerHTML += `<tr>
        <td>${escHtml(r.user_name)}<br><small style="color:var(--text-muted)">${escHtml(r.user_email)}</small></td>
        <td>⭐ ${r.rating}</td>
        <td>${new Date(r.created_at).toLocaleDateString()}</td>
        <td><button class="cyber-btn cyber-btn-danger" onclick="deleteDocRating(${r.id}, ${docId}, '${docTitle.replace(/'/g, "\\'")}')">Delete</button></td>
      </tr>`;
    });
  } catch (err) {
    console.error(err);
    body.innerHTML = `<tr><td colspan="4">Error loading ratings</td></tr>`;
  }
}

async function deleteDocRating(ratingId, docId, docTitle) {
  if (!confirm('Are you sure you want to delete this rating?')) return;
  try {
    const res = await fetch('/api/admin_panel', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ action: 'delete_doc_rating', ratingId })
    });
    if (res.ok) {
      showDocRatings(null, docId, docTitle);
      fetchDocuments(document.getElementById('searchDocs')?.value || '', document.getElementById('filterDocsStatus')?.value || '');
    } else {
      alert('Failed to delete rating.');
    }
  } catch (err) {
    console.error(err);
  }
}
