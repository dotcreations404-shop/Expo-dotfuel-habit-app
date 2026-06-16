/**
 * FatSecret API — food database search and barcode lookup.
 * Replaces: webapp/netlify/functions/fatsecret.js
 */
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

let cachedToken: { token: string; expires: number } | null = null;

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
      Authorization: `Basic ${btoa(`${clientId}:${clientSecret}`)}`,
    },
    body: 'grant_type=client_credentials&scope=basic',
  });

  if (!response.ok) throw new Error(`OAuth failed: ${response.status}`);

  const data = await response.json();
  cachedToken = {
    token: data.access_token,
    expires: Date.now() + (data.expires_in - 60) * 1000,
  };

  return data.access_token;
}

export function OPTIONS() {
  return new Response(null, { headers: corsHeaders });
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const action = url.searchParams.get('action') ?? 'search';
  const query = url.searchParams.get('q') ?? '';
  const barcode = url.searchParams.get('barcode') ?? '';
  const foodId = url.searchParams.get('food_id') ?? '';
  const page = url.searchParams.get('page') ?? '0';

  try {
    const token = await getAccessToken();

    let apiUrl: string;
    let method: string;

    if (action === 'barcode' && barcode) {
      apiUrl = `https://platform.fatsecret.com/rest/food/barcode/find-by-id/v1?barcode=${barcode}&format=json`;
      method = 'foods.find_id_for_barcode';
    } else if (action === 'detail' && foodId) {
      apiUrl = `https://platform.fatsecret.com/rest/food/v4?food_id=${foodId}&format=json`;
      method = 'food.get.v4';
    } else {
      apiUrl = `https://platform.fatsecret.com/rest/foods/search/v1?search_expression=${encodeURIComponent(query)}&page_number=${page}&max_results=15&format=json`;
      method = 'foods.search';
    }

    const response = await fetch(apiUrl, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('[fatsecret]', response.status, errText.slice(0, 200));
      return Response.json({ error: `FatSecret API error: ${response.status}` }, { status: 502, headers: corsHeaders });
    }

    const data = await response.json();
    return Response.json(data, { headers: corsHeaders });
  } catch (err: any) {
    console.error('[fatsecret] error:', err.message);
    return Response.json({ error: err.message }, { status: 500, headers: corsHeaders });
  }
}
