// Streak reminder — triggered by Netlify scheduled function (cron)
// Sends push notifications to users who haven't logged today (in their timezone)
// Schedule: runs every hour, sends to users whose local time is 19:00-20:00

const { createClient } = require('@supabase/supabase-js');
const https = require('https');
const crypto = require('crypto');

// Minimal Web Push implementation without external library
async function sendWebPush(subscription, payload) {
  // For now: use a simple fetch to a push relay, or implement VAPID directly
  // This is a stub — in production use 'web-push' npm package
  // For DotFuel, we'll rely on Supabase edge functions or a relay
  console.log('Would send push to:', subscription.endpoint.slice(0, 50));
  return { ok: true };
}

exports.handler = async (event) => {
  const SUPABASE_URL     = 'https://xljamnukzgystdthzgud.supabase.co';
  const SUPABASE_SERVICE = process.env.SUPABASE_SERVICE_KEY;
  if (!SUPABASE_SERVICE) return { statusCode: 200, body: 'No service key' };

  const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE);
  const nowUTC = new Date();

  try {
    // Get all push subscribers
    const { data: subs } = await sb.from('push_subscriptions')
      .select('user_id, endpoint, p256dh, auth_key, timezone');

    if (!subs?.length) return { statusCode: 200, body: 'No subscribers' };

    let sent = 0;
    for (const sub of subs) {
      try {
        // Check local time for this user
        const localHour = new Date(nowUTC.toLocaleString('en-US', { timeZone: sub.timezone || 'Asia/Kolkata' })).getHours();

        // Send reminder between 7 PM and 8 PM local time
        if (localHour !== 19) continue;

        // Check if they've already logged today (in their timezone)
        const localDateStr = new Date(nowUTC.toLocaleString('en-US', { timeZone: sub.timezone || 'Asia/Kolkata' }))
          .toISOString().split('T')[0];

        const { data: todayLog } = await sb.from('daily_logs')
          .select('id, total_calories')
          .eq('user_id', sub.user_id)
          .eq('date', localDateStr)
          .maybeSingle();

        // Get user's streak
        const { data: u } = await sb.from('users').select('name, streak_days').eq('id', sub.user_id).single();

        let message, title;
        if (!todayLog || !todayLog.total_calories) {
          // Hasn't logged yet today
          const streakWarning = (u?.streak_days || 0) > 0
            ? `You have a ${u.streak_days}-day streak to protect! 🔥`
            : 'Start your streak today!';
          title   = 'Keep your streak alive! 🔥';
          message = `Hey ${u?.name || 'there'}! ${streakWarning} Log your meals to keep going.`;
        } else {
          // Has logged — send encouragement
          title   = `Nice work${u?.name ? ', ' + u.name : ''}! ✅`;
          message = `You've logged today. Keep the streak alive — you're on a roll! 💪`;
        }

        // For production: replace this with actual web-push VAPID send
        console.log(`[streak-reminder] user ${sub.user_id}: "${title}" — ${message}`);
        sent++;

      } catch (userErr) {
        console.error('Error for user:', sub.user_id, userErr.message);
      }
    }

    // Also update streak_days for all users based on daily_logs continuity
    await updateAllStreaks(sb);

    return { statusCode: 200, body: JSON.stringify({ sent, checked: subs.length }) };
  } catch (err) {
    console.error('streak-reminder error:', err.message);
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};

async function updateAllStreaks(sb) {
  // Get all users with logs
  const { data: users } = await sb.from('users').select('id');
  if (!users) return;

  for (const u of users) {
    const { data: logs } = await sb.from('daily_logs')
      .select('date, total_calories')
      .eq('user_id', u.id)
      .not('total_calories', 'is', null)
      .gt('total_calories', 0)
      .order('date', { ascending: false })
      .limit(400);

    if (!logs?.length) { await sb.from('users').update({ streak_days: 0 }).eq('id', u.id); continue; }

    // Calculate consecutive days ending today or yesterday
    const today = new Date().toISOString().split('T')[0];
    let streak = 0;
    let checkDate = today;

    const logSet = new Set(logs.map(l => l.date));

    while (logSet.has(checkDate)) {
      streak++;
      const d = new Date(checkDate);
      d.setDate(d.getDate() - 1);
      checkDate = d.toISOString().split('T')[0];
    }

    // If today not logged, check if yesterday was (grace period — streak intact until midnight)
    if (streak === 0) {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];
      checkDate = yesterdayStr;
      while (logSet.has(checkDate)) {
        streak++;
        const d = new Date(checkDate);
        d.setDate(d.getDate() - 1);
        checkDate = d.toISOString().split('T')[0];
      }
    }

    await sb.from('users').update({ streak_days: streak }).eq('id', u.id);
  }
}
