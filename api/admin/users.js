// api/admin/users.js
const { supabase } = require('../../backend/lib/supabase');
const { verifyRequest, handleCors } = require('../../backend/lib/auth');

module.exports = async function handler(req, res) {
  if (handleCors(req, res)) return;

  const user = verifyRequest(req);
  if (!user || user.role !== 'admin') {
    return res.status(403).json({ error: 'Forbidden. Admin access required.' });
  }

  if (req.method === 'GET') {
    const { search = '', page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;

    let query = supabase.from('users').select('id, name, email, role, status, google_id', { count: 'exact' });
    
    if (search) {
      query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%`);
    }

    const { data: users, count, error } = await query
      .order('id', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) return res.status(500).json({ error: 'Failed to fetch users.' });

    return res.status(200).json({ users, total: count, page: Number(page), limit: Number(limit) });
  }

  if (req.method === 'PUT') {
    const { id, action } = req.body || {}; // action can be 'block', 'unblock', 'delete'
    if (!id || !action) return res.status(400).json({ error: 'User ID and action required.' });

    if (action === 'delete') {
      const { error } = await supabase.from('users').delete().eq('id', id);
      if (error) return res.status(500).json({ error: 'Failed to delete user.' });
      return res.status(200).json({ message: 'User deleted.' });
    }

    if (action === 'block' || action === 'unblock') {
      const status = action === 'block' ? 'blocked' : 'active';
      const { error } = await supabase.from('users').update({ status }).eq('id', id);
      if (error) return res.status(500).json({ error: `Failed to ${action} user.` });
      return res.status(200).json({ message: `User ${action}ed successfully.` });
    }

    return res.status(400).json({ error: 'Invalid action.' });
  }

  return res.status(405).json({ error: 'Method not allowed' });
};
