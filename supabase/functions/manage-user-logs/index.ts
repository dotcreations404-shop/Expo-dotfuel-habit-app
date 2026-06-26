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

  // Verify Admin credentials
  let isAdmin = false;
  const adminKey = req.headers.get('x-admin-key');
  
  if (adminKey && ADMIN_SECRET_KEY && adminKey === ADMIN_SECRET_KEY) {
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

  let body;
  try {
    body = await req.json();
  } catch (e) {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const { action, userId, date, data } = body;

  if (!isAdmin) {
    return new Response(JSON.stringify({ error: 'Forbidden' }), {
      status: 403,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  if (!userId || !date) {
    return new Response(JSON.stringify({ error: 'userId and date are required' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {

    if (action === 'get') {
      // 1. Fetch daily_logs row
      const { data: dailyLog, error: dlErr } = await supabase
        .from('daily_logs')
        .select('*')
        .eq('user_id', userId)
        .eq('date', date)
        .maybeSingle();

      if (dlErr) throw dlErr;

      // 2. Fetch challenge progress row
      const { data: challengeProgress, error: cpErr } = await supabase
        .from('challenge_vol3_daily_progress')
        .select('*')
        .eq('user_id', userId)
        .eq('log_date', date)
        .maybeSingle();

      if (cpErr) throw cpErr;

      return new Response(JSON.stringify({
        success: true,
        dailyLog: dailyLog || null,
        challengeProgress: challengeProgress || null
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });

    } else if (action === 'update') {
      if (!data) {
        return new Response(JSON.stringify({ error: 'data payload is required for update' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // --- 1. UPSERT daily_logs ---
      const { data: existingDl, error: findDlErr } = await supabase
        .from('daily_logs')
        .select('id')
        .eq('user_id', userId)
        .eq('date', date)
        .maybeSingle();

      if (findDlErr) throw findDlErr;

      const dlPayload = {
        user_id: userId,
        date: date,
        total_calories: data.calories !== undefined ? Number(data.calories) : null,
        steps_count: data.steps !== undefined ? Number(data.steps) : null,
        total_protein: data.protein !== undefined ? Number(data.protein) : null,
        total_carbs: data.carbs !== undefined ? Number(data.carbs) : null,
        total_fat: data.fat !== undefined ? Number(data.fat) : null,
        water_ml: data.water !== undefined ? Number(data.water) : null,
        fuel_score: data.score !== undefined ? Number(data.score) : null,
        fuel_coach_tip: data.tip !== undefined ? String(data.tip) : null,
      };

      if (existingDl) {
        const { error: updateDlErr } = await supabase
          .from('daily_logs')
          .update(dlPayload)
          .eq('id', existingDl.id);
        if (updateDlErr) throw updateDlErr;
      } else {
        const { error: insertDlErr } = await supabase
          .from('daily_logs')
          .insert(dlPayload);
        if (insertDlErr) throw insertDlErr;
      }

      // --- 2. UPSERT challenge_vol3_daily_progress ---
      const { data: existingCp, error: findCpErr } = await supabase
        .from('challenge_vol3_daily_progress')
        .select('id')
        .eq('user_id', userId)
        .eq('log_date', date)
        .maybeSingle();

      if (findCpErr) throw findCpErr;

      const cpPayload = {
        user_id: userId,
        log_date: date,
        clean_meals: !!data.clean_meals,
        workout: !!data.workout,
        read_page: !!data.read_page,
        water_synced_override: !!data.water_synced,
        custom_task_done: !!data.custom_task,
        revival_applied: !!data.revival_applied,
        is_calculated_success: !!data.calculated_success,
      };

      if (existingCp) {
        const { error: updateCpErr } = await supabase
          .from('challenge_vol3_daily_progress')
          .update(cpPayload)
          .eq('id', existingCp.id);
        if (updateCpErr) throw updateCpErr;
      } else {
        const { error: insertCpErr } = await supabase
          .from('challenge_vol3_daily_progress')
          .insert(cpPayload);
        if (insertCpErr) throw insertCpErr;
      }

      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });

    } else {
      return new Response(JSON.stringify({ error: 'Invalid action: must be get or update' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

  } catch (err: any) {
    console.error('manage-user-logs error:', err.message);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
