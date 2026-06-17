/**
 * OCR Label API — extracts nutritional info from label photos.
 * Replaces: webapp/netlify/functions/ocr-label.js
 */
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export function OPTIONS() {
  return new Response(null, { headers: corsHeaders });
}

export async function POST(request: Request) {
  const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY;
  if (!ANTHROPIC_KEY) {
    return Response.json({ error: 'API key not configured' }, { status: 500, headers: corsHeaders });
  }

  try {
    const { imageBase64, mediaType } = await request.json();
    if (!imageBase64) {
      return Response.json({ error: 'imageBase64 required' }, { status: 400, headers: corsHeaders });
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

    const data = await response.json();
    const text = data.content?.[0]?.text || '{}';
    const result = JSON.parse(text.replace(/```json|```/g, '').trim());

    return Response.json(result, { headers: corsHeaders });
  } catch (err: any) {
    return Response.json({ error: err.message }, { status: 500, headers: corsHeaders });
  }
}
