import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-admin-key',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
  const ADMIN_SECRET_KEY = Deno.env.get('ADMIN_SECRET_KEY') || '';

  if (!SUPABASE_SERVICE_ROLE_KEY) {
    return new Response(JSON.stringify({ error: 'SUPABASE_SERVICE_ROLE_KEY not configured' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // Verify Admin credentials (x-admin-key or Authorization Bearer token)
  let isAdmin = false;
  const adminKey = req.headers.get('x-admin-key');
  let authDebug = '';
  
  if (adminKey && ADMIN_SECRET_KEY && adminKey === ADMIN_SECRET_KEY) {
    isAdmin = true;
    authDebug = 'admin-key match';
  } else {
    const authHeader = req.headers.get('authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      try {
        const { data: { user }, error: authErr } = await supabase.auth.getUser(token);
        if (authErr) {
          authDebug = `auth error: ${authErr.message}`;
          console.warn('supabase.auth.getUser error:', authErr.message);
        } else if (!user) {
          authDebug = 'no user found for token';
        } else {
          authDebug = `user email: ${user.email}`;
          if (user.email === 'dotcreations404@gmail.com') {
            isAdmin = true;
          }
        }
      } catch (err: any) {
        authDebug = `auth exception: ${err.message}`;
        console.warn('Auth token verification exception:', err);
      }
    } else {
      authDebug = 'no bearer token in authorization header';
    }
  }

  if (!isAdmin) {
    return new Response(JSON.stringify({ 
      error: 'Forbidden', 
      debug: authDebug,
      hasAdminKey: !!adminKey,
      hasAdminSecret: !!ADMIN_SECRET_KEY
    }), {
      status: 403,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  let body;
  try {
    body = await req.json();
  } catch (e) {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const { userId, user_id, audience, title, message } = body;
  const targetUserId = userId || user_id;

  try {
    let tokens = [];

    if (targetUserId) {
      // Send to single user
      const { data: userRow, error: uErr } = await supabase
        .from('users')
        .select('push_token')
        .eq('id', targetUserId)
        .maybeSingle();

      if (uErr) throw uErr;
      if (userRow && userRow.push_token) {
        tokens.push(userRow.push_token);
      } else {
        return new Response(JSON.stringify({ error: 'User does not have a push token registered' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    } else if (audience === 'all_vol3_active') {
      // Get active Vol 3 participants
      const { data: participants, error: pErr } = await supabase
        .from('challenge_vol3_participants')
        .select('user_id')
        .eq('status', 'active');
      
      if (pErr) throw pErr;
      if (participants && participants.length > 0) {
        const ids = participants.map(p => p.user_id);
        const { data: users, error: uErr } = await supabase
          .from('users')
          .select('push_token')
          .in('id', ids)
          .not('push_token', 'is', null);
        
        if (uErr) throw uErr;
        if (users) {
          tokens = users.map(u => u.push_token).filter(Boolean);
        }
      }
    } else {
      // Default: send to all users who have push token
      const { data: users, error: uErr } = await supabase
        .from('users')
        .select('push_token')
        .not('push_token', 'is', null);

      if (uErr) throw uErr;
      if (users) {
        tokens = users.map(u => u.push_token).filter(Boolean);
      }
    }

    if (tokens.length === 0) {
      return new Response(JSON.stringify({ success: true, message: 'No registered push tokens found for audience' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const messages = tokens.map(token => ({
      to: token,
      sound: 'default',
      title: title || 'DotFuel 🟢',
      body: message || '',
      data: { screen: 'Challenges' },
    }));

    // Send in chunks of 100 (Expo limit is 100 messages per request)
    const chunkSize = 100;
    const results = [];

    for (let i = 0; i < messages.length; i += chunkSize) {
      const chunk = messages.slice(i, i + chunkSize);
      const expoResponse = await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Accept-encoding': 'gzip, deflate',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(chunk),
      });

      const result = await expoResponse.json();
      results.push(result);
    }

    return new Response(JSON.stringify({ success: true, count: tokens.length, results }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    console.error('send-push error:', err.message);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
