import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

serve(async (req) => {
  try {
    // 1. Get today's date string (YYYY-MM-DD)
    const today = new Date().toISOString().split('T')[0];

    // 2. Find users who have a push_token
    const { data: users, error: userError } = await supabase
      .from('users')
      .select('id, push_token')
      .not('push_token', 'is', null);

    if (userError) throw userError;

    const messages = [];

    // 3. Check if they have a daily_log for today
    for (const user of users) {
      if (!user.push_token) continue;

      const { data: logs } = await supabase
        .from('daily_logs')
        .select('id')
        .eq('user_id', user.id)
        .eq('date', today);

      if (!logs || logs.length === 0) {
        // User hasn't logged today. Add to push queue.
        messages.push({
          to: user.push_token,
          sound: 'default',
          title: 'DotFuel 🔥',
          body: 'Keep your streak alive! Log your meals today.',
          data: { screen: 'Log' },
        });
      }
    }

    if (messages.length === 0) {
      return new Response(JSON.stringify({ message: 'No notifications to send' }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // 4. Send to Expo Push API
    const expoResponse = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Accept-encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(messages),
    });

    const expoResult = await expoResponse.json();

    return new Response(JSON.stringify({ success: true, result: expoResult }), {
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});
