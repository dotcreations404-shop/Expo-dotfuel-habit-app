export const config = {
  runtime: 'edge',
};

const SYSTEM_PROMPT = (ctx: Record<string, any> = {}) =>
  `You are Dot Boy, the personal AI trainer and nutrition coach for DotFuel — a fitness app for athletes and health-focused people in India.

Personality: warm, motivating, direct — like a knowledgeable friend. Conversational, not robotic. Concise (2-3 short paragraphs max). Light fitness slang is fine.

Expertise: sports nutrition, macros, workout programming, Indian food (dal/roti/biryani/idli etc.), calorie tracking, muscle building.${ctx.name ? `\nUser: ${ctx.name}` : ''}${ctx.goal ? ` | Goal: ${ctx.goal}` : ''}${ctx.calorieTarget ? ` | Target: ${ctx.calorieTarget} kcal` : ''}${ctx.todayCals ? ` | Logged today: ${ctx.todayCals} kcal` : ''}${ctx.streakDays > 0 ? ` | Streak: ${ctx.streakDays} days 🔥` : ''}

Rules: plain text only (no markdown/asterisks/bullets). Never diagnose medical conditions. End with one actionable tip.`;

export async function POST(request: Request) {
  const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY;
  if (!ANTHROPIC_KEY) {
    return new Response(
      `data: ${JSON.stringify({ type: 'error', error: 'AI not configured on server' })}\n\ndata: [DONE]\n\n`,
      { status: 200, headers: { 'Content-Type': 'text/event-stream' } },
    );
  }

  let messages: any[];
  let userContext: any;
  try {
    const body = await request.json();
    messages = body.messages || [];
    userContext = body.userContext || {};
  } catch {
    return new Response(
      `data: ${JSON.stringify({ type: 'error', error: 'Invalid request body' })}\n\ndata: [DONE]\n\n`,
      { status: 200, headers: { 'Content-Type': 'text/event-stream' } },
    );
  }

  // Build Anthropic messages array
  const anthropicMessages = messages
    .filter((m: any) => m.role === 'user' || m.role === 'assistant')
    .slice(-10)
    .map((msg: any) => {
      if (msg.image?.data) {
        return {
          role: msg.role,
          content: [
            { type: 'image', source: { type: 'base64', media_type: msg.image.mediaType || 'image/jpeg', data: msg.image.data } },
            { type: 'text', text: msg.text || 'What do you think of this meal?' },
          ],
        };
      }
      return { role: msg.role, content: msg.text || '' };
    })
    .filter((m: any) => (typeof m.content === 'string' ? m.content.trim() : m.content?.length > 0));

  if (!anthropicMessages.length || anthropicMessages[0].role !== 'user') {
    return new Response(
      `data: ${JSON.stringify({ type: 'error', error: 'Send a message first!' })}\n\ndata: [DONE]\n\n`,
      { status: 200, headers: { 'Content-Type': 'text/event-stream' } },
    );
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 24000);

    const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 500,
        stream: true,
        system: SYSTEM_PROMPT(userContext),
        messages: anthropicMessages,
      }),
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
        { status: 200, headers: { 'Content-Type': 'text/event-stream' } },
      );
    }

    return new Response(anthropicRes.body, {
      status: 200,
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });
  } catch (err: any) {
    const isTimeout = err.name === 'AbortError';
    const msg = isTimeout
      ? "That took too long — try a shorter question!"
      : "Something went wrong on my end. Try again!";
    return new Response(
      `data: ${JSON.stringify({ type: 'error', error: msg })}\n\ndata: [DONE]\n\n`,
      { status: 200, headers: { 'Content-Type': 'text/event-stream' } },
    );
  }
}

export async function OPTIONS() {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
