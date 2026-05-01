// api/rate_document.js
const { supabase } = require('../backend/lib/supabase');
const { verifyRequest, handleCors } = require('../backend/lib/auth');

module.exports = async function handler(req, res) {
  if (handleCors(req, res)) return;
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const user = verifyRequest(req);
  if (!user) return res.status(401).json({ error: 'Unauthorized.' });

  const { document_id, rating } = req.body;
  if (!document_id || !rating) return res.status(400).json({ error: 'Document ID and rating (1-5) required.' });

  try {
    // Check if user is rating their own document (optional policy)
    const { data: doc } = await supabase.from('notes').select('user_id').eq('id', document_id).single();
    if (doc && doc.user_id === user.userId) {
      return res.status(400).json({ error: 'You cannot rate your own document.' });
    }

    const { error } = await supabase
      .from('document_ratings')
      .upsert({ document_id, user_id: user.userId, rating }, { onConflict: 'document_id,user_id' });

    if (error) return res.status(500).json({ error: 'Failed to submit rating.' });

    return res.status(200).json({ success: true });
  } catch (err) {
    return res.status(500).json({ error: 'Internal server error.' });
  }
};
