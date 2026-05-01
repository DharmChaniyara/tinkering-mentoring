// api/rate_user.js
const { supabase } = require('../backend/lib/supabase');
const { verifyRequest, handleCors } = require('../backend/lib/auth');

module.exports = async function handler(req, res) {
  if (handleCors(req, res)) return;
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const user = verifyRequest(req);
  if (!user) return res.status(401).json({ error: 'Unauthorized.' });

  const { reviewee_id, rating, comment } = req.body;
  if (!reviewee_id || !rating) return res.status(400).json({ error: 'User ID and rating (1-5) required.' });

  if (parseInt(reviewee_id) === user.userId) {
    return res.status(400).json({ error: 'You cannot review yourself.' });
  }

  try {
    const { error } = await supabase
      .from('user_reviews')
      .upsert({ 
        reviewer_id: user.userId, 
        reviewee_id: parseInt(reviewee_id), 
        rating, 
        comment: (comment || '').trim() 
      }, { onConflict: 'reviewer_id,reviewee_id' });

    if (error) return res.status(500).json({ error: 'Failed to submit review.' });

    return res.status(200).json({ success: true });
  } catch (err) {
    return res.status(500).json({ error: 'Internal server error.' });
  }
};
