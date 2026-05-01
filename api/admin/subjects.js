// api/admin/subjects.js
const { supabase } = require('../../backend/lib/supabase');
const { verifyRequest, handleCors } = require('../../backend/lib/auth');

module.exports = async function handler(req, res) {
  if (handleCors(req, res)) return;

  const user = verifyRequest(req);
  if (!user || user.role !== 'admin') {
    return res.status(403).json({ error: 'Forbidden. Admin access required.' });
  }

  // Handle Subjects
  if (req.method === 'GET') {
    const { type } = req.query; // 'subjects' or 'syllabus'
    
    if (type === 'syllabus') {
      const { subject_id } = req.query;
      let query = supabase.from('syllabus').select('*').order('id', { ascending: true });
      if (subject_id) query = query.eq('subject_id', subject_id);
      
      const { data, error } = await query;
      if (error) return res.status(500).json({ error: 'Failed to fetch syllabus.' });
      return res.status(200).json(data);
    }

    // Default: fetch subjects
    const { data: subjects, error } = await supabase.from('subjects').select('*').order('name', { ascending: true });
    if (error) return res.status(500).json({ error: 'Failed to fetch subjects.' });
    return res.status(200).json(subjects);
  }

  if (req.method === 'POST') {
    const { type } = req.body || {};
    
    if (type === 'syllabus') {
      const { subject_id, content } = req.body;
      if (!subject_id || !content) return res.status(400).json({ error: 'Subject ID and content required.' });
      const { data, error } = await supabase.from('syllabus').insert({ subject_id, content }).select().single();
      if (error) return res.status(500).json({ error: 'Failed to add syllabus.' });
      return res.status(200).json(data);
    }

    // Default: add subject
    const { name, type: subjectType } = req.body;
    if (!name) return res.status(400).json({ error: 'Subject name required.' });
    const { data, error } = await supabase.from('subjects').insert({ name, type: subjectType || 'Core' }).select().single();
    if (error) return res.status(500).json({ error: 'Failed to add subject.' });
    return res.status(200).json(data);
  }

  if (req.method === 'PUT') {
    const { type, id } = req.body || {};
    if (!id) return res.status(400).json({ error: 'ID required.' });

    if (type === 'syllabus') {
      const { content } = req.body;
      const { data, error } = await supabase.from('syllabus').update({ content }).eq('id', id).select().single();
      if (error) return res.status(500).json({ error: 'Failed to update syllabus.' });
      return res.status(200).json(data);
    }

    // Default: update subject
    const { name, subjectType } = req.body;
    const { data, error } = await supabase.from('subjects').update({ name, type: subjectType }).eq('id', id).select().single();
    if (error) return res.status(500).json({ error: 'Failed to update subject.' });
    return res.status(200).json(data);
  }

  if (req.method === 'DELETE') {
    const { type, id } = req.body || {};
    if (!id) return res.status(400).json({ error: 'ID required.' });

    if (type === 'syllabus') {
      const { error } = await supabase.from('syllabus').delete().eq('id', id);
      if (error) return res.status(500).json({ error: 'Failed to delete syllabus.' });
      return res.status(200).json({ message: 'Syllabus deleted.' });
    }

    // Default: delete subject
    const { error } = await supabase.from('subjects').delete().eq('id', id);
    if (error) return res.status(500).json({ error: 'Failed to delete subject.' });
    return res.status(200).json({ message: 'Subject deleted.' });
  }

  return res.status(405).json({ error: 'Method not allowed' });
};
