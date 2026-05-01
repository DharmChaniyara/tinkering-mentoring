// admin/js/admin.js

document.addEventListener('DOMContentLoaded', () => {
  const user = requireAuth();
  if (!user || user.role !== 'admin') {
    alert('Access Denied. Admin only.');
    logout();
    return;
  }
  document.getElementById('adminName').textContent = user.name || 'Admin';

  // Navigation Logic
  const navItems = document.querySelectorAll('.nav-item[data-target]');
  const sections = document.querySelectorAll('.view-section');

  navItems.forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      // Remove active class
      navItems.forEach(nav => nav.classList.remove('active'));
      sections.forEach(sec => sec.classList.remove('active'));
      
      // Add active class
      item.classList.add('active');
      const targetId = `view-${item.dataset.target}`;
      document.getElementById(targetId).classList.add('active');

      // Update title
      document.getElementById('pageTitle').textContent = item.textContent.trim();

      // Load data
      loadDataForSection(item.dataset.target);
    });
  });

  // Load initial data
  loadDataForSection('dashboard');

  // Search listeners
  const searchUsers = document.getElementById('searchUsers');
  if (searchUsers) {
    let timeout = null;
    searchUsers.addEventListener('input', () => {
      clearTimeout(timeout);
      timeout = setTimeout(() => fetchUsers(searchUsers.value), 500);
    });
  }

  const searchDocs = document.getElementById('searchDocs');
  const filterDocs = document.getElementById('filterDocsStatus');
  if (searchDocs && filterDocs) {
    const handleDocsSearch = () => {
      fetchDocuments(searchDocs.value, filterDocs.value);
    };
    let timeout = null;
    searchDocs.addEventListener('input', () => {
      clearTimeout(timeout);
      timeout = setTimeout(handleDocsSearch, 500);
    });
    filterDocs.addEventListener('change', handleDocsSearch);
  }
});

function logoutAdmin() {
  logout();
}

// Data Loaders
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

// --- Fetch Dashboard Stats ---
async function fetchStats() {
  try {
    const res = await fetch('/api/admin/stats', { headers: getAuthHeaders() });
    if (!res.ok) {
      if (res.status === 403) return logout();
      throw new Error('Failed to fetch stats');
    }
    const data = await res.json();
    document.getElementById('stat-users').textContent = data.totalUsers;
    document.getElementById('stat-docs').textContent = data.totalDocuments;
    document.getElementById('stat-subjects').textContent = data.totalSubjects;
    document.getElementById('stat-reports').textContent = data.totalReports;

    const tbody = document.getElementById('recentDocsTable');
    tbody.innerHTML = '';
    if (data.recentDocuments.length === 0) {
      tbody.innerHTML = '<tr><td colspan="3">No recent documents</td></tr>';
      return;
    }
    data.recentDocuments.forEach(doc => {
      const date = new Date(doc.uploaded_at).toLocaleDateString();
      tbody.innerHTML += `
        <tr>
          <td>${escHtml(doc.title)}</td>
          <td>${escHtml(doc.uploader_name)}</td>
          <td>${date}</td>
        </tr>
      `;
    });
  } catch (err) {
    console.error(err);
  }
}

// --- Fetch Users ---
async function fetchUsers(search = '') {
  try {
    const res = await fetch(`/api/admin/users?search=${encodeURIComponent(search)}`, { headers: getAuthHeaders() });
    if (!res.ok) throw new Error('Failed to fetch users');
    const { users } = await res.json();
    const tbody = document.getElementById('usersTable');
    tbody.innerHTML = '';
    
    users.forEach(u => {
      const isBlocked = u.status === 'blocked';
      const actionBtn = isBlocked 
        ? `<button class="btn btn-sm btn-success" onclick="updateUserStatus(${u.id}, 'unblock')">Unblock</button>`
        : `<button class="btn btn-sm btn-danger" onclick="updateUserStatus(${u.id}, 'block')">Block</button>`;
        
      tbody.innerHTML += `
        <tr>
          <td>${escHtml(u.name)}</td>
          <td>${escHtml(u.email)}</td>
          <td><span class="badge ${u.role}">${u.role}</span></td>
          <td><span class="badge ${u.status}">${u.status}</span></td>
          <td style="display: flex; gap: 8px;">
            ${u.role !== 'admin' ? actionBtn : ''}
            ${u.role !== 'admin' ? `<button class="btn btn-sm btn-danger" onclick="deleteUser(${u.id})">Delete</button>` : ''}
          </td>
        </tr>
      `;
    });
  } catch (err) {
    console.error(err);
  }
}

