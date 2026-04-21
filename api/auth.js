// api/auth.js — Login (with login notification email), Google OAuth, Demo login
const bcrypt = require('bcryptjs');
const { Resend } = require('resend');
const { supabase } = require('../backend/lib/supabase');
const { signToken, handleCors } = require('../backend/lib/auth');

// ── Login Notification Email ──────────────────────────────────────────────────
async function sendLoginAlert(toEmail, toName) {
  if (!process.env.RESEND_API_KEY) return; // Skip if not configured
  const resend = new Resend(process.env.RESEND_API_KEY);
  const from   = process.env.RESEND_FROM || 'StudyShare <onboarding@resend.dev>';
  const safeName = (toName || 'Student').replace(/[<>&"]/g, '');
  const time = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });

  resend.emails.send({
    from,
    to: toEmail,
    subject: '🔐 New sign-in to your StudyShare account',
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
          <h2 style="margin:0 0 12px;font-size:20px;color:#f9fafb;">New Sign-In Detected 🔐</h2>
          <p style="margin:0 0 8px;font-size:15px;color:#9ca3af;line-height:1.6;">
            Hi <strong style="color:#e5e7eb;">${safeName}</strong>, we noticed a new sign-in to your account.
          </p>
          <table cellpadding="0" cellspacing="0" width="100%" style="margin:24px 0;background:#1f2937;border-radius:8px;padding:16px 20px;">
            <tr><td>
              <p style="margin:4px 0;font-size:13px;color:#9ca3af;">⏰ <strong style="color:#e5e7eb;">Time:</strong> ${time} IST</p>
              <p style="margin:4px 0;font-size:13px;color:#9ca3af;">📧 <strong style="color:#e5e7eb;">Account:</strong> ${toEmail}</p>
            </td></tr>
          </table>
          <p style="margin:0;font-size:13px;color:#6b7280;">
            If this was you, no action is needed. If you didn't sign in, please change your password immediately.
          </p>
        </td></tr>
        <tr><td style="background:#0d0d0d;padding:20px 40px;text-align:center;">
          <p style="margin:0;font-size:11px;color:#374151;">© 2025 StudyShare · GSFC University</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`,
  }).catch((e) => console.error('[Mailer] Login alert failed:', e.message));
}

// ── Handler ───────────────────────────────────────────────────────────────────
module.exports = async function handler(req, res) {
  if (handleCors(req, res)) return;
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { action, email, password, credential } = req.body || {};

  // ── Email / Password Login ─────────────────────────────────────────────────
  if (action === 'login') {
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const { data: user, error } = await supabase
      .from('users')
      .select('id, name, email, password_hash')
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

    // Fire login alert email (non-blocking)
    sendLoginAlert(user.email, user.name);

    return res.status(200).json({
      token: signToken(user.id, user.name),
      name: user.name,
      userId: user.id,
    });
  }

  // ── Google OAuth ──────────────────────────────────────────────────────────
  if (action === 'google') {
    if (!credential) return res.status(400).json({ error: 'No Google credential provided.' });

    let info;
    try {
      const infoRes = await fetch(
        `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(credential)}`
      );
      info = await infoRes.json();
    } catch (e) {
      return res.status(500).json({ error: 'Failed to verify Google token.' });
    }

    if (info.error_description || info.error) {
      return res.status(401).json({ error: `Google sign-in failed: ${info.error_description || info.error}` });
    }

    const { sub: google_id, email: gEmail, name, picture: profile_pic } = info;

    if (!gEmail) {
      return res.status(400).json({ error: 'Could not retrieve email from Google account.' });
    }

    // Find existing user by google_id OR email (handles account linking)
    let { data: user } = await supabase
      .from('users')
      .select('id, name, email')
      .or(`google_id.eq.${google_id},email.eq.${gEmail}`)
      .maybeSingle();

    if (user) {
      // Sync latest Google profile info
      await supabase
        .from('users')
        .update({ google_id, profile_pic, name })
        .eq('id', user.id);
    } else {
      // Create new account for first-time Google sign-in
      const { data: newUser, error: insertErr } = await supabase
        .from('users')
        .insert({ google_id, name, email: gEmail.toLowerCase(), profile_pic })
        .select('id, name, email')
        .single();
      if (insertErr) {
        console.error('[Google Auth] Insert error:', insertErr.message);
        return res.status(500).json({ error: 'Failed to create account. Please try again.' });
      }
      user = newUser;
    }

    return res.status(200).json({
      token: signToken(user.id, user.name),
      name: user.name,
      userId: user.id,
    });
  }

  // ── Demo Login ─────────────────────────────────────────────────────────────
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
