// api/otp_handler.js
const { createClient } = require('@supabase/supabase-js');
const nodemailer = require('nodemailer');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

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

module.exports = async function handler(req, res) {
  if (handleCors(req, res)) return;
  const { action, email, otp } = req.body;

  if (!email) return res.status(400).json({ error: 'Email is required.' });

  try {
    switch (action) {
      case 'send-otp':
        const generatedOtp = Math.floor(100000 + Math.random() * 900000).toString();
        const expiresAt = new Date(Date.now() + 300000).toISOString(); // 5 min
        await supabase.from('password_resets').delete().eq('email', email);
        await supabase.from('password_resets').insert({ email, token: generatedOtp, expires_at: expiresAt });

        if (process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD) {
          const transporter = nodemailer.createTransport({
            service: 'gmail', auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_APP_PASSWORD }
          });
          await transporter.sendMail({
            from: `"StudyShare" <${process.env.GMAIL_USER}>`,
            to: email,
            subject: 'Your OTP Code',
            html: `<div style="font-family:sans-serif;padding:20px;border:1px solid #eee;border-radius:10px;max-width:500px;margin:auto;">
              <h2 style="color:#6366f1;text-align:center;">StudyShare</h2>
              <p>Your verification code is:</p>
              <div style="font-size:32px;font-weight:bold;letter-spacing:8px;color:#4f46e5;margin:30px 0;text-align:center;background:#f8faff;padding:20px;border-radius:10px;">${generatedOtp}</div>
              <p style="color:#666;font-size:14px;">Valid for 5 minutes.</p>
            </div>`
          });
          return res.status(200).json({ message: 'OTP sent.' });
        }
        return res.status(500).json({ error: 'Email service missing.' });

      case 'verify-otp':
        const { data: entry } = await supabase.from('password_resets').select('*').eq('email', email).eq('token', otp).gt('expires_at', new Date().toISOString()).single();
        if (!entry) return res.status(400).json({ error: 'Invalid or expired OTP.' });
        await supabase.from('password_resets').delete().eq('email', email);
        return res.status(200).json({ success: true, message: 'Verified.' });

      default:
        return res.status(400).json({ error: 'Invalid action.' });
    }
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error.' });
  }
};
