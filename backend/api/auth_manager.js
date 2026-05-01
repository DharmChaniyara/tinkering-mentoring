// backend/api/auth_manager.js
const { supabase } = require('../lib/supabase');
const { signToken, verifyRequest, handleCors } = require('../lib/auth');
const bcrypt = require('bcryptjs');

module.exports = async function handler(req, res) {
  if (handleCors(req, res)) return;
  const { action } = req.method === 'GET' ? req.query : req.body;

  try {
    switch (action) {
      case 'login':
        const { email, password } = req.body;
        const { data: user, error } = await supabase.from('users').select('*').eq('email', email).single();
        if (error || !user) return res.status(401).json({ error: 'Invalid email or password.' });
        if (user.status === 'blocked') return res.status(403).json({ error: 'Your account has been blocked. Please contact admin.' });
        if (!(await bcrypt.compare(password, user.password))) return res.status(401).json({ error: 'Invalid email or password.' });
        const token = signToken({ userId: user.id, name: user.name, role: user.role });
        return res.status(200).json({ token, role: user.role });

      case 'register':
        const { name, email: remail, password: rpass } = req.body;
        const hashed = await bcrypt.hash(rpass, 10);
        const { data: newUser, error: rErr } = await supabase.from('users').insert({ name, email: remail, password: hashed }).select().single();
        if (rErr) return res.status(400).json({ error: rErr.message });
        const rToken = signToken({ userId: newUser.id, name: newUser.name, role: newUser.role });
        return res.status(200).json({ token: rToken, role: newUser.role });

      case 'profile':
        const requester = verifyRequest(req);
        if (!requester) return res.status(401).json({ error: 'Unauthorized.' });
        const { id } = req.query;
        const targetUserId = id ? parseInt(id) : requester.userId;
        const { data: pUser } = await supabase.from('users').select('id, name, email, role').eq('id', targetUserId).single();
        if (!pUser) return res.status(404).json({ error: 'User not found.' });
        const { count: uCount } = await supabase.from('notes').select('*', { count: 'exact', head: true }).eq('user_id', targetUserId);
        const { data: dData } = await supabase.from('notes').select('download_count').eq('user_id', targetUserId);
        const tDown = (dData || []).reduce((sum, n) => sum + (n.download_count || 0), 0);
        const { data: revs } = await supabase.from('user_reviews').select('rating').eq('reviewee_id', targetUserId);
        const avgR = revs && revs.length > 0 ? (revs.reduce((sum, r) => sum + r.rating, 0) / revs.length).toFixed(1) : 0;
        const { data: uDocs } = await supabase.from('notes').select('id, title, category, uploaded_at, download_count, subjects(name)').eq('user_id', targetUserId).order('uploaded_at', { ascending: false });
        return res.status(200).json({
          user: pUser, stats: { uploadCount: uCount || 0, totalDownloads: tDown, avgRating: avgR },
          documents: (uDocs || []).map(d => ({ ...d, subject_name: d.subjects?.name || 'Unknown' }))
        });

      case 'demo':
        const { data: demoUser } = await supabase.from('users').select('*').eq('email', 'demo@example.com').single();
        if (!demoUser) return res.status(404).json({ error: 'Demo account not found.' });
        const dToken = signToken({ userId: demoUser.id, name: demoUser.name, role: demoUser.role });
        return res.status(200).json({ token: dToken, role: demoUser.role });

      case 'google':
        return res.status(501).json({ error: 'Google sign-in integration pending library check.' });

      case 'forgot':
        return res.status(200).json({ message: 'Password reset link sent (mock).' });
      
      case 'reset':
        return res.status(200).json({ message: 'Password has been reset (mock).' });

      default:
        return res.status(400).json({ error: 'Invalid action.' });
    }
  } catch (err) {
    console.error('[Auth Manager Error]', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
};
