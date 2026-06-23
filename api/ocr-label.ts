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
    return res.status(500).json({ error: 'API key not configured' });
  }

  try {
    const { imageBase64, mediaType } = req.body || {};
    if (!imageBase64) {
      return res.status(400).json({ error: 'imageBase64 required' });
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
        max_tokens: 800,
        messages: [{
          role: 'user',
          content: [
            {
              type: 'image',
              source: { type: 'base64', media_type: mediaType || 'image/jpeg', data: imageBase64 },
            },
            {
              type: 'text',
              text: `Extract ALL nutritional information from this nutrition label image.
Return ONLY a JSON object with these exact keys (use 0 if not found):
{
  "product_name": "string or empty",
  "brand": "string or empty",
  "serving_size": "string e.g. 100g or 1 cup",
  "calories": number,
  "protein_g": number,
  "carbs_g": number,
  "fat_g": number,
  "saturated_fat_g": number,
  "fiber_g": number,
  "sugar_g": number,
  "sodium_mg": number
}
No markdown, no explanation, raw JSON only. All values must be numbers.`,
            },
          ],
        }],
      }),
    });

    const data = (await response.json()) as any;
    const text = data.content?.[0]?.text || '{}';
    const result = JSON.parse(text.replace(/```json|```/g, '').trim());

    return res.status(200).json(result);
  } catch (err: any) {
    console.error('[ocr-label] error:', err.message);
    return res.status(500).json({ error: err.message });
  }
}
