// backend/api/admin_panel.js
const { supabase } = require('../lib/supabase');
const { verifyRequest, handleCors } = require('../lib/auth');

module.exports = async function handler(req, res) {
  if (handleCors(req, res)) return;

  const user = verifyRequest(req);
  const SUPER_ADMIN = 'dharmchaniyara7368@gmail.com';
  
  if (!user || user.role !== 'admin' || user.email !== SUPER_ADMIN) {
    return res.status(403).json({ error: 'Forbidden. Super Admin access required.' });
  }

  const { action } = req.method === 'GET' ? req.query : req.body;

  try {
    switch (action) {
      case 'stats':
        const { count: usersCount } = await supabase.from('users').select('*', { count: 'exact', head: true });
        const { count: activeUsersCount } = await supabase.from('users').select('*', { count: 'exact', head: true }).eq('status', 'active');
        const { count: documentsCount } = await supabase.from('notes').select('*', { count: 'exact', head: true });
        const { count: subjectsCount } = await supabase.from('subjects').select('*', { count: 'exact', head: true });
        const { count: reportsCount } = await supabase.from('reported_documents').select('*', { count: 'exact', head: true });
        const { data: recentDocuments } = await supabase
          .from('notes')
          .select('id, title, uploaded_at, users(name)')
          .order('uploaded_at', { ascending: false })
          .limit(5);
        return res.status(200).json({
          totalUsers: usersCount || 0,
          activeUsers: activeUsersCount || 0,
          totalDocuments: documentsCount || 0,
          totalSubjects: subjectsCount || 0,
          totalReports: reportsCount || 0,
          recentDocuments: recentDocuments ? recentDocuments.map(d => ({
            id: d.id,
            title: d.title,
            uploaded_at: d.uploaded_at,
            uploader_name: d.users?.name || 'Unknown'
          })) : []
        });

      case 'users_list':
        const { search = '', page = 1, limit = 50 } = req.query;
        const offset = (page - 1) * limit;
        let uQuery = supabase.from('users').select('id, name, email, role, status, google_id', { count: 'exact' });
        if (search) uQuery = uQuery.or(`name.ilike.%${search}%,email.ilike.%${search}%`);
        const { data: users, count: uCount } = await uQuery
          .order('id', { ascending: false })
          .range(offset, offset + limit - 1);
        return res.status(200).json({ users, total: uCount });

      case 'user_update':
        const { id: uid, subAction } = req.body;
        if (subAction === 'delete') {
          await supabase.from('users').delete().eq('id', uid);
          return res.status(200).json({ message: 'User deleted.' });
        }
        const newStatus = subAction === 'block' ? 'blocked' : 'active';
        await supabase.from('users').update({ status: newStatus }).eq('id', uid);
        return res.status(200).json({ message: `User ${subAction}ed.` });

      case 'docs_list':
        const { docSearch = '', docStatus = '' } = req.query;
        let dQuery = supabase.from('notes').select('id, title, category, uploaded_at, status, users(name), subjects(name)');
        if (docSearch) dQuery = dQuery.ilike('title', `%${docSearch}%`);
        if (docStatus) dQuery = dQuery.eq('status', docStatus);
        const { data: docs } = await dQuery.order('uploaded_at', { ascending: false }).limit(100);
        return res.status(200).json({ documents: docs.map(d => ({
          ...d, uploader_name: d.users?.name || 'Unknown', subject_name: d.subjects?.name || 'Unknown'
        })) });

      case 'doc_update':
        const { id: did, status: dStat, subAction: dSub } = req.body;
        if (dSub === 'delete') {
          await supabase.from('notes').delete().eq('id', did);
          return res.status(200).json({ message: 'Document deleted.' });
        }
        await supabase.from('notes').update({ status: dStat }).eq('id', did);
        return res.status(200).json({ message: `Document ${dStat}.` });

      case 'subjects_list':
        const { data: subjs } = await supabase.from('subjects').select('*').order('name');
        return res.status(200).json({ subjects: subjs });

      case 'subject_update':
        const { id: sid, name, type, subAction: sSub } = req.body;
        if (sSub === 'delete') {
          await supabase.from('subjects').delete().eq('id', sid);
          return res.status(200).json({ message: 'Subject deleted.' });
        }
        await supabase.from('subjects').insert({ name, type });
        return res.status(200).json({ message: 'Subject added.' });

      case 'reports_list':
        const { data: reps } = await supabase.from('reported_documents').select('*, notes(title), users(name)').order('created_at', { ascending: false });
        return res.status(200).json({ reports: reps.map(r => ({
          ...r, doc_title: r.notes?.title || 'Unknown', reporter_name: r.users?.name || 'Unknown'
        })) });

      case 'report_resolve':
        const { id: rid } = req.body;
        await supabase.from('reported_documents').delete().eq('id', rid);
        return res.status(200).json({ message: 'Report resolved.' });

      case 'requests_list':
        const { data: reqs } = await supabase.from('requests').select('*, users(name)').order('created_at', { ascending: false });
        return res.status(200).json({ requests: reqs.map(r => ({
          ...r, requester_name: r.users?.name || 'Unknown'
        })) });

      case 'request_update':
        const { id: reqid, status: rStat } = req.body;
        await supabase.from('requests').update({ status: rStat }).eq('id', reqid);
        return res.status(200).json({ message: `Request ${rStat}.` });

      default:
        return res.status(400).json({ error: 'Invalid action.' });
    }
  } catch (err) {
    console.error('[Admin Panel Error]', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
};
