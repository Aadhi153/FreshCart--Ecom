const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
dotenv.config();

const supabaseUrl  = process.env.SUPABASE_URL;
const serviceKey   = process.env.SUPABASE_SERVICE_ROLE_KEY;
const anonKey      = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || (!serviceKey && !anonKey)) {
  console.warn('⚠️  SUPABASE_URL or keys not set in .env — check your environment.');
}

// Admin client uses service role key (bypasses RLS) — for server-only use
const supabaseAdmin = createClient(supabaseUrl, serviceKey || anonKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// Public client uses anon key (respects RLS) — for user-scoped queries
const supabase = createClient(supabaseUrl, anonKey || serviceKey);

module.exports = { supabase, supabaseAdmin };
