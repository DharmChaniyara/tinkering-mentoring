// api/admin/requests.js
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

    const { data: requests, count, error } = await supabase
      .from('requests')
      .select('id, title, description, status, created_at, users(name)', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) return res.status(500).json({ error: 'Failed to fetch requests.' });

    const formattedRequests = requests.map(r => ({
      ...r,
      requested_by: r.users?.name || 'Unknown'
    }));

    return res.status(200).json({ requests: formattedRequests, total: count, page: Number(page), limit: Number(limit) });
  }

  if (req.method === 'PUT') {
    const { id, action } = req.body || {}; // action: 'fulfill', 'delete'
    if (!id || !action) return res.status(400).json({ error: 'Request ID and action required.' });

    if (action === 'delete') {
      const { error } = await supabase.from('requests').delete().eq('id', id);
      if (error) return res.status(500).json({ error: 'Failed to delete request.' });
      return res.status(200).json({ message: 'Request deleted.' });
    }

    if (action === 'fulfill') {
      const { error } = await supabase.from('requests').update({ status: 'fulfilled' }).eq('id', id);
      if (error) return res.status(500).json({ error: 'Failed to fulfill request.' });
      return res.status(200).json({ message: 'Request marked as fulfilled.' });
    }

    return res.status(400).json({ error: 'Invalid action.' });
  }

  return res.status(405).json({ error: 'Method not allowed' });
};
