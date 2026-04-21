// api/forgot.js — Password reset: generate 6-digit OTP + send email
const { Resend } = require('resend');
const { supabase } = require('../backend/lib/supabase');
const { handleCors } = require('../backend/lib/auth');

// ── Email Helper ─────────────────────────────────────────────────────────────
async function sendOtpEmail(toEmail, toName, otp) {
  const resend = new Resend(process.env.RESEND_API_KEY);
  const from   = process.env.RESEND_FROM || 'StudyShare <onboarding@resend.dev>';
  const safeName = (toName || 'Student').replace(/[<>&"]/g, '');

  const { error } = await resend.emails.send({
    from,
    to: toEmail,
    subject: `${otp} is your StudyShare password reset code`,
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
          <p style="margin:0 0 28px;font-size:15px;color:#9ca3af;line-height:1.6;">
            Hi <strong style="color:#e5e7eb;">${safeName}</strong>,<br><br>
            Use this 6-digit code to reset your password. It expires in <strong style="color:#e5e7eb;">10 minutes</strong>.
          </p>

          <!-- OTP Code Block -->
          <table cellpadding="0" cellspacing="0" width="100%" style="margin:0 0 32px;">
            <tr><td align="center">
              <div style="display:inline-block;background:#1f2937;border:2px solid #6366f1;border-radius:12px;padding:20px 40px;">
                <span style="font-size:42px;font-weight:800;letter-spacing:12px;color:#a5b4fc;font-family:'Courier New',monospace;">${otp}</span>
              </div>
            </td></tr>
          </table>

          <hr style="border:none;border-top:1px solid #1f2937;margin:24px 0;">
          <p style="margin:0;font-size:12px;color:#6b7280;line-height:1.6;">
            If you didn't request this, you can safely ignore this email. The code will expire automatically.<br>
            — The StudyShare Team
          </p>
        </td></tr>
        <tr><td style="background:#0d0d0d;padding:20px 40px;text-align:center;">
          <p style="margin:0;font-size:11px;color:#374151;">© 2025 StudyShare · GSFC University</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`,
  });

  if (error) throw new Error(error.message);
}

// ── Handler ───────────────────────────────────────────────────────────────────
module.exports = async function handler(req, res) {
  if (handleCors(req, res)) return;
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { email } = req.body || {};
  const genericMsg = 'If an account with that email exists, a reset code has been sent to your inbox.';

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(200).json({ message: genericMsg });
  }

  const { data: user } = await supabase
    .from('users')
    .select('id, name')
    .eq('email', email.toLowerCase().trim())
    .maybeSingle();

  if (user) {
    // Invalidate old OTPs
    await supabase
      .from('password_reset_tokens')
      .update({ used: true })
      .eq('user_id', user.id)
      .eq('used', false);

    // Generate 6-digit numeric OTP (100000 – 999999)
    const otp = String(Math.floor(100000 + Math.random() * 900000));
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 min

    await supabase
      .from('password_reset_tokens')
      .insert({ user_id: user.id, token: otp, expires_at: expiresAt });

    sendOtpEmail(email, user.name, otp).catch((e) =>
      console.error('[Mailer] OTP email failed:', e.message)
    );
  }

  return res.status(200).json({ message: genericMsg });
};
