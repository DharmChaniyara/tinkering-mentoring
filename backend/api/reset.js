// api/reset.js — Apply new password with a valid reset token
const bcrypt = require('bcryptjs');
const { supabase } = require('../lib/supabase');
const { handleCors } = require('../lib/auth');

module.exports = async function handler(req, res) {
  if (handleCors(req, res)) return;
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { token, password, confirm } = req.body || {};

  if (!token) return res.status(400).json({ error: 'Missing reset token.' });
  if (!password || password.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters.' });
  }
  if (password !== confirm) {
    return res.status(400).json({ error: 'Passwords do not match.' });
  }

  // Verify token validity
  const { data: resetToken } = await supabase
    .from('password_reset_tokens')
    .select('id, user_id, expires_at, used')
    .eq('token', token)
    .eq('used', false)
    .maybeSingle();

  if (!resetToken) {
    return res.status(400).json({ error: 'Invalid or expired reset link.' });
  }
  if (new Date(resetToken.expires_at) < new Date()) {
    return res.status(400).json({ error: 'Reset link has expired. Please request a new one.' });
  }

  const hash = await bcrypt.hash(password, 12);

  // Update the password
  await supabase.from('users').update({ password_hash: hash }).eq('id', resetToken.user_id);

  // Mark token as used
  await supabase
    .from('password_reset_tokens')
    .update({ used: true })
    .eq('id', resetToken.id);

  return res.status(200).json({ message: 'Password updated successfully. You can now log in.' });
};
