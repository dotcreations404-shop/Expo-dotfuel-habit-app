import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://xljamnukzgystdthzgud.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhsamFtbnVremd5c3RkdGh6Z3VkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM5MTkwODUsImV4cCI6MjA4OTQ5NTA4NX0.lpGkMe7XvOEcSSuKh229X5AbBeho0w-vpZwPdNwk1CE';

const sb = createClient(SUPABASE_URL, SUPABASE_KEY);

async function check() {
  console.log('Checking remote Supabase database...');
  try {
    const { data: participants, error: pErr } = await sb
      .from('challenge_vol3_participants')
      .select('count')
      .limit(1);

    if (pErr) {
      console.log('❌ challenge_vol3_participants error:', pErr.message);
    } else {
      console.log('✅ challenge_vol3_participants exists!');
    }

    const { data: chat, error: cErr } = await sb
      .from('challenge_vol3_chat')
      .select('count')
      .limit(1);

    if (cErr) {
      console.log('❌ challenge_vol3_chat error:', cErr.message);
    } else {
      console.log('✅ challenge_vol3_chat exists!');
    }
  } catch (err) {
    console.error('Unexpected error:', err.message);
  }
}

check();
