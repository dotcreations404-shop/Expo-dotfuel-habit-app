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
  
  console.log('Fetching PostgREST OpenAPI schema using anon key...');
  try {
    const res = await fetch(`${url}/rest/v1/`, {
      headers: {
        'apikey': anonKey,
        'Accept': 'application/openapi+json'
      }
    });
    console.log('Status:', res.status);
    const data = await res.json();
    console.log('Keys in schema:', Object.keys(data));
    const paths = data.paths || {};
    console.log('Paths:', Object.keys(paths).filter(p => p.includes('vol3') || p.includes('chat')));
    if (data.definitions) {
      console.log('Definitions:', Object.keys(data.definitions).filter(d => d.includes('vol3') || d.includes('chat')));
      if (data.definitions.challenge_vol3_chat) {
        console.log('\nchallenge_vol3_chat columns:', Object.keys(data.definitions.challenge_vol3_chat.properties));
      }
      if (data.definitions.challenge_vol3_participants) {
        console.log('\nchallenge_vol3_participants columns:', Object.keys(data.definitions.challenge_vol3_participants.properties));
      }
    }
  } catch (err) {
    console.error('Fetch error:', err);
  }
}

run();
