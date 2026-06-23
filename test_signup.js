const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://xljamnukzgystdthzgud.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhsamFtbnVremd5c3RkdGh6Z3VkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM5MTkwODUsImV4cCI6MjA4OTQ5NTA4NX0.lpGkMe7XvOEcSSuKh229X5AbBeho0w-vpZwPdNwk1CE';

const sbAnon = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function run() {
  const email = `test_onboarding_${Date.now()}@gmail.com`;
  const password = 'Password123!';

  console.log('1. Trying to sign up test user with Anon key:', email);
  const res = await sbAnon.auth.signUp({
    email,
    password,
  });

  console.log('SignUp Result:', JSON.stringify(res, null, 2));
}

run();