async function updateUserStatus(id, action) {
  if (!confirm(`Are you sure you want to ${action} this user?`)) return;
  try {
    const res = await fetch('/api/admin/users', {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify({ id, action })
    });
    if (res.ok) fetchUsers(document.getElementById('searchUsers')?.value || '');
    else alert(await res.text());
  } catch (err) { console.error(err); }
}

async function deleteUser(id) {
  if (!confirm('Warning: This will permanently delete the user and their uploads. Continue?')) return;
  try {
    const res = await fetch('/api/admin/users', {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify({ id, action: 'delete' })
    });
    if (res.ok) fetchUsers(document.getElementById('searchUsers')?.value || '');
    else alert(await res.text());
  } catch (err) { console.error(err); }
}

// --- Fetch Documents ---
async function fetchDocuments(search = '', status = '') {
  try {
    const res = await fetch(`/api/admin/documents?search=${encodeURIComponent(search)}&status=${status}`, { headers: getAuthHeaders() });
    if (!res.ok) throw new Error('Failed to fetch docs');
    const { documents } = await res.json();
    const tbody = document.getElementById('docsTable');
    tbody.innerHTML = '';
    
    documents.forEach(d => {
      const date = new Date(d.uploaded_at).toLocaleDateString();
      tbody.innerHTML += `
        <tr>
          <td>
            <a href="${d.file_path}" target="_blank" style="color: var(--accent-blue); text-decoration: none;">
              ${escHtml(d.title)}
            </a>
          </td>
          <td>${escHtml(d.subject_name)}</td>
          <td>${escHtml(d.uploader_name)}</td>
          <td>${date}</td>
          <td><span class="badge ${d.status}">${d.status || 'approved'}</span></td>
          <td style="display: flex; gap: 8px;">
            ${d.status !== 'approved' ? `<button class="btn btn-sm btn-success" onclick="updateDocStatus(${d.id}, 'approve')">Approve</button>` : ''}
            ${d.status !== 'rejected' ? `<button class="btn btn-sm btn-danger" onclick="updateDocStatus(${d.id}, 'reject')">Reject</button>` : ''}
            <button class="btn btn-sm btn-danger" onclick="deleteDoc(${d.id})">Delete</button>
          </td>
        </tr>
      `;
    });
  } catch (err) { console.error(err); }
}

async function updateDocStatus(id, action) {
  try {
    const res = await fetch('/api/admin/documents', {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify({ id, action })
    });
    if (res.ok) fetchDocuments();
  } catch(e) { console.error(e); }
}

async function deleteDoc(id) {
  if (!confirm('Permanently delete this document?')) return;
  try {
    const res = await fetch('/api/admin/documents', {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify({ id, action: 'delete' })
    });
    if (res.ok) fetchDocuments();
  } catch(e) { console.error(e); }
}

// --- Fetch Subjects ---
async function fetchSubjects() {
  try {
    const res = await fetch('/api/admin/subjects', { headers: getAuthHeaders() });
    const subjects = await res.json();
    const tbody = document.getElementById('subjectsTable');
    tbody.innerHTML = '';
    subjects.forEach(s => {
      tbody.innerHTML += `
        <tr>
          <td>${escHtml(s.name)}</td>
          <td>${escHtml(s.type || 'Core')}</td>
          <td style="display: flex; gap: 8px;">
            <button class="btn btn-sm btn-primary" onclick="promptEditSubject(${s.id}, '${s.name.replace(/'/g, "\\'")}', '${s.type}')">Edit</button>
            <button class="btn btn-sm btn-danger" onclick="deleteSubject(${s.id})">Delete</button>
          </td>
        </tr>
      `;
    });
  } catch(e) { console.error(e); }
}

