// api/upload.js — Upload file to Supabase Storage + insert note record
// Receives file as base64-encoded JSON (avoids formidable/multipart issues on Vercel)
const { supabase } = require('../backend/lib/supabase');
const { verifyRequest, handleCors } = require('../backend/lib/auth');

module.exports = async function handler(req, res) {
  if (handleCors(req, res)) return;
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  // Verify JWT
  const user = verifyRequest(req);
  if (!user) return res.status(401).json({ error: 'Unauthorized. Please log in.' });

  const { fileBase64, fileName, mimeType, category, subject_id, title, unit_number } = req.body || {};

  // Validate file presence
  if (!fileBase64 || !fileName) {
    return res.status(400).json({ error: 'No file provided.' });
  }

  // Validate file type
  const ext = (fileName.split('.').pop() || '').toLowerCase();
  const allowed = ['pdf', 'doc', 'docx', 'ppt', 'pptx', 'txt', 'png', 'jpg', 'jpeg'];
  if (!allowed.includes(ext)) {
    return res.status(400).json({ error: `File type .${ext} is not allowed.` });
  }

  // Validate required fields
  const subjectId = parseInt(subject_id);
  const trimmedTitle = (title || '').trim();
  const unitNumber = unit_number ? parseInt(unit_number) : null;

  if (!subjectId || !trimmedTitle) {
    return res.status(400).json({ error: 'Subject and title are required.' });
  }

  // Decode base64 to Buffer
  let fileBuffer;
  try {
    fileBuffer = Buffer.from(fileBase64, 'base64');
  } catch (e) {
    return res.status(400).json({ error: 'Invalid file data.' });
  }

  // Enforce 8 MB limit
  if (fileBuffer.length > 8 * 1024 * 1024) {
    return res.status(400).json({ error: 'File size exceeds 8 MB limit.' });
  }

  // Upload to Supabase Storage
  const storageFileName = `res_${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;

  const { error: storageError } = await supabase.storage
    .from('uploads')
    .upload(storageFileName, fileBuffer, {
      contentType: mimeType || 'application/octet-stream',
      upsert: false,
    });

  if (storageError) {
    console.error('[Storage]', storageError);
    return res.status(500).json({ error: 'File upload to storage failed.', detail: storageError.message });
  }

  const { data: { publicUrl } } = supabase.storage.from('uploads').getPublicUrl(storageFileName);

  // Insert note record in the database
  const { data: note, error: dbError } = await supabase
    .from('notes')
    .insert({
      user_id: user.userId,
      subject_id: subjectId,
      title: trimmedTitle,
      unit_number: unitNumber,
      file_path: publicUrl,
      file_type: ext,
      category: category || 'Notes',
    })
    .select()
    .single();

  if (dbError) {
    console.error('[DB]', dbError);
    return res.status(500).json({ error: 'Database error while saving note.', detail: dbError.message });
  }

  return res.status(200).json({ success: true, note, subjectId, unitNumber });
};
