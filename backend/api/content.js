// backend/api/content.js
const { supabase } = require('../lib/supabase');
const { handleCors, verifyRequest } = require('../lib/auth');

module.exports = async function handler(req, res) {
  if (handleCors(req, res)) return;
  
  const { action } = req.method === 'GET' ? req.query : req.body;

  try {
    switch (action) {
      case 'get_notes':
        const { id, subject_id, unit } = req.query;
        let nQuery = supabase.from('notes').select(`id, title, file_path, file_type, category, uploaded_at, unit_number, user_id, subject_id, download_count, users(name), subjects(name)`).order('uploaded_at', { ascending: false });
        if (id) nQuery = nQuery.eq('id', parseInt(id));
        if (subject_id) nQuery = nQuery.eq('subject_id', parseInt(subject_id));
        if (unit) nQuery = nQuery.eq('unit_number', parseInt(unit));
        const { data: nData } = await nQuery;
        const notes = (nData || []).map(n => ({
          id: n.id, title: n.title, file_path: n.file_path, file_type: n.file_type, category: n.category || 'Notes', uploaded_at: n.uploaded_at, unit_number: n.unit_number, user_id: n.user_id, subject_id: n.subject_id, uploader_name: n.users?.name || 'Unknown', subject_name: n.subjects?.name || '', download_count: n.download_count || 0
        }));
        if (id) {
          if (!notes.length) return res.status(404).json({ error: 'Note not found.' });
          const { data: ratings } = await supabase.from('document_ratings').select('rating').eq('document_id', parseInt(id));
          const avgRating = ratings && ratings.length > 0 ? (ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length).toFixed(1) : 0;
          return res.status(200).json({ ...notes[0], avg_rating: avgRating, rating_count: ratings ? ratings.length : 0 });
        }
        return res.status(200).json(notes);

      case 'get_subjects':
        const { data: sData } = await supabase.from('subjects').select('*').order('name');
        const [{ count: totalNotes }, { count: totalUsers }] = await Promise.all([
          supabase.from('notes').select('*', { count: 'exact', head: true }),
          supabase.from('users').select('*', { count: 'exact', head: true }),
        ]);
        return res.status(200).json({
          subjects: sData,
          stats: { total_notes: totalNotes || 0, total_users: totalUsers || 0, total_subjects: sData.length }
        });

      case 'get_units':
        const { sid } = req.query;
        const { data: uData } = await supabase.from('syllabus').select('unit_number, title').eq('subject_id', sid).order('unit_number');
        return res.status(200).json(uData);

      case 'request_doc':
        const user = verifyRequest(req);
        if (!user) return res.status(401).json({ error: 'Unauthorized.' });
        const { title, subject_id: rsid, details } = req.body;
        await supabase.from('requests').insert({ user_id: user.userId, subject_id: rsid, title, description: details });
        return res.status(200).json({ success: true });

      case 'edit_note': {
        const u = verifyRequest(req);
        if (!u) return res.status(401).json({ error: 'Unauthorized.' });
        const { note_id, title: nTitle, category: nCat } = req.body;
        
        // Ownership check
        const { data: note } = await supabase.from('notes').select('user_id').eq('id', note_id).single();
        if (!note || note.user_id !== u.userId) return res.status(403).json({ error: 'Forbidden. You do not own this document.' });

        const { error: updateErr } = await supabase.from('notes').update({ title: nTitle, category: nCat }).eq('id', note_id);
        if (updateErr) throw updateErr;
        return res.status(200).json({ success: true });
      }

      case 'delete_note': {
        const u = verifyRequest(req);
        if (!u) return res.status(401).json({ error: 'Unauthorized.' });
        const { note_id: delId } = req.body;

        // Ownership check
        const { data: delNote } = await supabase.from('notes').select('user_id, file_path').eq('id', delId).single();
        if (!delNote || delNote.user_id !== u.userId) return res.status(403).json({ error: 'Forbidden.' });

        // Delete from DB
        const { error: delErr } = await supabase.from('notes').delete().eq('id', delId);
        if (delErr) throw delErr;

        // Note: We don't delete from storage here as it might be shared or kept for logs, 
        // but typically you'd call supabase.storage.from('resources').remove([delNote.file_path])
        
        return res.status(200).json({ success: true });
      }

      default:
        return res.status(400).json({ error: 'Invalid action.' });
    }
  } catch (err) {
    console.error('[Content Error]', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
};
