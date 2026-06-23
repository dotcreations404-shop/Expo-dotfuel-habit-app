import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

const setCorsHeaders = (res: VercelResponse) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCorsHeaders(res);
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing auth token' });
  }
  const token = authHeader.replace('Bearer ', '');

  const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://xljamnukzgystdthzgud.supabase.co';
  const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
  const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

  if (!SUPABASE_SERVICE_KEY) {
    return res.status(500).json({ error: 'Server misconfigured' });
  }

  // Verify the user token
  const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data: { user }, error: userErr } = await userClient.auth.getUser(token);
  if (userErr || !user) {
    return res.status(401).json({ error: 'Invalid token' });
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

    return res.status(200).json({ success: true });
  } catch (err: any) {
    console.error('delete-account error:', err.message);
    return res.status(500).json({ error: err.message });
  }
}
