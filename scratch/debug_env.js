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
console.log('URL:', env.EXPO_PUBLIC_SUPABASE_URL);
console.log('ANON_KEY length:', env.EXPO_PUBLIC_SUPABASE_ANON_KEY?.length);
console.log('ANON_KEY characters:', env.EXPO_PUBLIC_SUPABASE_ANON_KEY ? (env.EXPO_PUBLIC_SUPABASE_ANON_KEY.substring(0, 10) + '...' + env.EXPO_PUBLIC_SUPABASE_ANON_KEY.slice(-10)) : 'N/A');
console.log('SERVICE_KEY length:', env.SUPABASE_SERVICE_KEY?.length);
console.log('SERVICE_KEY characters:', env.SUPABASE_SERVICE_KEY ? (env.SUPABASE_SERVICE_KEY.substring(0, 10) + '...' + env.SUPABASE_SERVICE_KEY.slice(-10)) : 'N/A');
