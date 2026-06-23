const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

function loadEnv() {
  const envContent = fs.readFileSync('/Users/doran/app-dotfuel-shop/.env', 'utf8');
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

async function run() {
  const env = loadEnv();
  const url = env.EXPO_PUBLIC_SUPABASE_URL;
  const anonKey = env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
  
  const sb = createClient(url, anonKey);
  
  const email = `test_chat_1782186141209@gmail.com`;
  const password = 'Password123!';
  
  console.log('Signing in user:', email);
  const { data: authData, error: authError } = await sb.auth.signInWithPassword({
    email,
    password
  });
  
  if (authError) {
    console.error('Sign in error:', authError);
    return;
  }
  
  const user = authData.user;
  console.log('Logged in as user:', user.id);

  console.log('Inserting into profiles...');
  const { error: profileError } = await sb.from('profiles').insert({
    id: user.id,
    name: 'Test Chat User',
    fuel_mode: 'balance',
    calorie_target: 2000
  });
  if (profileError) {
    console.error('Profiles insert failed:', profileError.message);
  } else {
    console.log('Profiles insert success!');
  }

  console.log('Inserting into users...');
  const { error: usersError } = await sb.from('users').insert({
    id: user.id,
    name: 'Test Chat User',
    fuel_mode: 'balance',
    streak_days: 5
  });
  if (usersError) {
    console.error('Users insert failed:', usersError.message);
  } else {
    console.log('Users insert success!');
  }

  console.log('Inserting to challenge_vol3_participants...');
  const { data: partData, error: partError } = await sb.from('challenge_vol3_participants').insert({
    user_id: user.id,
    cut_list: ['Sugar'],
    revivals_remaining: 2,
    status: 'active'
  }).select();

  if (partError) {
    console.error('Participant insert failed:', partError);
    return;
  }
  console.log('Participant insert success:', partData);
  
  console.log('Testing insert to challenge_vol3_chat...');
  const { data, error } = await sb.from('challenge_vol3_chat').insert({
    user_id: user.id,
    message: 'Test message from script',
    profile_name: 'Tester'
  }).select();
  
  if (error) {
    console.error('Insert failed:', error);
  } else {
    console.log('Insert success:', data);
  }
}

run();
