const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://xljamnukzgystdthzgud.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhsamFtbnVremd5c3RkdGh6Z3VkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzkxOTA4NSwiZXhwIjoyMDg5NDk1MDg1fQ.aK6R2eN_x81Ncpj96c9t512df8e98b7ce2b512e987c';

const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function inspect() {
  console.log('--- USERS TABLE SAMPLE ---');
  const { data: users, error: uErr } = await sb.from('users').select('*').limit(3);
  if (uErr) console.error('users error:', uErr.message);
  else console.log(users);

  console.log('--- PROFILES TABLE SAMPLE ---');
  const { data: profiles, error: pErr } = await sb.from('profiles').select('*').limit(3);
  if (pErr) console.error('profiles error:', pErr.message);
  else console.log(profiles);

  console.log('--- PARTICIPANTS TABLE SAMPLE ---');
  const { data: parts, error: partErr } = await sb.from('challenge_vol3_participants').select('*');
  if (partErr) console.error('participants error:', partErr.message);
  else console.log(parts);
}

inspect();
