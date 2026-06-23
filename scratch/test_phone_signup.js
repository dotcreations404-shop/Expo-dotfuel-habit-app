const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://xljamnukzgystdthzgud.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhsamFtbnVremd5c3RkdGh6Z3VkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM5MTkwODUsImV4cCI6MjA4OTQ5NTA4NX0.lpGkMe7XvOEcSSuKh229X5AbBeho0w-vpZwPdNwk1CE';

const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function run() {
  const phone = `+1555555${Math.floor(1000 + Math.random() * 9000)}`;
  const password = 'Password123!';

  console.log('Trying phone signUp for:', phone);
  const { data, error } = await sb.auth.signUp({
    phone,
    password
  });

  if (error) {
    console.error('❌ Phone sign up failed:', error.message);
  } else {
    console.log('✅ Phone sign up success! Session:', data.session ? 'ACTIVE' : 'NULL');
  }
}

run();
