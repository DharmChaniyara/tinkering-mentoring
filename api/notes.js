// api/notes.js — Get notes (with optional filters: subject_id, unit, id)
const { supabase } = require('../backend/lib/supabase');
const { handleCors } = require('../backend/lib/auth');

module.exports = async function handler(req, res) {
  if (handleCors(req, res)) return;
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const { id, subject_id, unit } = req.query;

  let query = supabase
    .from('notes')
    .select(`
      id, title, file_path, file_type, category, uploaded_at, unit_number, user_id, subject_id, download_count,
      users ( name ),
      subjects ( name )
    `)
    .order('uploaded_at', { ascending: false });

  // Filter by single note ID (for view_document page)
  if (id) query = query.eq('id', parseInt(id));
  // Filter by subject
  if (subject_id) query = query.eq('subject_id', parseInt(subject_id));
  // Filter by unit
  if (unit) query = query.eq('unit_number', parseInt(unit));

  const { data, error } = await query;
  if (error) {
    console.error('[Notes]', error);
    return res.status(500).json({ error: 'Failed to fetch notes.', detail: error.message });
  }

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
    unit_name: null,
    download_count: n.download_count || 0,
  }));

  // If requesting a single note, return the object directly
  if (id) {
    if (!notes.length) return res.status(404).json({ error: 'Note not found.' });
    
    // Fetch average rating for this document
    const { data: ratings } = await supabase
      .from('document_ratings')
      .select('rating')
      .eq('document_id', parseInt(id));
    
    const avgRating = ratings && ratings.length > 0 
      ? (ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length).toFixed(1)
      : 0;

    return res.status(200).json({ ...notes[0], avg_rating: avgRating, rating_count: ratings ? ratings.length : 0 });
  }

  return res.status(200).json(notes);
};
