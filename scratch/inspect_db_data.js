const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://xljamnukzgystdthzgud.supabase.co';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhsamFtbnVremd5c3RkdGh6Z3VkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM5MTkwODUsImV4cCI6MjA4OTQ5NTA4NX0.lpGkMe7XvOEcSSuKh229X5AbBeho0w-vpZwPdNwk1CE';

const sb = createClient(SUPABASE_URL, ANON_KEY);

async function inspect() {
  console.log('Fetching participants...');
  const { data: parts, error: pErr } = await sb.from('challenge_vol3_participants').select('*');
  if (pErr) console.error('parts error:', pErr.message);
  else console.log('participants:', parts);

  console.log('Fetching users...');
  const { data: users, error: uErr } = await sb.from('users').select('*');
  if (uErr) console.error('users error:', uErr.message);
  else console.log('users:', users);

  console.log('Fetching profiles...');
  const { data: profiles, error: prErr } = await sb.from('profiles').select('*');
  if (prErr) console.error('profiles error:', prErr.message);
  else console.log('profiles:', profiles);
}

inspect();
