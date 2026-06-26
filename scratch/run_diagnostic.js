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
const url = 'https://xljamnukzgystdthzgud.supabase.co/rest/v1';

async function queryTable(tableName, key, keyName) {
  try {
    const res = await fetch(`${url}/${tableName}?select=*&limit=5`, {
      headers: {
        'apikey': key,
        'Authorization': `Bearer ${key}`
      }
    });
    const status = res.status;
    let data;
    try {
      data = await res.json();
    } catch (e) {
      data = 'Non-JSON response';
    }
    console.log(`[${keyName}] Querying ${tableName} -> Status: ${status}`);
    if (status === 200) {
      console.log(`  Count: ${Array.isArray(data) ? data.length : 1}`);
      if (Array.isArray(data) && data.length > 0) {
        console.log(`  Keys:`, Object.keys(data[0]));
        console.log(`  Sample:`, data[0]);
      } else {
        console.log(`  Data:`, data);
      }
    } else {
      console.log(`  Error:`, data);
    }
  } catch (err) {
    console.error(`[${keyName}] Fetch error for ${tableName}:`, err.message);
  }
}

async function run() {
  const anonKey = env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
  const serviceKey = env.SUPABASE_SERVICE_KEY;

  console.log('--- TESTING WITH SERVICE KEY ---');
  await queryTable('challenge_vol3_participants', serviceKey, 'SERVICE');
  await queryTable('admin_user_view', serviceKey, 'SERVICE');
  await queryTable('users', serviceKey, 'SERVICE');
  await queryTable('profiles', serviceKey, 'SERVICE');
  await queryTable('challenge_vol3_daily_progress', serviceKey, 'SERVICE');

  console.log('\n--- TESTING WITH ANON KEY ---');
  await queryTable('challenge_vol3_participants', anonKey, 'ANON');
  await queryTable('admin_user_view', anonKey, 'ANON');
  await queryTable('users', anonKey, 'ANON');
  await queryTable('profiles', anonKey, 'ANON');
  await queryTable('challenge_vol3_daily_progress', anonKey, 'ANON');
}

run();
