// api/download_track.js
const { supabase } = require('../backend/lib/supabase');
const { verifyRequest, handleCors } = require('../backend/lib/auth');

module.exports = async function handler(req, res) {
  if (handleCors(req, res)) return;
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { id } = req.body;
  if (!id) return res.status(400).json({ error: 'Document ID required.' });

  try {
    // Increment download_count using RPC or just a fetch/update
    // Supabase JS doesn't have a direct 'increment' method without RPC, 
    // so we'll do a read-then-write or a raw query if we had it.
    // For simplicity, let's fetch then update.
    
    const { data, error: fetchErr } = await supabase
      .from('notes')
      .select('download_count')
      .eq('id', id)
      .single();

    if (fetchErr || !data) return res.status(404).json({ error: 'Document not found.' });

    const newCount = (data.download_count || 0) + 1;

    const { error: updateErr } = await supabase
      .from('notes')
      .update({ download_count: newCount })
      .eq('id', id);

    if (updateErr) return res.status(500).json({ error: 'Failed to update count.' });

    return res.status(200).json({ success: true, count: newCount });
  } catch (err) {
    return res.status(500).json({ error: 'Internal server error.' });
  }
};
