// api/register.js — New user registration
const bcrypt = require('bcryptjs');
const { Resend } = require('resend');
const { supabase } = require('../backend/lib/supabase');
const { signToken, handleCors } = require('../backend/lib/auth');

async function sendWelcomeEmail(toEmail, toName, appUrl) {
  const resend = new Resend(process.env.RESEND_API_KEY);
  const from   = process.env.RESEND_FROM || 'StudyShare <onboarding@resend.dev>';
  const safeName = toName.replace(/[<>&"]/g, '');

  await resend.emails.send({
    from,
    to: toEmail,
    subject: 'Welcome to StudyShare! 🎓',
    html: `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#0d0d0d;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0d0d0d;padding:40px 20px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#111827;border-radius:16px;border:1px solid #1f2937;overflow:hidden;max-width:560px;width:100%;">
        <tr><td style="background:linear-gradient(135deg,#6366f1,#8b5cf6);padding:36px 40px;text-align:center;">
          <h1 style="margin:0;font-size:28px;color:#fff;">StudyShare</h1>
          <p style="margin:6px 0 0;font-size:13px;color:rgba(255,255,255,0.75);">GSFC University · Semester II</p>
        </td></tr>
        <tr><td style="padding:40px;">
          <h2 style="margin:0 0 12px;font-size:20px;color:#f9fafb;">Welcome aboard, ${safeName}! 🎉</h2>
          <p style="margin:0 0 20px;font-size:15px;color:#9ca3af;line-height:1.6;">
            Your StudyShare account has been created. Upload notes, download resources, and collaborate!
          </p>
          <table cellpadding="0" cellspacing="0" style="margin:28px 0;"><tr><td>
            <a href="${appUrl}/dashboard" style="display:inline-block;padding:14px 36px;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;text-decoration:none;border-radius:8px;font-size:15px;font-weight:600;">
              Go to Dashboard →
            </a>
          </td></tr></table>
        </td></tr>
        <tr><td style="background:#0d0d0d;padding:20px 40px;text-align:center;">
          <p style="margin:0;font-size:11px;color:#374151;">© 2024 StudyShare · GSFC University</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`,
  });
}

module.exports = async function handler(req, res) {
  if (handleCors(req, res)) return;
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { name, email, password, confirm_password } = req.body || {};

  if (!name || !email || !password || !confirm_password) {
    return res.status(400).json({ error: 'All fields are required.' });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: 'Please enter a valid email address.' });
  }
  if (password.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters.' });
  }
  if (password !== confirm_password) {
    return res.status(400).json({ error: 'Passwords do not match.' });
  }

  // Check for existing email
  const { data: existing } = await supabase
    .from('users')
    .select('id')
    .eq('email', email.toLowerCase().trim())
    .maybeSingle();

  if (existing) {
    return res.status(409).json({ error: 'This email is already registered — please log in.' });
  }

  const hash = await bcrypt.hash(password, 12);
  const { data: user, error } = await supabase
    .from('users')
    .insert({ name: name.trim(), email: email.toLowerCase().trim(), password_hash: hash })
    .select('id, name')
    .single();

  if (error) {
    console.error('[Register] DB insert error:', error.message, error.code);
    return res.status(500).json({ error: 'Registration failed. Please try again.' });
  }

  // Send welcome email (fully non-blocking — never crashes registration)
  const appUrl = process.env.APP_URL || 'https://your-app.vercel.app';
  sendWelcomeEmail(email, name, appUrl).catch((e) =>
    console.error('[Mailer] Welcome email failed (non-fatal):', e.message)
  );

  return res.status(200).json({
    token: signToken(user.id, user.name),
    name: user.name,
    userId: user.id,
  });
};
