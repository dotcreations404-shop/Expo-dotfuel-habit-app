exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY;
  if (!ANTHROPIC_KEY) {
    return { statusCode: 500, body: JSON.stringify({ error: 'API key not configured' }) };
  }

  try {
    const body = JSON.parse(event.body);
    const { food, serving, type, weight } = body;

    let prompt = '';

    if (type === 'daily_challenge') {
      const today = new Date().toLocaleDateString('en-IN', { weekday: 'long', month: 'long', day: 'numeric' });
      prompt = `Generate a single daily fitness/wellness challenge for ${today}. 
Return ONLY a JSON object with:
- title (string, max 8 words, action-oriented)
- description (string, 1-2 sentences explaining the challenge)  
- emoji (single emoji that fits the challenge)
- category (one of: fitness, nutrition, mindfulness, hydration)
- xp (integer 25-100 based on difficulty)
No markdown, raw JSON only.`;
    } else {
      // FSSAI chain-of-thought prompt for accurate macro estimation
      const servingLine = serving ? `\nServing/Quantity: ${serving}` : '';
      const weightLine  = weight  ? `\nTotal weight: ${weight}g` : '';

      prompt = `You are an FSSAI-certified food scientist with deep expertise in Indian and global cuisine.

Analyse this food item using a strict three-step process:

Step 1 — Ingredient Breakdown:
List every raw ingredient in this dish with its estimated weight in grams (based on standard Indian/global recipes and the given serving size).

Step 2 — Per-Ingredient Macros:
For each ingredient, calculate calories, protein, carbs, and fat using FSSAI/USDA nutritional values.

Step 3 — Sum and Return JSON:
Add all values together and return ONLY this JSON (no markdown, no explanation):
{
  "calories": <integer>,
  "protein": <number, grams to 1 decimal>,
  "carbs": <number, grams to 1 decimal>,
  "fat": <number, grams to 1 decimal>,
  "fiber": <number, grams to 1 decimal>,
  "note": "<one sentence: key ingredients and confidence level>"
}

Food item: ${food}${servingLine}${weightLine}

Important: Use realistic Indian cooking methods (oil for tempering, ghee amounts etc). If uncertain, err on the side of slightly higher calories.`;
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 600,
        thinking: type !== 'daily_challenge' ? undefined : undefined,
        messages: [{ role: 'user', content: prompt }]
      })
    });

    const data = await response.json();
    const text = data.content?.[0]?.text || '{}';

    // Extract JSON from the response — the CoT prompt may include reasoning text before the JSON
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    const result = JSON.parse(jsonMatch ? jsonMatch[0] : text.replace(/```json|```/g, '').trim());

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify(result)
    };
  } catch (err) {
    return {
      statusCode: 500,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: err.message })
    };
  }
};
