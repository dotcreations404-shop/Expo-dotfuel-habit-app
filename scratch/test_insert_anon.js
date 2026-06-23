const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://xljamnukzgystdthzgud.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhsamFtbnVremd5c3RkdGh6Z3VkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM5MTkwODUsImV4cCI6MjA4OTQ5NTA4NX0.lpGkMe7XvOEcSSuKh229X5AbBeho0w-vpZwPdNwk1CE';

const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function run() {
  console.log('Testing insert without auth...');
  const { data, error } = await sb.from('challenge_vol3_chat').insert({
    user_id: '99b57979-7d3a-4ca1-b532-97462ca951d8', // Some uuid
    message: 'Test message',
    profile_name: 'Test'
  });
  
  if (error) {
    console.error('❌ Insert failed:', error.code, error.message, error.details);
  } else {
    console.log('✅ Insert success:', data);
  }
}

run();
