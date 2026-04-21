// api/request_doc.js — Submit a document request
const { supabase } = require('../backend/lib/supabase');
const { verifyRequest, handleCors } = require('../backend/lib/auth');

module.exports = async function handler(req, res) {
  if (handleCors(req, res)) return;
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const user = verifyRequest(req);
  if (!user) return res.status(401).json({ error: 'Unauthorized.' });

  const { subject_id, title, details } = req.body || {};
  if (!subject_id || !title) {
    return res.status(400).json({ error: 'Subject and title are required.' });
  }

  const { error } = await supabase.from('document_requests').insert({
    user_id: user.userId,
    subject_id: parseInt(subject_id),
    title: title.trim(),
    details: (details || '').trim(),
  });

  if (error) return res.status(500).json({ error: 'Failed to submit request.' });

  return res.status(200).json({ message: 'Request submitted successfully!' });
};
