/**
 * AI Estimate API — uses Anthropic Claude to estimate macros from food descriptions.
 * Replaces: webapp/netlify/functions/ai-estimate.js
 */
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export function OPTIONS() {
  return new Response(null, { headers: corsHeaders });
}

export async function POST(request: Request) {
  const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY;
  if (!ANTHROPIC_KEY) {
    return Response.json({ error: 'AI not configured' }, { status: 500, headers: corsHeaders });
  }

  try {
    const { food, imageBase64, mediaType } = await request.json();

    const content: any[] = [];

    if (imageBase64) {
      content.push({
        type: 'image',
        source: { type: 'base64', media_type: mediaType || 'image/jpeg', data: imageBase64 },
      });
      content.push({
        type: 'text',
        text: `Estimate the nutritional content of this food photo. ${food ? `The user says it's: "${food}".` : ''}
Return ONLY a JSON object: { "name": "string", "emoji": "string", "calories": number, "protein_g": number, "carbs_g": number, "fat_g": number, "fiber_g": number, "serving_size": "string" }
No markdown, no explanation. All values must be numbers. Use Indian food knowledge if applicable.`,
      });
    } else {
      content.push({
        type: 'text',
        text: `Estimate the nutritional content of: "${food}"
Assume a standard Indian serving size.
Return ONLY a JSON object: { "name": "string", "emoji": "string", "calories": number, "protein_g": number, "carbs_g": number, "fat_g": number, "fiber_g": number, "serving_size": "string" }
No markdown, no explanation. All values must be numbers.`,
      });
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 500,
        messages: [{ role: 'user', content }],
      }),
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => 'Unknown error');
      console.error('[ai-estimate] Anthropic error', response.status, errText.slice(0, 200));
      return Response.json({ error: `AI error: ${response.status}` }, { status: 502, headers: corsHeaders });
    }

    const data = await response.json();
    const text = data.content?.[0]?.text || '{}';
    const result = JSON.parse(text.replace(/```json|```/g, '').trim());

    return Response.json(result, { headers: corsHeaders });
  } catch (err: any) {
    console.error('[ai-estimate] error:', err.message);
    return Response.json({ error: err.message }, { status: 500, headers: corsHeaders });
  }
}