async function promptAddSubject() {
  const name = prompt('Enter subject name:');
  if (!name) return;
  const type = prompt('Enter subject type (e.g. Core, Elective):', 'Core');
  try {
    const res = await fetch('/api/admin/subjects', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ name, type: type || 'Core' })
    });
    if (res.ok) fetchSubjects();
  } catch(e) { console.error(e); }
}

async function promptEditSubject(id, oldName, oldType) {
  const name = prompt('Edit subject name:', oldName);
  if (!name) return;
  const type = prompt('Edit subject type:', oldType);
  try {
    const res = await fetch('/api/admin/subjects', {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify({ id, name, subjectType: type || 'Core' })
    });
    if (res.ok) fetchSubjects();
  } catch(e) { console.error(e); }
}

async function deleteSubject(id) {
  if (!confirm('Permanently delete this subject?')) return;
  try {
    const res = await fetch('/api/admin/subjects', {
      method: 'DELETE',
      headers: getAuthHeaders(),
      body: JSON.stringify({ id })
    });
    if (res.ok) fetchSubjects();
  } catch(e) { console.error(e); }
}

// --- Fetch Reports ---
async function fetchReports() {
  try {
    const res = await fetch('/api/admin/reports', { headers: getAuthHeaders() });
    const { reports } = await res.json();
    const tbody = document.getElementById('reportsTable');
    tbody.innerHTML = '';
    reports.forEach(r => {
      const date = new Date(r.created_at).toLocaleDateString();
      tbody.innerHTML += `
        <tr>
          <td>${escHtml(r.reported_by)}</td>
          <td>${escHtml(r.document_title)}</td>
          <td><strong>${escHtml(r.reason)}</strong><br><small style="color:var(--text-muted)">${escHtml(r.details || '')}</small></td>
          <td>${date}</td>
          <td style="display: flex; gap: 8px;">
            <button class="btn btn-sm btn-primary" onclick="actionReport(${r.id}, 'ignore')">Ignore</button>
            <button class="btn btn-sm btn-danger" onclick="actionReport(${r.id}, 'delete_document')">Del Doc</button>
          </td>
        </tr>
      `;
    });
  } catch(e) { console.error(e); }
}

async function actionReport(id, action) {
  if (action === 'delete_document' && !confirm('Delete the document associated with this report?')) return;
  try {
    const res = await fetch('/api/admin/reports', {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify({ id, action })
    });
    if (res.ok) fetchReports();
  } catch(e) { console.error(e); }
}

// --- Fetch Requests ---
async function fetchRequests() {
  try {
    const res = await fetch('/api/admin/requests', { headers: getAuthHeaders() });
    const { requests } = await res.json();
    const tbody = document.getElementById('requestsTable');
    tbody.innerHTML = '';
    requests.forEach(r => {
      tbody.innerHTML += `
        <tr>
          <td>${escHtml(r.title)}</td>
          <td>${escHtml(r.description || '')}</td>
          <td>${escHtml(r.requested_by)}</td>
          <td><span class="badge ${r.status}">${r.status}</span></td>
          <td style="display: flex; gap: 8px;">
            ${r.status === 'pending' ? `<button class="btn btn-sm btn-success" onclick="actionRequest(${r.id}, 'fulfill')">Mark Fulfilled</button>` : ''}
            <button class="btn btn-sm btn-danger" onclick="actionRequest(${r.id}, 'delete')">Delete</button>
          </td>
        </tr>
      `;
    });
  } catch(e) { console.error(e); }
}

async function actionRequest(id, action) {
  try {
    const res = await fetch('/api/admin/requests', {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify({ id, action })
    });
    if (res.ok) fetchRequests();
  } catch(e) { console.error(e); }
}
