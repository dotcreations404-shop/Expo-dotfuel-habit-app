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
  
  if (adminKey && adminKey === ADMIN_SECRET_KEY) {
    isAdmin = true;
  } else {
    const authHeader = req.headers.get('authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      try {
        const { data: { user }, error: authErr } = await supabase.auth.getUser(token);
        if (!authErr && user && user.email === 'dotcreations404@gmail.com') {
          isAdmin = true;
        }
      } catch (err) {
        console.warn('Auth token verification exception:', err);
      }
    }
  }

  if (!isAdmin) {
    return new Response(JSON.stringify({ error: 'Forbidden' }), {
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

  const { userId } = body;
  if (!userId) {
    return new Response(JSON.stringify({ error: 'userId required' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    // 1. Fetch all progress rows for the user
    const { data: progressRows, error: progErr } = await supabase
      .from('challenge_vol3_daily_progress')
      .select('log_date, is_calculated_success, revival_applied, clean_meals, workout, read_page, water_synced_override, custom_task_done')
      .eq('user_id', userId);
      
    if (progErr) throw progErr;
    
    // 2. Compute the streak count
    let streakCount = 0;
    const todayStr = new Date().toISOString().split('T')[0];
    
    if (progressRows && progressRows.length > 0) {
      progressRows.forEach(r => {
        if (r.log_date > todayStr) return;
        
        let complianceCount = 0;
        if (r.clean_meals) complianceCount++;
        if (r.workout) complianceCount++;
        if (r.read_page) complianceCount++;
        if (r.water_synced_override) complianceCount++;
        if (r.custom_task_done) complianceCount++;
        
        const isCompleted = complianceCount >= 4 || r.is_calculated_success || r.revival_applied;
        if (isCompleted) {
          streakCount++;
        }
      });
    }
    
    // 3. Update users and profiles tables
    const [updateUserRes, updateProfileRes] = await Promise.all([
      supabase.from('users').update({ streak_days: streakCount }).eq('id', userId),
      supabase.from('profiles').update({ streak_days: streakCount }).eq('id', userId),
    ]);
      
    if (updateUserRes.error) throw updateUserRes.error;
    if (updateProfileRes.error) throw updateProfileRes.error;

    return new Response(JSON.stringify({ success: true, streak_days: streakCount }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    console.error('sync-user error:', err.message);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
