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
  console.log('Fetching active participants with anon key...');
  const { data: parts, error: partsErr } = await sb.from('challenge_vol3_participants').select('*').eq('status', 'active');
  if (partsErr) {
    console.error('Error fetching participants:', partsErr.message);
    return;
  }
  console.log(`Active participants count: ${parts.length}`);

  const ids = parts.map(p => p.user_id);

  console.log('Fetching profiles...');
  const { data: profiles, error: profErr } = await sb.from('profiles').select('*').in('id', ids);
  if (profErr) {
    console.error('Error fetching profiles:', profErr.message);
  }

  console.log('Fetching users...');
  const { data: users, error: usersErr } = await sb.from('users').select('*').in('id', ids);
  if (usersErr) {
    console.error('Error fetching users:', usersErr.message);
  }

  console.log('Fetching challenge_vol3_daily_progress...');
  const { data: progress, error: progErr } = await sb.from('challenge_vol3_daily_progress').select('*').in('user_id', ids);
  if (progErr) {
    console.error('Error fetching daily progress:', progErr.message);
    return;
  }

  console.log('\n--- CALCULATING STREAKS ---');
  ids.forEach(id => {
    const prof = profiles?.find(p => p.id === id);
    const userRow = users?.find(u => u.id === id);
    const name = prof?.name || userRow?.name || 'Unknown';
    const email = userRow?.email || prof?.email || 'N/A';
    const userProg = progress.filter(p => p.user_id === id);

    let completedDays = 0;
    userProg.forEach(r => {
      let complianceCount = 0;
      if (r.clean_meals) complianceCount++;
      if (r.workout) complianceCount++;
      if (r.read_page) complianceCount++;
      if (r.water_synced_override) complianceCount++;
      if (r.custom_task_done) complianceCount++;
      const isCompleted = complianceCount >= 4 || r.is_calculated_success || r.revival_applied;
      if (isCompleted) {
        completedDays++;
      }
    });

    console.log(`User: ${name} (${email}) | ID: ${id}`);
    console.log(`  - Profile Streak (in profiles): ${prof?.streak_days}`);
    console.log(`  - User Streak (in users): ${userRow?.streak_days}`);
    console.log(`  - Daily Progress Rows: ${userProg.length}`);
    console.log(`  - Calculated Completed Days: ${completedDays}`);
  });
}

run();
