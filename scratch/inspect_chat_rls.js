const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://xljamnukzgystdthzgud.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhsamFtbnVremd5c3RkdGh6Z3VkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM5MTkwODUsImV4cCI6MjA4OTQ5NTA4NX0.lpGkMe7XvOEcSSuKh229X5AbBeho0w-vpZwPdNwk1CE';

const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function run() {
  console.log('Signing in anonymously...');
  const { data, error } = await sb.auth.signInAnonymously();
  if (error) {
    console.error('❌ Sign in failed:', error.message);
    return;
  }
  const userId = data.user.id;
  console.log('✅ User ID:', userId);

  // Join challenge
  console.log('Attempting to join challenge...');
  const { error: joinError } = await sb
    .from('challenge_vol3_participants')
    .insert({
      user_id: userId,
      cut_list: ['Sugar'],
      revivals_remaining: 2,
      status: 'active'
    });
  if (joinError) {
    console.log('Join error:', joinError.message);
  } else {
    console.log('✅ Joined challenge successfully!');
  }

  // Insert chat message
  console.log('Attempting to send chat message...');
  const { error: chatError } = await sb
    .from('challenge_vol3_chat')
    .insert({
      user_id: userId,
      message: 'Hello, this is a test message from RLS inspector!',
      profile_name: 'Test Challenger',
      image_url: null
    });

  if (chatError) {
    console.error('❌ Chat insert failed:', chatError.message);
  } else {
    console.log('✅ Chat message sent successfully!');
  }
}

run();
