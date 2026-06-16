// Dot Boy — AI Personal Trainer
// Streaming SSE via @netlify/functions stream builder
// Anthropic claude-haiku-4-5-20251001 — fastest model, lowest latency

const { stream } = require('@netlify/functions');

const SYSTEM_PROMPT = (ctx = {}) => `You are Dot Boy, the personal AI trainer and nutrition coach for DotFuel — a fitness app for athletes and health-focused people in India.

Personality: warm, motivating, direct — like a knowledgeable friend. Conversational, not robotic. Concise (2-3 short paragraphs max). Light fitness slang is fine.

Expertise: sports nutrition, macros, workout programming, Indian food (dal/roti/biryani/idli etc.), calorie tracking, muscle building.${ctx.name ? `\nUser: ${ctx.name}` : ''}${ctx.goal ? ` | Goal: ${ctx.goal}` : ''}${ctx.calorieTarget ? ` | Target: ${ctx.calorieTarget} kcal` : ''}${ctx.todayCals ? ` | Logged today: ${ctx.todayCals} kcal` : ''}${ctx.streakDays > 0 ? ` | Streak: ${ctx.streakDays} days 🔥` : ''}

Rules: plain text only (no markdown/asterisks/bullets). Never diagnose medical conditions. End with one actionable tip.`;

exports.handler = stream(async (event) => {
  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return new Response('', {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
      }
    });
  }

  if (event.httpMethod !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY;
  if (!ANTHROPIC_KEY) {
    return new Response(
      `data: ${JSON.stringify({ type: 'error', error: 'AI not configured on server' })}\n\ndata: [DONE]\n\n`,
      { status: 200, headers: { 'Content-Type': 'text/event-stream' } }
    );
  }

  let messages, userContext;
  try {
    const body = JSON.parse(event.body || '{}');
    messages    = body.messages    || [];
    userContext = body.userContext || {};
  } catch {
    return new Response(
      `data: ${JSON.stringify({ type: 'error', error: 'Invalid request body' })}\n\ndata: [DONE]\n\n`,
      { status: 200, headers: { 'Content-Type': 'text/event-stream' } }
    );
  }

  // Build Anthropic messages array — only user/assistant, starting with user
  const anthropicMessages = messages
    .filter(m => m.role === 'user' || m.role === 'assistant')
    .slice(-10) // last 10 turns max to keep payload small
    .map(msg => {
      if (msg.image && msg.image.data) {
        return {
          role: msg.role,
          content: [
            { type: 'image', source: { type: 'base64', media_type: msg.image.mediaType || 'image/jpeg', data: msg.image.data } },
            { type: 'text', text: msg.text || 'What do you think of this meal?' }
          ]
        };
      }
      return {
        role: msg.role,
        content: (typeof msg.text === 'string' ? msg.text : '') || ''
      };
    })
    .filter(m => (typeof m.content === 'string' ? m.content.trim() : m.content?.length > 0));

  // Need at least one user message
  if (!anthropicMessages.length || anthropicMessages[0].role !== 'user') {
    return new Response(
      `data: ${JSON.stringify({ type: 'error', error: 'Send a message first!' })}\n\ndata: [DONE]\n\n`,
      { status: 200, headers: { 'Content-Type': 'text/event-stream' } }
    );
  }

  try {
    const controller = new AbortController();
    const timeoutId  = setTimeout(() => controller.abort(), 24000); // 24s — within Netlify's 26s limit

    const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
      method:  'POST',
      signal:  controller.signal,
      headers: {
        'Content-Type':      'application/json',
        'x-api-key':         ANTHROPIC_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model:      'claude-haiku-4-5-20251001',
        max_tokens: 500,       // shorter = faster first token
        stream:     true,      // enable SSE streaming
        system:     SYSTEM_PROMPT(userContext),
        messages:   anthropicMessages
      })
    });

    clearTimeout(timeoutId);

    if (!anthropicRes.ok) {
      const errText = await anthropicRes.text().catch(() => 'Unknown error');
      console.error('[dotboy] Anthropic error', anthropicRes.status, errText.slice(0, 200));
      const msg = anthropicRes.status === 529
        ? "I'm a little overloaded right now — try again in a moment!"
        : anthropicRes.status === 401
          ? "My API key isn't working. Let the DotFuel team know!"
          : `API error ${anthropicRes.status}`;
      return new Response(
        `data: ${JSON.stringify({ type: 'error', error: msg })}\n\ndata: [DONE]\n\n`,
        { status: 200, headers: { 'Content-Type': 'text/event-stream' } }
      );
    }

    // Proxy the Anthropic SSE stream directly to the client
    return new Response(anthropicRes.body, {
      status:  200,
      headers: {
        'Content-Type':            'text/event-stream',
        'Cache-Control':           'no-cache, no-transform',
        'X-Accel-Buffering':       'no',
        'Access-Control-Allow-Origin': '*',
        'Transfer-Encoding':       'chunked'
      }
    });

  } catch (err) {
    const isTimeout = err.name === 'AbortError';
    console.error('[dotboy] crash:', err.name, err.message);
    const msg = isTimeout
      ? "That took too long — try a shorter question!"
      : "Something went wrong on my end. Try again!";
    return new Response(
      `data: ${JSON.stringify({ type: 'error', error: msg })}\n\ndata: [DONE]\n\n`,
      { status: 200, headers: { 'Content-Type': 'text/event-stream' } }
    );
  }
});
