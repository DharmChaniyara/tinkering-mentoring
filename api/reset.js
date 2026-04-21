// api/reset.js — Validate 6-digit OTP and set new password
const bcrypt = require('bcryptjs');
const { supabase } = require('../backend/lib/supabase');
const { handleCors } = require('../backend/lib/auth');

module.exports = async function handler(req, res) {
  if (handleCors(req, res)) return;
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { email, otp, password, confirm } = req.body || {};

  if (!email || !otp) return res.status(400).json({ error: 'Email and OTP code are required.' });
  if (!password || password.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters.' });
  }
  if (password !== confirm) {
    return res.status(400).json({ error: 'Passwords do not match.' });
  }
  if (!/^\d{6}$/.test(otp)) {
    return res.status(400).json({ error: 'Invalid OTP format. Please enter the 6-digit code from your email.' });
  }

  // Look up user by email
  const { data: user } = await supabase
    .from('users')
    .select('id')
    .eq('email', email.toLowerCase().trim())
    .maybeSingle();

  if (!user) {
    return res.status(400).json({ error: 'No account found with that email address.' });
  }

  // Validate OTP
  const { data: resetToken } = await supabase
    .from('password_reset_tokens')
    .select('id, expires_at, used')
    .eq('user_id', user.id)
    .eq('token', otp)
    .eq('used', false)
    .maybeSingle();

  if (!resetToken) {
    return res.status(400).json({ error: 'Invalid OTP code. Please check your email or request a new code.' });
  }
  if (new Date(resetToken.expires_at) < new Date()) {
    return res.status(400).json({ error: 'OTP has expired (10 minutes). Please request a new code.' });
  }

  // Hash and save new password
  const hash = await bcrypt.hash(password, 12);
  await supabase.from('users').update({ password_hash: hash }).eq('id', user.id);

  // Mark OTP as used
  await supabase
    .from('password_reset_tokens')
    .update({ used: true })
    .eq('id', resetToken.id);

  return res.status(200).json({ message: 'Password updated successfully! You can now log in.' });
};
