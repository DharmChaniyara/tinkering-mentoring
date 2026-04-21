// api/get_units.js — Get syllabus units for a subject
const { supabase } = require('../lib/supabase');
const { handleCors } = require('../lib/auth');

module.exports = async function handler(req, res) {
  if (handleCors(req, res)) return;
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const { subject_id } = req.query;
  if (!subject_id) return res.status(200).json([]);

  const { data, error } = await supabase
    .from('units')
    .select('unit_number, unit_name')
    .eq('subject_id', parseInt(subject_id))
    .order('unit_number', { ascending: true });

  if (error) return res.status(500).json({ error: 'Failed to fetch units.' });

  return res.status(200).json(data || []);
};
