// FatSecret API proxy — keeps credentials server-side, never exposed to browser
// Uses OAuth 2.0 Client Credentials flow

const CLIENT_ID     = process.env.FATSECRET_CLIENT_ID;
const CLIENT_SECRET = process.env.FATSECRET_CLIENT_SECRET;
const TOKEN_URL     = 'https://oauth.fatsecret.com/connect/token';
const API_URL       = 'https://platform.fatsecret.com/rest/server.api';

const headers = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

// Simple in-memory token cache (persists for function lifetime ~5 min)
let cachedToken = null;
let tokenExpiry  = 0;

async function getAccessToken() {
  if (cachedToken && Date.now() < tokenExpiry) return cachedToken;

  const creds = Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64');
  const resp = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${creds}`,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: 'grant_type=client_credentials&scope=basic'
  });

  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`Token error ${resp.status}: ${text}`);
  }

  const data = await resp.json();
  cachedToken = data.access_token;
  tokenExpiry  = Date.now() + (data.expires_in - 60) * 1000; // 60s buffer
  return cachedToken;
}

// Map FatSecret food item to our standard format
function mapFood(item) {
  const servings = item.servings?.serving;
  const serving  = Array.isArray(servings) ? servings[0] : servings;

  const calories = parseFloat(serving?.calories        || item.food_description?.match(/Calories: ([\d.]+)/)?.[1] || 0);
  const protein  = parseFloat(serving?.protein         || 0);
  const carbs    = parseFloat(serving?.carbohydrate     || 0);
  const fat      = parseFloat(serving?.fat             || 0);
  const fiber    = parseFloat(serving?.fiber           || 0);
  const sugar    = parseFloat(serving?.sugar           || 0);
  const sodium   = parseFloat(serving?.sodium          || 0);
  const satFat   = parseFloat(serving?.saturated_fat   || 0);
  const potassium= parseFloat(serving?.potassium       || 0);

  return {
    id:           item.food_id,
    name:         item.food_name,
    brand:        item.brand_name || '',
    type:         item.food_type, // 'Generic' or 'Brand'
    serving_size: serving?.serving_description || '100g',
    metric_qty:   parseFloat(serving?.metric_serving_amount || 100),
    metric_unit:  serving?.metric_serving_unit || 'g',
    calories:     Math.round(calories),
    protein_g:    Math.round(protein * 10) / 10,
    carbs_g:      Math.round(carbs   * 10) / 10,
    fat_g:        Math.round(fat     * 10) / 10,
    fiber_g:      Math.round(fiber   * 10) / 10,
    sugar_g:      Math.round(sugar   * 10) / 10,
    sodium_mg:    Math.round(sodium),
    saturated_fat:Math.round(satFat  * 10) / 10,
    potassium_mg: Math.round(potassium),
    source:       'fatsecret'
  };
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };
  if (event.httpMethod !== 'POST')    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };

  if (!CLIENT_ID || !CLIENT_SECRET) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'FatSecret credentials not configured. Add FATSECRET_CLIENT_ID and FATSECRET_CLIENT_SECRET to Netlify env vars.' }) };
  }

  let action, query, barcode, foodId, maxResults;
  try {
    ({ action, query, barcode, foodId, maxResults } = JSON.parse(event.body || '{}'));
  } catch {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid JSON body' }) };
  }

  try {
    const token = await getAccessToken();

    // ── Action: search foods by text ─────────────────────────────────────────
    if (action === 'search') {
      if (!query) return { statusCode: 400, headers, body: JSON.stringify({ error: 'query required' }) };

      const params = new URLSearchParams({
        method:        'foods.search',
        format:        'json',
        search_expression: query,
        max_results:   maxResults || 10,
        page_number:   0
      });

      const resp = await fetch(`${API_URL}?${params}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await resp.json();

      if (data.error) throw new Error(data.error.message);

      const foods = data.foods?.food || [];
      const list  = Array.isArray(foods) ? foods : [foods];

      // For search results we only have summary — return as-is for display
      const results = list.map(f => ({
        id:       f.food_id,
        name:     f.food_name,
        brand:    f.brand_name || '',
        type:     f.food_type,
        desc:     f.food_description || '', // contains "Per Xg - Calories: Y | ..."
        // Parse quick macros from description string
        calories: parseInt(f.food_description?.match(/Calories:\s*([\d.]+)/i)?.[1] || 0),
        protein_g:parseFloat(f.food_description?.match(/Protein:\s*([\d.]+)/i)?.[1] || 0),
        carbs_g:  parseFloat(f.food_description?.match(/Carbs:\s*([\d.]+)/i)?.[1] || 0),
        fat_g:    parseFloat(f.food_description?.match(/Fat:\s*([\d.]+)/i)?.[1] || 0),
        source:   'fatsecret'
      }));

      return { statusCode: 200, headers, body: JSON.stringify({ results, total: data.foods?.total_results || results.length }) };
    }

    // ── Action: barcode lookup ────────────────────────────────────────────────
    if (action === 'barcode') {
      if (!barcode) return { statusCode: 400, headers, body: JSON.stringify({ error: 'barcode required' }) };

      const params = new URLSearchParams({
        method:      'food.find_id_for_barcode',
        format:      'json',
        barcode:     barcode
      });

      const resp = await fetch(`${API_URL}?${params}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await resp.json();

      if (data.error) {
        if (data.error.code === 106) {
          // Not found in FatSecret
          return { statusCode: 404, headers, body: JSON.stringify({ error: 'not_found', message: 'Product not found' }) };
        }
        throw new Error(data.error.message);
      }

      const resolvedFoodId = data.food_id?.value;
      if (!resolvedFoodId) {
        return { statusCode: 404, headers, body: JSON.stringify({ error: 'not_found', message: 'Product not found' }) };
      }

      // Fetch full food details
      const detailParams = new URLSearchParams({
        method:  'food.get.v4',
        format:  'json',
        food_id: resolvedFoodId
      });

      const detailResp = await fetch(`${API_URL}?${detailParams}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const detailData = await detailResp.json();
      if (detailData.error) throw new Error(detailData.error.message);

      const food = mapFood(detailData.food);
      return { statusCode: 200, headers, body: JSON.stringify({ food }) };
    }

    // ── Action: get food detail by ID ─────────────────────────────────────────
    if (action === 'detail') {
      if (!foodId) return { statusCode: 400, headers, body: JSON.stringify({ error: 'foodId required' }) };

      const params = new URLSearchParams({
        method:  'food.get.v4',
        format:  'json',
        food_id: foodId
      });

      const resp = await fetch(`${API_URL}?${params}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await resp.json();
      if (data.error) throw new Error(data.error.message);

      const food = mapFood(data.food);
      return { statusCode: 200, headers, body: JSON.stringify({ food }) };
    }

    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Unknown action. Use: search | barcode | detail' }) };

  } catch (err) {
    console.error('FatSecret error:', err.message);
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
  }
};
