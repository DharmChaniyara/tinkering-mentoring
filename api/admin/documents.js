// api/admin/documents.js
const { supabase } = require('../../backend/lib/supabase');
const { verifyRequest, handleCors } = require('../../backend/lib/auth');

module.exports = async function handler(req, res) {
  if (handleCors(req, res)) return;

  const user = verifyRequest(req);
  if (!user || user.role !== 'admin') {
    return res.status(403).json({ error: 'Forbidden. Admin access required.' });
  }

  if (req.method === 'GET') {
    const { search = '', status = '', page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;

    let query = supabase
      .from('notes')
      .select('id, title, file_path, category, uploaded_at, status, users(name), subjects(name)', { count: 'exact' });
    
    if (search) {
      query = query.ilike('title', `%${search}%`);
    }
    if (status) {
      query = query.eq('status', status);
    }

    const { data: documents, count, error } = await query
      .order('uploaded_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) return res.status(500).json({ error: 'Failed to fetch documents.' });

    const formattedDocs = documents.map(d => ({
      ...d,
      uploader_name: d.users?.name || 'Unknown',
      subject_name: d.subjects?.name || 'Unknown'
    }));

    return res.status(200).json({ documents: formattedDocs, total: count, page: Number(page), limit: Number(limit) });
  }

  if (req.method === 'PUT') {
    const { id, action } = req.body || {}; // action: 'approve', 'reject', 'delete'
    if (!id || !action) return res.status(400).json({ error: 'Document ID and action required.' });

    if (action === 'delete') {
      const { error } = await supabase.from('notes').delete().eq('id', id);
      if (error) return res.status(500).json({ error: 'Failed to delete document.' });
      return res.status(200).json({ message: 'Document deleted.' });
    }

    if (action === 'approve' || action === 'reject') {
      const docStatus = action === 'approve' ? 'approved' : 'rejected';
      const { error } = await supabase.from('notes').update({ status: docStatus }).eq('id', id);
      if (error) return res.status(500).json({ error: `Failed to ${action} document.` });
      return res.status(200).json({ message: `Document ${action}d successfully.` });
    }

    return res.status(400).json({ error: 'Invalid action.' });
  }

  return res.status(405).json({ error: 'Method not allowed' });
};
