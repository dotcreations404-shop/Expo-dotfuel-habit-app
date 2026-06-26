const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

function loadEnv() {
  const envContent = fs.readFileSync('/Users/doran/app-dotfuel-shop/apps/mobile/.env', 'utf8');
  const env = {};
  envContent.split('\n').forEach(line => {
    const cleanLine = line.trim();
    if (cleanLine && !cleanLine.startsWith('#')) {
      const parts = cleanLine.split('=');
      const key = parts[0].trim();
      let value = parts.slice(1).join('=').trim();
      if (value.startsWith('"') && value.endsWith('"')) {
        value = value.slice(1, -1);
      }
      if (value.startsWith("'") && value.endsWith("'")) {
        value = value.slice(1, -1);
      }
      env[key] = value;
    }
  });
  return env;
}

const env = loadEnv();
const SUPABASE_URL = env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function run() {
  console.log('Signing in anonymously...');
  const { data: authData, error: authErr } = await sb.auth.signInAnonymously();
  if (authErr) {
    console.error('❌ Sign in failed:', authErr.message);
    return;
  }
  console.log('✅ Signed in! User ID:', authData.user.id);

  console.log('Fetching participants...');
  const { data: parts, error: partsErr } = await sb.from('challenge_vol3_participants').select('user_id').eq('status', 'active');
  if (partsErr) {
    console.error('❌ Participants fetch error:', partsErr.message);
    return;
  }
  console.log(`Fetched ${parts.length} active participants.`);
  if (parts.length === 0) return;

  const ids = parts.map(p => p.user_id);
  console.log('IDs:', ids);

  console.log('Querying users...');
  const { data: users, error: usersErr } = await sb.from('users').select('id, name').in('id', ids);
  if (usersErr) {
    console.error('❌ Users fetch error:', usersErr.message);
  } else {
    console.log(`Fetched ${users.length} users:`, users);
  }

  console.log('Querying profiles...');
  const { data: profiles, error: profilesErr } = await sb.from('profiles').select('id, name').in('id', ids);
  if (profilesErr) {
    console.error('❌ Profiles fetch error:', profilesErr.message);
  } else {
    console.log(`Fetched ${profiles.length} profiles:`, profiles);
  }

  console.log('Querying daily progress...');
  const { data: progress, error: progErr } = await sb.from('challenge_vol3_daily_progress')
    .select('user_id, log_date, is_calculated_success, revival_applied, clean_meals, workout, read_page, water_synced_override, custom_task_done')
    .in('user_id', ids);
  if (progErr) {
    console.error('❌ Daily progress fetch error:', progErr.message);
  } else {
    console.log(`Fetched ${progress.length} progress rows.`);
    const countMap = {};
    progress.forEach(p => {
      countMap[p.user_id] = (countMap[p.user_id] || 0) + 1;
    });
    console.log('Progress rows count per user:', countMap);
  }
}

run();
