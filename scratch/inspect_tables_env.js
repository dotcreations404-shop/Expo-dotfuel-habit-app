const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

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
  const serviceKey = env.SUPABASE_SERVICE_KEY;

  console.log('SUPABASE_URL:', url);

  const client = createClient(url, serviceKey);
  console.log('Fetching profiles using SERVICE_KEY...');
  const { data: profiles, error } = await client.from('profiles').select('*').limit(3);
  if (error) {
    console.error('Service key failed:', error.message);
  } else {
    console.log('Profiles:', profiles);
  }

  console.log('Fetching users using SERVICE_KEY...');
  const { data: users, error: uErr } = await client.from('users').select('*').limit(3);
  if (uErr) {
    console.error('Users failed:', uErr.message);
  } else {
    console.log('Users:', users);
  }

  console.log('Fetching participants...');
  const { data: parts, error: pErr } = await client.from('challenge_vol3_participants').select('*');
  if (pErr) console.error('Participants failed:', pErr.message);
  else console.log('Participants:', parts);
}

run();
