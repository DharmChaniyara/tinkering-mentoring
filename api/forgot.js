// api/forgot.js — Password reset: generate token + send email
const crypto = require('crypto');
const { Resend } = require('resend');
const { supabase } = require('../backend/lib/supabase');
const { handleCors } = require('../backend/lib/auth');

async function sendResetEmail(toEmail, toName, resetLink) {
  const resend = new Resend(process.env.RESEND_API_KEY);
  const from   = process.env.RESEND_FROM || 'StudyShare <onboarding@resend.dev>';
  const safeName = (toName || 'Student').replace(/[<>&"]/g, '');

  await resend.emails.send({
    from,
    to: toEmail,
    subject: 'Reset Your StudyShare Password',
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
          <h2 style="margin:0 0 12px;font-size:20px;color:#f9fafb;">Password Reset Request</h2>
          <p style="margin:0 0 20px;font-size:15px;color:#9ca3af;line-height:1.6;">
            Hi <strong style="color:#e5e7eb;">${safeName}</strong>,<br><br>
            We received a request to reset your StudyShare password.
            Click below to set a new password. This link expires in <strong>1 hour</strong>.
          </p>
          <table cellpadding="0" cellspacing="0" style="margin:28px 0;"><tr><td align="center">
            <a href="${resetLink}" style="display:inline-block;padding:14px 36px;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;text-decoration:none;border-radius:8px;font-size:15px;font-weight:600;">
              Reset My Password
            </a>
          </td></tr></table>
          <p style="margin:0 0 16px;font-size:13px;color:#6b7280;">If the button doesn't work, copy this link:</p>
          <p style="margin:0 0 24px;font-size:12px;word-break:break-all;">
            <a href="${resetLink}" style="color:#818cf8;">${resetLink}</a>
          </p>
          <hr style="border:none;border-top:1px solid #1f2937;margin:24px 0;">
          <p style="margin:0;font-size:12px;color:#6b7280;line-height:1.6;">
            If you didn't request this, you can safely ignore this email.<br>— The StudyShare Team
          </p>
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

  const { email } = req.body || {};
  // Always respond generically to prevent email enumeration
  const genericMsg = 'If an account with that email exists, a reset link has been sent. Check your inbox.';

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(200).json({ message: genericMsg });
  }

  const { data: user } = await supabase
    .from('users')
    .select('id, name')
    .eq('email', email.toLowerCase().trim())
    .maybeSingle();

  if (user) {
    // Invalidate existing tokens
    await supabase
      .from('password_reset_tokens')
      .update({ used: true })
      .eq('user_id', user.id)
      .eq('used', false);

    // Create new token
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 3600 * 1000).toISOString();

    await supabase
      .from('password_reset_tokens')
      .insert({ user_id: user.id, token, expires_at: expiresAt });

    const appUrl = process.env.APP_URL || 'https://your-app.vercel.app';
    const resetLink = `${appUrl}/reset_password?token=${token}`;

    sendResetEmail(email, user.name, resetLink).catch((e) =>
      console.error('[Mailer] Reset email failed:', e.message)
    );
  }

  return res.status(200).json({ message: genericMsg });
};
