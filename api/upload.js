// api/upload.js — Upload file to Supabase Storage + insert note record
const formidable = require('formidable');
const fs = require('fs');
const path = require('path');
const { supabase } = require('../backend/lib/supabase');
const { verifyRequest, handleCors } = require('../backend/lib/auth');

// Disable Vercel's default body parser — formidable handles it
// NOTE: config must be attached AFTER the handler is assigned below

const handler = async function handler(req, res) {
  if (handleCors(req, res)) return;
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  // Verify JWT
  const user = verifyRequest(req);
  if (!user) return res.status(401).json({ error: 'Unauthorized. Please log in.' });

  // Parse multipart form (max 10 MB)
  const form = formidable({ maxFileSize: 10 * 1024 * 1024 });
  let fields, files;
  try {
    [fields, files] = await form.parse(req);
  } catch (e) {
    return res.status(400).json({ error: 'Failed to parse uploaded file.' });
  }

  const file = files.file?.[0];
  if (!file) return res.status(400).json({ error: 'No file provided.' });

  const ext = path.extname(file.originalFilename || '').toLowerCase().replace('.', '');
  const allowed = ['pdf', 'doc', 'docx', 'ppt', 'pptx', 'txt', 'png', 'jpg', 'jpeg'];
  if (!allowed.includes(ext)) {
    return res.status(400).json({ error: `File type .${ext} is not allowed.` });
  }

  // Read file buffer and upload to Supabase Storage
  const fileBuffer = fs.readFileSync(file.filepath);
  const fileName = `res_${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;

  const { error: storageError } = await supabase.storage
    .from('uploads')
    .upload(fileName, fileBuffer, { contentType: file.mimetype || 'application/octet-stream' });

  if (storageError) {
    console.error('[Storage]', storageError);
    return res.status(500).json({ error: 'File upload to storage failed.', detail: storageError.message });
  }

  const { data: { publicUrl } } = supabase.storage.from('uploads').getPublicUrl(fileName);

  // Validate required fields
  const subjectId = parseInt(fields.subject_id?.[0]);
  const title = (fields.title?.[0] || '').trim();
  const category = fields.category?.[0] || 'Notes';
  const unitNumber = fields.unit_number?.[0] ? parseInt(fields.unit_number[0]) : null;

  if (!subjectId || !title) {
    return res.status(400).json({ error: 'Subject and title are required.' });
  }

  // Insert note record in the database
  const { data: note, error: dbError } = await supabase
    .from('notes')
    .insert({
      user_id: user.userId,
      subject_id: subjectId,
      title,
      unit_number: unitNumber,
      file_path: publicUrl,
      file_type: ext,
      category,
    })
    .select()
    .single();

  if (dbError) {
    console.error('[DB]', dbError);
    return res.status(500).json({ error: 'Database error while saving note.', detail: dbError.message });
  }

  return res.status(200).json({ success: true, note, subjectId, unitNumber });
};

// Attach config AFTER handler is defined so it isn't overwritten
handler.config = { api: { bodyParser: false } };
module.exports = handler;
