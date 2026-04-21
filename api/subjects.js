// api/subjects.js — Get all subjects + stats
const { supabase } = require('../backend/lib/supabase');
const { handleCors } = require('../backend/lib/auth');

module.exports = async function handler(req, res) {
  if (handleCors(req, res)) return;
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const { data: subjects, error } = await supabase
    .from('subjects')
    .select('*')
    .order('type', { ascending: true })
    .order('name', { ascending: true });

  if (error) return res.status(500).json({ error: 'Failed to fetch subjects.' });

  // Fetch stats
  const [{ count: totalNotes }, { count: totalUsers }] = await Promise.all([
    supabase.from('notes').select('*', { count: 'exact', head: true }),
    supabase.from('users').select('*', { count: 'exact', head: true }),
  ]);

  return res.status(200).json({
    subjects,
    stats: {
      total_notes: totalNotes || 0,
      total_users: totalUsers || 0,
      total_subjects: subjects.length,
    },
  });
};
