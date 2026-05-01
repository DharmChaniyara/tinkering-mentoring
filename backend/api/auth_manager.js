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
        const lowLoginEmail = (email || '').toLowerCase().trim();
        const { data: user, error } = await supabase.from('users').select('*').eq('email', lowLoginEmail).single();
        if (error || !user) return res.status(401).json({ error: 'Invalid email or password.' });
        if (user.status === 'blocked') return res.status(403).json({ error: 'Your account has been blocked. Please contact admin.' });
        if (!(await bcrypt.compare(password, user.password))) return res.status(401).json({ error: 'Invalid email or password.' });
        const token = signToken({ userId: user.id, name: user.name, role: user.role, email: user.email });
        return res.status(200).json({ token, role: user.role });

      case 'send_reg_otp':
        const { email: sEmail } = req.body;
        const lowSEmail = (sEmail || '').toLowerCase().trim();
        
        // Validation
        const isGmail = lowSEmail.endsWith('@gmail.com');
        const isGsfc = lowSEmail.endsWith('@gsfcuniversity.ac.in');
        if (!isGmail && !isGsfc) return res.status(400).json({ error: 'Only @gmail.com and @gsfcuniversity.ac.in emails are allowed.' });

        // Check if user already exists
        const { data: existing } = await supabase.from('users').select('id').eq('email', lowSEmail).single();
        if (existing) return res.status(400).json({ error: 'An account with this email already exists.' });

        const sOtp = Math.floor(100000 + Math.random() * 900000).toString();
        const sExpires = new Date(Date.now() + 600000);
        await supabase.from('password_resets').upsert({ email: lowSEmail, token: sOtp, expires_at: sExpires }, { onConflict: 'email' });
        
        if (process.env.RESEND_API_KEY) {
          const { Resend } = require('resend');
          const resend = new Resend(process.env.RESEND_API_KEY);
          await resend.emails.send({
            from: process.env.RESEND_FROM || 'StudyShare <onboarding@resend.dev>',
            to: lowSEmail,
            subject: 'Verify your StudyShare Account',
            html: `<div style="font-family:sans-serif;padding:20px;border:1px solid #eee;border-radius:10px;">
              <h2 style="color:#6366f1;">StudyShare Registration</h2>
              <p>Your verification code is:</p>
              <div style="font-size:24px;font-weight:bold;letter-spacing:5px;color:#4f46e5;margin:20px 0;">${sOtp}</div>
              <p>Enter this code to complete your registration. Valid for 10 minutes.</p>
            </div>`
          });
        }
        return res.status(200).json({ message: 'Verification code sent to your email.' });

      case 'register':
        const { name, email: remail, password: rpass, otp: rotp } = req.body;
        const lowEmail = (remail || '').toLowerCase().trim();
        
        // 1. Verify OTP
        const { data: otpValid } = await supabase.from('password_resets').select('*').eq('email', lowEmail).eq('token', rotp).gt('expires_at', new Date().toISOString()).single();
        if (!otpValid) return res.status(400).json({ error: 'Invalid or expired verification code.' });

        const hashed = await bcrypt.hash(rpass, 10);
        const isSuperAdmin = lowEmail === 'dharmchaniyara7368@gmail.com';
        
        const { data: newUser, error: rErr } = await supabase.from('users').insert({ 
          name, 
          email: lowEmail, 
          password: hashed,
          role: isSuperAdmin ? 'admin' : 'user'
        }).select().single();
        
        if (rErr) return res.status(400).json({ error: rErr.message });
        
        // Clear OTP
        await supabase.from('password_resets').delete().eq('email', lowEmail);
        
        const rToken = signToken({ userId: newUser.id, name: newUser.name, role: newUser.role, email: newUser.email });
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
        const dToken = signToken({ userId: demoUser.id, name: demoUser.name, role: demoUser.role, email: demoUser.email });
        return res.status(200).json({ token: dToken, role: demoUser.role });

      case 'google':
        return res.status(501).json({ error: 'Google sign-in integration pending library check.' });

      case 'forgot':
        const { email: fEmail } = req.body;
        const { data: fUser } = await supabase.from('users').select('id, name').eq('email', fEmail).single();
        if (!fUser) return res.status(200).json({ message: 'If an account exists, a reset code has been sent.' });
        // Generate 6-digit OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const expires = new Date(Date.now() + 600000); // 10 minutes
        await supabase.from('password_resets').upsert({ email: fEmail, token: otp, expires_at: expires }, { onConflict: 'email' });
        
        // Send Email via Resend
        if (process.env.RESEND_API_KEY) {
          const { Resend } = require('resend');
          const resend = new Resend(process.env.RESEND_API_KEY);
          await resend.emails.send({
            from: process.env.RESEND_FROM || 'StudyShare <onboarding@resend.dev>',
            to: fEmail,
            subject: 'Your StudyShare Reset Code',
            html: `<div style="font-family:sans-serif;padding:20px;border:1px solid #eee;border-radius:10px;">
              <h2 style="color:#6366f1;">StudyShare</h2>
              <p>Hi ${fUser.name},</p>
              <p>Your password reset code is:</p>
              <div style="font-size:24px;font-weight:bold;letter-spacing:5px;color:#4f46e5;margin:20px 0;">${otp}</div>
              <p>This code will expire in 10 minutes.</p>
              <p>If you didn't request this, please ignore this email.</p>
            </div>`
          });
        }
        return res.status(200).json({ message: 'Password reset code sent.' });
      
      case 'reset':
        const { email: rEmail, otp: rOtp, password: newPass } = req.body;
        const { data: resetEntry } = await supabase.from('password_resets').select('*').eq('email', rEmail).eq('token', rOtp).gt('expires_at', new Date().toISOString()).single();
        if (!resetEntry) return res.status(400).json({ error: 'Invalid or expired code.' });
        const newHashed = await bcrypt.hash(newPass, 10);
        await supabase.from('users').update({ password: newHashed }).eq('email', rEmail);
        await supabase.from('password_resets').delete().eq('email', rEmail);
        return res.status(200).json({ message: 'Password has been reset successfully.' });

      case 'debug':
        return res.status(200).json({
          env_check: {
            SUPABASE_URL: !!process.env.SUPABASE_URL,
            SUPABASE_SERVICE_KEY: !!process.env.SUPABASE_SERVICE_KEY,
            JWT_SECRET: !!process.env.JWT_SECRET,
            RESEND_API_KEY: !!process.env.RESEND_API_KEY
          }
        });

      default:
        return res.status(400).json({ error: 'Invalid action.' });
    }
  } catch (err) {
    console.error('[Auth Manager Error]', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
};
