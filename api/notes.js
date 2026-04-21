// api/notes.js — Get notes (with optional filters: subject_id, unit, id)
const { supabase } = require('../lib/supabase');
const { handleCors } = require('../lib/auth');

module.exports = async function handler(req, res) {
  if (handleCors(req, res)) return;
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const { id, subject_id, unit } = req.query;

  let query = supabase
    .from('notes')
    .select(`
      id, title, file_path, file_type, category, uploaded_at, unit_number, user_id, subject_id,
      users ( name ),
      subjects ( name ),
      units ( unit_name )
    `)
    .order('uploaded_at', { ascending: false });

  // Filter by single note ID (for view_document page)
  if (id) query = query.eq('id', parseInt(id));
  // Filter by subject
  if (subject_id) query = query.eq('subject_id', parseInt(subject_id));
  // Filter by unit
  if (unit) query = query.eq('unit_number', parseInt(unit));

  const { data, error } = await query;
  if (error) return res.status(500).json({ error: 'Failed to fetch notes.' });

  // Flatten joined fields for easier frontend use
  const notes = (data || []).map((n) => ({
    id: n.id,
    title: n.title,
    file_path: n.file_path,
    file_type: n.file_type,
    category: n.category || 'Notes',
    uploaded_at: n.uploaded_at,
    unit_number: n.unit_number,
    user_id: n.user_id,
    subject_id: n.subject_id,
    uploader_name: n.users?.name || 'Unknown',
    subject_name: n.subjects?.name || '',
    unit_name: n.units?.unit_name || null,
  }));

  // If requesting a single note, return the object directly
  if (id) {
    if (!notes.length) return res.status(404).json({ error: 'Note not found.' });
    return res.status(200).json(notes[0]);
  }

  return res.status(200).json(notes);
};
