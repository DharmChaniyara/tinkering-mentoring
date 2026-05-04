// api/auth_manager.js
const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');

// Inline Supabase Client Initialization
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// Helper for JWT
const signToken = (payload) => jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '7d' });

// CORS Helper
function handleCors(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return true;
  }
  return false;
}

// Auth Verification Helper
function verifyRequest(req) {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return null;
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    return null;
  }
}

module.exports = async function handler(req, res) {
  if (handleCors(req, res)) return;
  const { action } = req.method === 'GET' ? req.query : req.body;

  try {
    switch (action) {
      case 'login':
        const { email, password } = req.body;
        const lowLoginEmail = (email || '').toLowerCase().trim();
        const { data: user, error } = await supabase.from('users').select('*').eq('email', lowLoginEmail).single();
        if (error || !user) return res.status(401).json({ error: 'Invalid email or password.' });
        if (user.status === 'blocked') return res.status(403).json({ error: 'Your account has been blocked.' });
        if (!(await bcrypt.compare(password, user.password))) return res.status(401).json({ error: 'Invalid email or password.' });
        const token = signToken({ userId: user.id, name: user.name, role: user.role, email: user.email, profile_pic: user.profile_pic });
        return res.status(200).json({ token, role: user.role });

      case 'register':
        const { name, email: remail, password: rpass } = req.body;
        const lowEmail = (remail || '').toLowerCase().trim();
        const isSuperAdmin = lowEmail === 'dharmchaniyara7368@gmail.com';
        const hashed = await bcrypt.hash(rpass, 10);
        const { data: newUser, error: rErr } = await supabase.from('users').insert({ 
          name, email: lowEmail, password: hashed, role: isSuperAdmin ? 'admin' : 'user'
        }).select().single();
        if (rErr) return res.status(400).json({ error: rErr.message });
        const rToken = signToken({ userId: newUser.id, name: newUser.name, role: newUser.role, email: newUser.email, profile_pic: newUser.profile_pic });
        return res.status(200).json({ token: rToken, role: newUser.role });

      case 'forgot':
        const { email: fEmail } = req.body;
        const { data: fUser } = await supabase.from('users').select('id, name').eq('email', fEmail).maybeSingle();
        if (!fUser) return res.status(404).json({ error: 'No account found with this email.' });
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const expires = new Date(Date.now() + 600000).toISOString();
        await supabase.from('password_resets').delete().eq('email', fEmail);
        await supabase.from('password_resets').insert({ email: fEmail, token: otp, expires_at: expires });

        if (process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD) {
          const transporter = nodemailer.createTransport({
            service: 'gmail', auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_APP_PASSWORD }
          });
          await transporter.sendMail({
            from: `"StudyShare" <${process.env.GMAIL_USER}>`,
            to: fEmail,
            subject: 'Your OTP Code',
            html: `<div style="font-family:sans-serif;padding:20px;border:1px solid #eee;border-radius:10px;max-width:500px;margin:auto;">
              <h2 style="color:#6366f1;text-align:center;">StudyShare</h2>
              <p>Hi ${fUser.name},</p>
              <p>Your OTP code for password reset is:</p>
              <div style="font-size:32px;font-weight:bold;letter-spacing:8px;color:#4f46e5;margin:30px 0;text-align:center;background:#f8faff;padding:20px;border-radius:10px;">${otp}</div>
              <p style="color:#666;font-size:14px;">This code will expire in 10 minutes.</p>
            </div>`
          });
          return res.status(200).json({ message: 'OTP sent successfully.' });
        }
        return res.status(500).json({ error: 'Email service not configured.' });

      case 'reset':
        const { email: rsEmail, otp: rsOtp, password: newPass } = req.body;
        const { data: resetEntry } = await supabase.from('password_resets').select('*').eq('email', rsEmail).eq('token', rsOtp).gt('expires_at', new Date().toISOString()).single();
        if (!resetEntry) return res.status(400).json({ error: 'Invalid or expired code.' });
        const newHashed = await bcrypt.hash(newPass, 10);
        await supabase.from('users').update({ password: newHashed }).eq('email', rsEmail);
        await supabase.from('password_resets').delete().eq('email', rsEmail);
        return res.status(200).json({ message: 'Password reset successful.' });

      case 'debug':
        return res.status(200).json({
          env_check: {
            SUPABASE_URL: !!process.env.SUPABASE_URL,
            SUPABASE_SERVICE_KEY: !!process.env.SUPABASE_SERVICE_KEY,
            JWT_SECRET: !!process.env.JWT_SECRET,
            GMAIL_USER: !!process.env.GMAIL_USER,
            GMAIL_APP_PASSWORD: !!process.env.GMAIL_APP_PASSWORD
          }
        });

      default:
        return res.status(400).json({ error: 'Invalid action.' });
    }
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
};
