const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://xljamnukzgystdthzgud.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhsamFtbnVremd5c3RkdGh6Z3VkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM5MTkwODUsImV4cCI6MjA4OTQ5NTA4NX0.lpGkMe7XvOEcSSuKh229X5AbBeho0w-vpZwPdNwk1CE';

const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function run() {
  const email = `test_chat_${Date.now()}@gmail.com`;
  const password = 'Password123!';

  console.log('1. Signing up test user:', email);
  const signupRes = await sb.auth.signUp({ email, password });
  if (signupRes.error) {
    console.error('❌ Sign up failed:', signupRes.error.message);
    return;
  }
  const user = signupRes.data.user;
  console.log('✅ Signed up successfully. User ID:', user.id);

  // Sign in as that user
  console.log('2. Signing in...');
  const signinRes = await sb.auth.signInWithPassword({ email, password });
  if (signinRes.error) {
    console.error('❌ Sign in failed:', signinRes.error.message);
    return;
  }
  console.log('✅ Signed in successfully.');

  // Join the challenge
  console.log('3. Attempting to join challenge...');
  const joinRes = await sb
    .from('challenge_vol3_participants')
    .insert({
      user_id: user.id,
      cut_list: ['Sugar'],
      revivals_remaining: 2,
      status: 'active'
    });
  if (joinRes.error) {
    console.log('❌ Join error:', joinRes.error.message);
  } else {
    console.log('✅ Joined challenge successfully!');
  }

  // Insert chat message
  console.log('4. Attempting to send chat message...');
  const chatRes = await sb
    .from('challenge_vol3_chat')
    .insert({
      user_id: user.id,
      message: 'Hello, this is a test message from chat insert test script!',
      profile_name: 'Test Challenger',
      image_url: null
    });

  if (chatRes.error) {
    console.error('❌ Chat insert failed:', chatRes.error.message);
  } else {
    console.log('✅ Chat message sent successfully!');
  }
}

run();
