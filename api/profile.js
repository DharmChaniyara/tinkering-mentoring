// api/profile.js
const { supabase } = require('../backend/lib/supabase');
const { verifyRequest, handleCors } = require('../backend/lib/auth');

module.exports = async function handler(req, res) {
  if (handleCors(req, res)) return;
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const requester = verifyRequest(req);
  if (!requester) return res.status(401).json({ error: 'Unauthorized.' });

  const { id } = req.query; // If provided, fetch profile for this user ID, otherwise fetch self.
  const targetUserId = id ? parseInt(id) : requester.userId;

  try {
    // 1. Fetch User Info
    const { data: user, error: userErr } = await supabase
      .from('users')
      .select('id, name, email, role, profile_pic')
      .eq('id', targetUserId)
      .single();

    if (userErr || !user) return res.status(404).json({ error: 'User not found.' });

    // 2. Fetch Stats
    // Count uploaded documents
    const { count: uploadCount } = await supabase
      .from('notes')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', targetUserId);

    // Sum download counts
    const { data: downloadsData } = await supabase
      .from('notes')
      .select('download_count')
      .eq('user_id', targetUserId);
    
    const totalDownloads = (downloadsData || []).reduce((sum, n) => sum + (n.download_count || 0), 0);

    // Get average user rating (reviews from others)
    const { data: reviews } = await supabase
      .from('user_reviews')
      .select('rating')
      .eq('reviewee_id', targetUserId);
    
    const avgRating = reviews && reviews.length > 0 
      ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
      : 0;

    // 3. Fetch Uploaded Documents
    const { data: documents } = await supabase
      .from('notes')
      .select('id, title, category, uploaded_at, download_count, subjects(name)')
      .eq('user_id', targetUserId)
      .order('uploaded_at', { ascending: false });

    return res.status(200).json({
      user,
      stats: {
        uploadCount: uploadCount || 0,
        totalDownloads,
        avgRating,
        reviewCount: reviews ? reviews.length : 0
      },
      documents: documents ? documents.map(d => ({
        ...d,
        subject_name: d.subjects?.name || 'Unknown'
      })) : []
    });
  } catch (err) {
    console.error('[Profile API]', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
};
