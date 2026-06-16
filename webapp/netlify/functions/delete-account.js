// Allows a user to delete their own account and all data
// Requires a valid Supabase JWT in the Authorization header
const { createClient } = require('@supabase/supabase-js');

exports.handler = async (event) => {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };

  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };

  const authHeader = event.headers['authorization'] || event.headers['Authorization'];
  if (!authHeader?.startsWith('Bearer ')) {
    return { statusCode: 401, headers, body: JSON.stringify({ error: 'Missing auth token' }) };
  }
  const token = authHeader.replace('Bearer ', '');

  const SUPABASE_URL         = process.env.SUPABASE_URL || 'https://xljamnukzgystdthzgud.supabase.co';
  const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
  const SUPABASE_ANON_KEY    = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhsamFtbnVremd5c3RkdGh6Z3VkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM5MTkwODUsImV4cCI6MjA4OTQ5NTA4NX0.lpGkMe7XvOEcSSuKh229X5AbBeho0w-vpZwPdNwk1CE';

  if (!SUPABASE_SERVICE_KEY) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Server misconfigured' }) };
  }

  // Verify the user token — use anon client to get user from their JWT
  const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { autoRefreshToken: false, persistSession: false }
  });
  const { data: { user }, error: userErr } = await userClient.auth.getUser(token);
  if (userErr || !user) {
    return { statusCode: 401, headers, body: JSON.stringify({ error: 'Invalid token' }) };
  }

  const userId = user.id;

  // Service role client to delete everything
  const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false }
  });

  try {
    // Delete all user data in dependency order
    await sb.from('meals').delete().eq('user_id', userId);
    await sb.from('daily_logs').delete().eq('user_id', userId);
    await sb.from('user_challenges').delete().eq('user_id', userId);
    await sb.from('activity_entries').delete().eq('user_id', userId);
    await sb.from('daily_challenge_completions').delete().eq('user_id', userId);
    await sb.from('custom_foods').delete().eq('user_id', userId);
    await sb.from('fuel_circles').delete().eq('creator_id', userId);
    await sb.from('feedback').delete().eq('user_id', userId);
    await sb.from('profiles').delete().eq('id', userId);
    await sb.from('users').delete().eq('id', userId);

    // Delete the auth account
    const { error: authErr } = await sb.auth.admin.deleteUser(userId);
    if (authErr) throw authErr;

    return { statusCode: 200, headers, body: JSON.stringify({ success: true }) };
  } catch (err) {
    console.error('delete-account error:', err.message);
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
  }
};
