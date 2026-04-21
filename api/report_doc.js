// api/report_doc.js — Report a document
const { supabase } = require('../backend/lib/supabase');
const { verifyRequest, handleCors } = require('../backend/lib/auth');

module.exports = async function handler(req, res) {
  if (handleCors(req, res)) return;
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const user = verifyRequest(req);
  if (!user) return res.status(401).json({ error: 'Unauthorized.' });

  const { note_id, reason, details } = req.body || {};
  if (!note_id || !reason) {
    return res.status(400).json({ error: 'Note ID and reason are required.' });
  }

  const { error } = await supabase.from('reported_documents').insert({
    user_id: user.userId,
    note_id: parseInt(note_id),
    reason: reason.trim(),
    details: (details || '').trim(),
  });

  if (error) return res.status(500).json({ error: 'Failed to submit report.' });

  return res.status(200).json({ message: 'Report submitted. Thank you!' });
};
