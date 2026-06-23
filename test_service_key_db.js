const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://xljamnukzgystdthzgud.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhsamFtbnVremd5c3RkdGh6Z3VkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzkxOTA4NSwiZXhwIjoyMDg5NDk1MDg1fQ.aK6R2eN_x81Ncpj96c9t512df8e98b7ce2b512e987c';

const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function run() {
  console.log('Fetching profiles using service key...');
  const { data, error } = await sb.from('profiles').select('*').limit(5);
  if (error) {
    console.error('❌ Service key failed:', error.message);
  } else {
    console.log('✅ Service key works! Profiles:', data);
  }
}

run();
