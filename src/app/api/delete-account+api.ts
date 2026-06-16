/**
 * Delete Account API — removes all user data and auth account.
 * Replaces: webapp/netlify/functions/delete-account.js
 */
import { createClient } from '@supabase/supabase-js';

export function OPTIONS() {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}

export async function POST(request: Request) {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
  };

  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return Response.json({ error: 'Missing auth token' }, { status: 401, headers });
  }
  const token = authHeader.replace('Bearer ', '');

  const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://xljamnukzgystdthzgud.supabase.co';
  const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
  const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

  if (!SUPABASE_SERVICE_KEY) {
    return Response.json({ error: 'Server misconfigured' }, { status: 500, headers });
  }

  // Verify the user token
  const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data: { user }, error: userErr } = await userClient.auth.getUser(token);
  if (userErr || !user) {
    return Response.json({ error: 'Invalid token' }, { status: 401, headers });
  }

  const userId = user.id;

  // Service role client to delete everything
  const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
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

    return Response.json({ success: true }, { headers });
  } catch (err: any) {
    console.error('delete-account error:', err.message);
    return Response.json({ error: err.message }, { status: 500, headers });
  }
}
