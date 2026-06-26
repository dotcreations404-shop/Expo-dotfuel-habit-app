const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '../.env');
const envContent = fs.readFileSync(envPath, 'utf8');

const getEnvVar = (name) => {
  const match = envContent.match(new RegExp(`${name}=(?:"([^"]+)"|([^\\s\r\n]+))`));
  return match ? (match[1] || match[2]) : null;
};

const url = getEnvVar('EXPO_PUBLIC_SUPABASE_URL');
const serviceKey = getEnvVar('SUPABASE_SERVICE_KEY');

console.log('Using Supabase URL:', url);
console.log('Using Service Key (first 15 chars):', serviceKey ? serviceKey.substring(0, 15) + '...' : 'null');

const supabase = createClient(url, serviceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function run() {
  try {
    console.log('1. Fetching active Vol 3 participants...');
    const { data: participants, error: pErr } = await supabase
      .from('challenge_vol3_participants')
      .select('user_id')
      .eq('status', 'active');
      
    if (pErr) throw pErr;
    console.log(`Found ${participants?.length || 0} active participants:`, participants);

    if (participants && participants.length > 0) {
      const ids = participants.map(p => p.user_id);
      console.log('2. Fetching push tokens for active participant IDs...');
      const { data: users, error: uErr } = await supabase
        .from('users')
        .select('id, push_token')
        .in('id', ids);
        
      if (uErr) throw uErr;
      console.log(`Found ${users?.length || 0} users in query:`, users);
      
      const tokens = users.map(u => u.push_token).filter(Boolean);
      console.log('Push tokens:', tokens);
    }

    console.log('3. Fetching all push tokens...');
    const { data: allUsers, error: auErr } = await supabase
      .from('users')
      .select('id, push_token')
      .not('push_token', 'is', null);
      
    if (auErr) throw auErr;
    console.log(`Found ${allUsers?.length || 0} users with push tokens:`, allUsers);

  } catch (err) {
    console.error('❌ Error executing query:', err);
  }
}

run();
