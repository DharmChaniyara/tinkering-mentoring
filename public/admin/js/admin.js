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
      tbody.innerHTML += `<tr><td>${escHtml(u.name)}</td><td>${escHtml(u.email)}</td><td><span class="badge ${u.role}">${u.role}</span></td><td><span class="badge ${u.status}">${u.status}</span></td><td style="display: flex; gap: 8px;">${u.role !== 'admin' ? actionBtn : ''}${u.role !== 'admin' ? `<button class="cyber-btn cyber-btn-danger" onclick="deleteUser(${u.id})">Delete</button>` : ''}</td></tr>`;
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
      tbody.innerHTML += `<tr><td><a href="${d.file_path}" target="_blank" style="color: var(--accent); text-decoration: none;">${escHtml(d.title)}</a></td><td>${escHtml(d.subject_name)}</td><td>${escHtml(d.uploader_name)}</td><td>${new Date(d.uploaded_at).toLocaleDateString()}</td><td><span class="badge ${d.status}">${d.status || 'approved'}</span></td><td style="display: flex; gap: 8px;">${d.status !== 'approved' ? `<button class="cyber-btn cyber-btn-success" onclick="updateDocStatus(${d.id}, 'approve')">Approve</button>` : ''}${d.status !== 'rejected' ? `<button class="cyber-btn cyber-btn-danger" onclick="updateDocStatus(${d.id}, 'reject')">Reject</button>` : ''}<button class="cyber-btn cyber-btn-danger" onclick="deleteDoc(${d.id})">Delete</button></td></tr>`;
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
    const subjects = await res.json();
    const tbody = document.getElementById('subjectsTable');
    tbody.innerHTML = '';
    subjects.forEach(s => {
      tbody.innerHTML += `<tr><td>${escHtml(s.name)}</td><td>${escHtml(s.type || 'Core')}</td><td style="display: flex; gap: 8px;"><button class="cyber-btn cyber-btn-ghost" onclick="promptEditSubject(${s.id}, '${s.name.replace(/'/g, "\\'")}', '${s.type}')">Edit</button><button class="cyber-btn cyber-btn-danger" onclick="deleteSubject(${s.id})">Delete</button></td></tr>`;
    });
  } catch(e) { console.error(e); }
}
async function promptAddSubject() {
  const name = prompt('Enter subject name:'); if (!name) return;
  const type = prompt('Enter subject type:', 'Core');
  try {
    const res = await fetch('/api/admin_panel', { method: 'POST', headers: getAuthHeaders(), body: JSON.stringify({ action: 'subject_update', name, type: type || 'Core' }) });
    if (res.ok) fetchSubjects();
  } catch(e) { console.error(e); }
}
async function promptEditSubject(id, oldName, oldType) {
  const name = prompt('Edit subject name:', oldName); if (!name) return;
  const type = prompt('Edit subject type:', oldType);
  try {
    const res = await fetch('/api/admin_panel', { method: 'POST', headers: getAuthHeaders(), body: JSON.stringify({ action: 'subject_update', id, name, type: type || 'Core' }) });
    if (res.ok) fetchSubjects();
  } catch(e) { console.error(e); }
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
