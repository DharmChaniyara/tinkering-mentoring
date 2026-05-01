// backend/api/user_interactions.js
const { supabase } = require('../lib/supabase');
const { verifyRequest, handleCors } = require('../lib/auth');

module.exports = async function handler(req, res) {
  if (handleCors(req, res)) return;
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const user = verifyRequest(req);
  if (!user) return res.status(401).json({ error: 'Unauthorized.' });

  const { action } = req.body;

  try {
    switch (action) {
      case 'rate_doc':
        const { document_id, rating } = req.body;
        const { data: doc } = await supabase.from('notes').select('user_id').eq('id', document_id).single();
        if (doc && doc.user_id === user.userId) return res.status(400).json({ error: 'You cannot rate your own document.' });
        await supabase.from('document_ratings').upsert({ document_id, user_id: user.userId, rating }, { onConflict: 'document_id,user_id' });
        return res.status(200).json({ success: true });

      case 'rate_user':
        const { reviewee_id, rating: uRating, comment } = req.body;
        if (parseInt(reviewee_id) === user.userId) return res.status(400).json({ error: 'You cannot review yourself.' });
        await supabase.from('user_reviews').upsert({ reviewer_id: user.userId, reviewee_id: parseInt(reviewee_id), rating: uRating, comment: (comment || '').trim() }, { onConflict: 'reviewer_id,reviewee_id' });
        return res.status(200).json({ success: true });

      case 'download':
        const { id: did } = req.body;
        const { data: dNote } = await supabase.from('notes').select('download_count').eq('id', did).single();
        if (!dNote) return res.status(404).json({ error: 'Document not found.' });
        await supabase.from('notes').update({ download_count: (dNote.download_count || 0) + 1 }).eq('id', did);
        return res.status(200).json({ success: true });

      case 'report':
        const { note_id, reason, details } = req.body;
        await supabase.from('reported_documents').insert({ note_id, user_id: user.userId, reason, details });
        return res.status(200).json({ success: true, message: 'Report submitted successfully.' });

      default:
        return res.status(400).json({ error: 'Invalid action.' });
    }
  } catch (err) {
    console.error('[Interactions Error]', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
};
