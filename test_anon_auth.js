const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://xljamnukzgystdthzgud.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhsamFtbnVremd5c3RkdGh6Z3VkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM5MTkwODUsImV4cCI6MjA4OTQ5NTA4NX0.lpGkMe7XvOEcSSuKh229X5AbBeho0w-vpZwPdNwk1CE';

const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function run() {
  console.log('Trying anonymous sign in...');
  const { data, error } = await sb.auth.signInAnonymously();
  if (error) {
    console.error('❌ Anonymous sign in failed:', error.message);
    return;
  }
  console.log('✅ Signed in anonymously! User ID:', data.user.id);
  
  // Now let's test different fuel modes
  const modes = ['cut', 'burn', 'lean', 'build', 'balance', 'clean', 'perform', 'reset'];
  for (const mode of modes) {
    const { error: profileError } = await sb.from('profiles').insert({
      id: data.user.id,
      name: 'Test',
      fuel_mode: mode
    });
    console.log(`Mode "${mode}" insert error:`, profileError ? profileError.message : 'SUCCESS');
  }
}

run();
