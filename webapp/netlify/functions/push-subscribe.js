// Save or remove a Web Push subscription for a user
const { createClient } = require('@supabase/supabase-js');

exports.handler = async (event) => {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization'
  };

  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers, body: 'Method Not Allowed' };

  const SUPABASE_URL     = process.env.SUPABASE_URL || 'https://xljamnukzgystdthzgud.supabase.co';
  const SUPABASE_SERVICE = process.env.SUPABASE_SERVICE_KEY;

  if (!SUPABASE_SERVICE) return { statusCode: 500, headers, body: JSON.stringify({ error: 'Server config error' }) };

  try {
    const { subscription, userId, timezone, action } = JSON.parse(event.body || '{}');
    if (!userId) return { statusCode: 400, headers, body: JSON.stringify({ error: 'userId required' }) };

    const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE);

    if (action === 'unsubscribe') {
      await sb.from('push_subscriptions').delete().eq('user_id', userId);
      return { statusCode: 200, headers, body: JSON.stringify({ ok: true }) };
    }

    if (!subscription?.endpoint) return { statusCode: 400, headers, body: JSON.stringify({ error: 'subscription required' }) };

    const { error } = await sb.from('push_subscriptions').upsert({
      user_id:  userId,
      endpoint: subscription.endpoint,
      p256dh:   subscription.keys?.p256dh || '',
      auth_key: subscription.keys?.auth   || '',
      timezone: timezone || 'Asia/Kolkata',
      updated_at: new Date().toISOString()
    }, { onConflict: 'user_id,endpoint' });

    if (error) throw error;

    return { statusCode: 200, headers, body: JSON.stringify({ ok: true }) };
  } catch (err) {
    console.error('push-subscribe error:', err.message);
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
  }
};
