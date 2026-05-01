// backend/api/upload.js
const { supabase } = require('../lib/supabase');
const { verifyRequest, handleCors } = require('../lib/auth');

module.exports = async function handler(req, res) {
  if (handleCors(req, res)) return;
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const user = verifyRequest(req);
  if (!user) return res.status(401).json({ error: 'Unauthorized. Please log in.' });

  const { fileBase64, fileName, mimeType, category, subject_id, title, unit_number } = req.body || {};
  if (!fileBase64 || !fileName) return res.status(400).json({ error: 'No file provided.' });

  const ext = (fileName.split('.').pop() || '').toLowerCase();
  const allowed = ['pdf', 'doc', 'docx', 'ppt', 'pptx', 'txt', 'png', 'jpg', 'jpeg'];
  if (!allowed.includes(ext)) return res.status(400).json({ error: `File type .${ext} is not allowed.` });

  const subjectId = parseInt(subject_id);
  const trimmedTitle = (title || '').trim();
  const unitNumber = unit_number ? parseInt(unit_number) : null;
  if (!subjectId || !trimmedTitle) return res.status(400).json({ error: 'Subject and title are required.' });

  let fileBuffer;
  try { fileBuffer = Buffer.from(fileBase64, 'base64'); } catch (e) { return res.status(400).json({ error: 'Invalid file data.' }); }
  if (fileBuffer.length > 8 * 1024 * 1024) return res.status(400).json({ error: 'File size exceeds 8 MB limit.' });

  const storageFileName = `res_${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
  const { error: storageError } = await supabase.storage.from('uploads').upload(storageFileName, fileBuffer, { contentType: mimeType || 'application/octet-stream', upsert: false });
  if (storageError) return res.status(500).json({ error: 'File upload to storage failed.', detail: storageError.message });

  const { data: { publicUrl } } = supabase.storage.from('uploads').getPublicUrl(storageFileName);
  const { data: note, error: dbError } = await supabase.from('notes').insert({ user_id: user.userId, subject_id: subjectId, title: trimmedTitle, unit_number: unitNumber, file_path: publicUrl, file_type: ext, category: category || 'Notes' }).select().single();
  if (dbError) return res.status(500).json({ error: 'Database error while saving note.', detail: dbError.message });

  return res.status(200).json({ success: true, note, subjectId, unitNumber });
};
