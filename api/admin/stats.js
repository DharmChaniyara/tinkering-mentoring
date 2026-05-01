// api/admin/stats.js
const { supabase } = require('../../backend/lib/supabase');
const { verifyRequest, handleCors } = require('../../backend/lib/auth');

module.exports = async function handler(req, res) {
  if (handleCors(req, res)) return;
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const user = verifyRequest(req);
  if (!user || user.role !== 'admin') {
    return res.status(403).json({ error: 'Forbidden. Admin access required.' });
  }

  try {
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
  } catch (err) {
    console.error('[Admin Stats Error]', err);
    return res.status(500).json({ error: 'Failed to fetch admin stats.' });
  }
};
