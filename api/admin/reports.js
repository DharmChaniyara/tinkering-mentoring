// api/admin/reports.js
const { supabase } = require('../../backend/lib/supabase');
const { verifyRequest, handleCors } = require('../../backend/lib/auth');

module.exports = async function handler(req, res) {
  if (handleCors(req, res)) return;

  const user = verifyRequest(req);
  if (!user || user.role !== 'admin') {
    return res.status(403).json({ error: 'Forbidden. Admin access required.' });
  }

  if (req.method === 'GET') {
    const { page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;

    const { data: reports, count, error } = await supabase
      .from('reported_documents')
      .select('id, reason, details, created_at, users(name), notes(id, title, file_path)', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) return res.status(500).json({ error: 'Failed to fetch reports.' });

    const formattedReports = reports.map(r => ({
      id: r.id,
      reason: r.reason,
      details: r.details,
      created_at: r.created_at,
      reported_by: r.users?.name || 'Unknown',
      document_id: r.notes?.id,
      document_title: r.notes?.title || 'Deleted Document'
    }));

    return res.status(200).json({ reports: formattedReports, total: count, page: Number(page), limit: Number(limit) });
  }

  if (req.method === 'PUT') {
    const { id, action } = req.body || {}; // action: 'ignore' (deletes report), 'delete_document' (deletes document & report)
    if (!id || !action) return res.status(400).json({ error: 'Report ID and action required.' });

    if (action === 'ignore') {
      const { error } = await supabase.from('reported_documents').delete().eq('id', id);
      if (error) return res.status(500).json({ error: 'Failed to ignore report.' });
      return res.status(200).json({ message: 'Report ignored.' });
    }

    if (action === 'delete_document') {
      // First, get the report to find the document id
      const { data: report } = await supabase.from('reported_documents').select('note_id').eq('id', id).single();
      if (!report || !report.note_id) return res.status(404).json({ error: 'Report or document not found.' });

      // Delete the document (cascade should delete the report, or we delete it manually)
      const { error } = await supabase.from('notes').delete().eq('id', report.note_id);
      if (error) return res.status(500).json({ error: 'Failed to delete document.' });
      
      // Also delete the report just in case cascade is not set
      await supabase.from('reported_documents').delete().eq('id', id);

      return res.status(200).json({ message: 'Document and report deleted.' });
    }

    return res.status(400).json({ error: 'Invalid action.' });
  }

  return res.status(405).json({ error: 'Method not allowed' });
};
