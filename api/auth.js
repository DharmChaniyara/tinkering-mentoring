// api/auth.js — Login, Google OAuth, Demo login
const bcrypt = require('bcryptjs');
const { supabase } = require('../backend/lib/supabase');
const { signToken, handleCors } = require('../backend/lib/auth');

module.exports = async function handler(req, res) {
  if (handleCors(req, res)) return;
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { action, email, password, credential } = req.body || {};

  // ── Email / Password Login ────────────────────────────────────────────────
  if (action === 'login') {
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const { data: user, error } = await supabase
      .from('users')
      .select('id, name, password_hash')
      .eq('email', email.toLowerCase().trim())
      .not('password_hash', 'is', null)
      .maybeSingle();

    if (error || !user) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    return res.status(200).json({
      token: signToken(user.id, user.name),
      name: user.name,
      userId: user.id,
    });
  }

  // ── Google OAuth ──────────────────────────────────────────────────────────
  if (action === 'google') {
    if (!credential) return res.status(400).json({ error: 'No Google credential.' });

    const infoRes = await fetch(
      `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(credential)}`
    );
    const info = await infoRes.json();

    if (info.error_description) {
      return res.status(401).json({ error: `Google token invalid: ${info.error_description}` });
    }

    const { sub: google_id, email: gEmail, name, picture: profile_pic } = info;

    let { data: user } = await supabase
      .from('users')
      .select('id, name')
      .or(`google_id.eq.${google_id},email.eq.${gEmail}`)
      .maybeSingle();

    if (user) {
      await supabase.from('users').update({ google_id, profile_pic }).eq('id', user.id);
    } else {
      const { data: newUser, error: insertErr } = await supabase
        .from('users')
        .insert({ google_id, name, email: gEmail, profile_pic })
        .select('id, name')
        .single();
      if (insertErr) return res.status(500).json({ error: 'Failed to create account.' });
      user = newUser;
    }

    return res.status(200).json({
      token: signToken(user.id, user.name),
      name: user.name,
      userId: user.id,
    });
  }

  // ── Demo Login ────────────────────────────────────────────────────────────
  if (action === 'demo') {
    const demoEmail = 'demo@gsfcuniversity.ac.in';
    let { data: user } = await supabase
      .from('users')
      .select('id, name')
      .eq('email', demoEmail)
      .maybeSingle();

    if (!user) {
      const { data: newUser } = await supabase
        .from('users')
        .insert({ google_id: 'demo_google_001', name: 'CSE Student (Demo)', email: demoEmail })
        .select('id, name')
        .single();
      user = newUser;
    }

    return res.status(200).json({
      token: signToken(user.id, user.name),
      name: user.name,
      userId: user.id,
    });
  }

  return res.status(400).json({ error: 'Invalid action.' });
};
