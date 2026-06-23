import type { VercelRequest, VercelResponse } from '@vercel/node';

const setCorsHeaders = (res: VercelResponse) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
};

let cachedToken: { token: string; expires: number } | null = null;
const queryCache = new Map<string, any>();

async function getAccessToken(): Promise<string> {
  if (cachedToken && Date.now() < cachedToken.expires) {
    return cachedToken.token;
  }

  const clientId = process.env.FATSECRET_CLIENT_ID;
  const clientSecret = process.env.FATSECRET_CLIENT_SECRET;
  if (!clientId || !clientSecret) throw new Error('FatSecret credentials not configured');

  const response = await fetch('https://oauth.fatsecret.com/connect/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
    },
    body: 'grant_type=client_credentials&scope=basic',
  });

  if (!response.ok) throw new Error(`OAuth failed: ${response.status}`);

  const data = (await response.json()) as any;
  cachedToken = {
    token: data.access_token,
    expires: Date.now() + (data.expires_in - 60) * 1000,
  };

  return data.access_token;
}

async function getClaudeFallbackSearch(q: string, apiKey: string) {
  const content = [
    {
      type: 'text',
      text: `The user is searching for food items matching: "${q}".
Provide a list of up to 5 matching foods in this exact JSON format:
{
  "foods": {
    "food": [
      {
        "food_id": "string (unique temporary id)",
        "food_name": "string (e.g., Boiled Egg)",
        "food_description": "Per 1 serving - Calories: 78 | Fat: 5.3 | Carbs: 0.6 | Protein: 6.3"
      }
    ]
  }
}
Note that the path "data.foods.food" should resolve to this array.
Each food_description MUST follow the exact format: "Per [serving size] - Calories: [number] | Fat: [number] | Carbs: [number] | Protein: [number]"
Do not include any extra explanation or markdown. Return only the JSON object.`,
    },
  ];

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 2000,
      messages: [{ role: 'user', content }],
    }),
  });

  if (!response.ok) {
    throw new Error(`Claude API failed with status ${response.status}`);
  }

  const data = await response.json() as any;
  const text = data.content?.[0]?.text || '{}';
  
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start === -1 || end === -1 || start >= end) {
    throw new Error('No valid JSON found in Claude response');
  }
  const cleanJson = text.slice(start, end + 1);
  return JSON.parse(cleanJson);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCorsHeaders(res);
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { action = 'search', q = '', barcode = '', food_id = '', page = '0' } = req.query as Record<string, string>;
  const cacheKey = q.trim().toLowerCase();

  if (action === 'search' && cacheKey) {
    if (queryCache.has(cacheKey)) {
      console.log('[fatsecret] serving search from memory cache:', cacheKey);
      return res.status(200).json(queryCache.get(cacheKey));
    }
  }

  try {
    const token = await getAccessToken();

    let apiUrl: string;
    if (action === 'barcode' && barcode) {
      apiUrl = `https://platform.fatsecret.com/rest/food/barcode/find-by-id/v1?barcode=${barcode}&format=json`;
    } else if (action === 'detail' && (food_id || req.query.foodId)) {
      const id = food_id || (req.query.foodId as string) || '';
      apiUrl = `https://platform.fatsecret.com/rest/food/v4?food_id=${id}&format=json`;
    } else {
      apiUrl = `https://platform.fatsecret.com/rest/foods/search/v1?search_expression=${encodeURIComponent(q)}&page_number=${page}&max_results=15&format=json`;
    }

    const response = await fetch(apiUrl, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('[fatsecret]', response.status, errText.slice(0, 200));
      throw new Error(`FatSecret API error: ${response.status}`);
    }

    const data = await response.json();
    if (action === 'search' && cacheKey) {
      queryCache.set(cacheKey, data);
    }
    return res.status(200).json(data);
  } catch (err: any) {
    console.error('[fatsecret] error, attempting Claude fallback:', err.message);
    
    const anthropicKey = process.env.ANTHROPIC_API_KEY;
    if (action === 'search' && q && anthropicKey) {
      try {
        const fallbackResult = await getClaudeFallbackSearch(q, anthropicKey);
        if (cacheKey) {
          queryCache.set(cacheKey, fallbackResult);
        }
        return res.status(200).json(fallbackResult);
      } catch (fallbackErr: any) {
        console.error('[fatsecret] Claude fallback failed:', fallbackErr.message);
        return res.status(500).json({ error: fallbackErr.message });
      }
    }
    
    return res.status(500).json({ error: err.message });
  }
}
