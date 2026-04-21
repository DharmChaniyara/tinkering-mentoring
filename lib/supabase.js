// lib/supabase.js
// Shared Supabase client for all Vercel serverless functions.
// Uses the SERVICE ROLE key — never expose this on the client.

const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

module.exports = { supabase };
