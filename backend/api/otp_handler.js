// backend/api/otp_handler.js
const { supabase } = require('../lib/supabase');
const { handleCors } = require('../lib/auth');
const nodemailer = require('nodemailer');

module.exports = async function handler(req, res) {
  if (handleCors(req, res)) return;
  
  const { action, email, otp } = req.body;

  if (!email) return res.status(400).json({ error: 'Email is required.' });

  try {
    switch (action) {
      case 'send-otp':
        // Generate a 6-digit OTP
        const generatedOtp = Math.floor(100000 + Math.random() * 900000).toString();
        const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString(); // 5 minutes

        // Store in Supabase (using the password_resets table as a generic OTP store for now)
        // Or we could use a dedicated 'otps' table if it existed.
        // Given the instructions, we'll use password_resets as it's already in the schema.
        await supabase.from('password_resets').delete().eq('email', email);
        const { error: dbError } = await supabase.from('password_resets').insert({
          email,
          token: generatedOtp,
          expires_at: expiresAt
        });

        if (dbError) throw dbError;

        // Send Email via Nodemailer
        if (process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD) {
          const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
              user: process.env.GMAIL_USER,
              pass: process.env.GMAIL_APP_PASSWORD
            }
          });

          await transporter.sendMail({
            from: `"StudyShare" <${process.env.GMAIL_USER}>`,
            to: email,
            subject: 'Your OTP Code',
            html: `<div style="font-family:sans-serif;padding:20px;border:1px solid #eee;border-radius:10px;max-width:500px;margin:auto;">
              <h2 style="color:#6366f1;text-align:center;">StudyShare</h2>
              <p>Your OTP code is:</p>
              <div style="font-size:32px;font-weight:bold;letter-spacing:8px;color:#4f46e5;margin:30px 0;text-align:center;background:#f8faff;padding:20px;border-radius:10px;">${generatedOtp}</div>
              <p style="color:#666;font-size:14px;">This code will expire in 5 minutes. If you didn't request this, please ignore this email.</p>
              <hr style="border:none;border-top:1px solid #eee;margin:20px 0;">
              <p style="font-size:12px;color:#999;text-align:center;">StudyShare - Your Campus Brain</p>
            </div>`
          });

          return res.status(200).json({ success: true, message: 'OTP sent successfully.' });
        } else {
          return res.status(500).json({ error: 'Email service not configured.' });
        }

      case 'verify-otp':
        if (!otp) return res.status(400).json({ error: 'OTP is required.' });

        const { data: entry, error: vError } = await supabase
          .from('password_resets')
          .select('*')
          .eq('email', email)
          .eq('token', otp)
          .gt('expires_at', new Date().toISOString())
          .single();

        if (vError || !entry) {
          return res.status(400).json({ error: 'Invalid or expired OTP.' });
        }

        // Optional: Delete OTP after verification to prevent reuse
        await supabase.from('password_resets').delete().eq('email', email);

        return res.status(200).json({ success: true, message: 'OTP verified successfully.' });

      default:
        return res.status(400).json({ error: 'Invalid action.' });
    }
  } catch (err) {
    console.error('[OTP Handler Error]', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
};
