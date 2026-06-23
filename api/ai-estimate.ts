import type { VercelRequest, VercelResponse } from '@vercel/node';

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

  const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY;
  if (!ANTHROPIC_KEY) {
    return res.status(500).json({ error: 'AI not configured' });
  }

  try {
    const { food, imageBase64, mediaType } = req.body || {};

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
      return res.status(502).json({ error: `AI error: ${response.status}` });
    }

    const data = (await response.json()) as any;
    const text = data.content?.[0]?.text || '{}';
    const result = JSON.parse(text.replace(/```json|```/g, '').trim());

    return res.status(200).json(result);
  } catch (err: any) {
    console.error('[ai-estimate] error:', err.message);
    return res.status(500).json({ error: err.message });
  }
}
