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
  
  console.log('Fetching profiles...');
  const { data: profiles, error: err1 } = await sb.from('profiles').select('*').limit(5);
  if (err1) {
    console.error('Profiles err:', err1);
  } else {
    console.log('Profiles:', profiles);
  }

  console.log('Fetching users...');
  const { data: users, error: err2 } = await sb.from('users').select('*').limit(5);
  if (err2) {
    console.error('Users err:', err2);
  } else {
    console.log('Users:', users);
  }
}

run();
