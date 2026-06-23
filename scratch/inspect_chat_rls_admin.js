const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://xljamnukzgystdthzgud.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhsamFtbnVremd5c3RkdGh6Z3VkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzkxOTA4NSwiZXhwIjoyMDg5NDk1MDg1fQ.aK6R2eN_x81Ncpj96c9t512df8e98b7ce2b512e987c';

// Client with service key to admin tasks
const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

// Client with anon key for normal user operations
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhsamFtbnVremd5c3RkdGh6Z3VkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM5MTkwODUsImV4cCI6MjA4OTQ5NTA4NX0.lpGkMe7XvOEcSSuKh229X5AbBeho0w-vpZwPdNwk1CE';
const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function run() {
  const email = `test_chat_${Date.now()}@example.com`;
  const password = 'TestPassword123!';
  let userId;

  try {
    console.log('Creating test user...');
    const { data: userData, error: createError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true
    });

    if (createError) {
      console.error('❌ Failed to create user:', createError.message);
      return;
    }
    userId = userData.user.id;
    console.log('✅ Created user:', userId);

    console.log('Logging in as test user...');
    const { data: authData, error: loginError } = await userClient.auth.signInWithPassword({
      email,
      password
    });

    if (loginError) {
      console.error('❌ Login failed:', loginError.message);
      return;
    }
    console.log('✅ Logged in successfully!');

    // First let's check if they can join the challenge
    console.log('Joining challenge...');
    const { error: joinError } = await userClient
      .from('challenge_vol3_participants')
      .insert({
        user_id: userId,
        cut_list: ['Sugar'],
        revivals_remaining: 2,
        status: 'active'
      });
    if (joinError) {
      console.log('❌ Join error:', joinError.message);
    } else {
      console.log('✅ Joined challenge successfully!');
    }

    // Attempt to insert chat message
    console.log('Attempting to send chat message...');
    const { error: chatError } = await userClient
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

  } catch (err) {
    console.error('Unexpected error:', err);
  } finally {
    if (userId) {
      console.log('Cleaning up user...');
      const { error: deleteError } = await adminClient.auth.admin.deleteUser(userId);
      if (deleteError) {
        console.error('❌ Cleanup failed:', deleteError.message);
      } else {
        console.log('✅ Cleanup successful.');
      }
    }
  }
}

run();
