const fs = require('fs');

function loadEnv() {
  const envContent = fs.readFileSync('/Users/doran/app-dotfuel-shop/.env', 'utf8');
  const env = {};
  envContent.split('\n').forEach(line => {
    const cleanLine = line.trim();
    if (cleanLine && !cleanLine.startsWith('#')) {
      const parts = cleanLine.split('=');
      const key = parts[0].trim();
      let value = parts.slice(1).join('=').trim();
      if (value.startsWith('"') && value.endsWith('"')) {
        value = value.slice(1, -1);
      }
      if (value.startsWith("'") && value.endsWith("'")) {
        value = value.slice(1, -1);
      }
      env[key] = value;
    }
  });
  return env;
}

async function testClaude() {
  const env = loadEnv();
  const apiKey = env.ANTHROPIC_API_KEY;
  const q = 'egg';

  const content = [
    {
      type: 'text',
      text: `The user is searching for food items matching: "${q}".
Provide a list of up to 10 matching foods in this exact JSON format:
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

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 800,
        messages: [{ role: 'user', content }],
      }),
    });

    console.log('Status:', response.status);
    const data = await response.json();
    console.log('Claude response status:', response.status);
    console.log('Claude full response data:', JSON.stringify(data, null, 2));
    
    if (data.content && data.content[0]) {
      const text = data.content[0].text;
      console.log('--- Claude Returned Text ---');
      console.log(text);
      console.log('----------------------------');
      const cleanJson = text.replace(/```json|```/g, '').trim();
      try {
        const parsed = JSON.parse(cleanJson);
        console.log('SUCCESS PARSING! Results count:', parsed?.foods?.food?.length);
      } catch (parseErr) {
        console.error('PARSE FAILED:', parseErr.message);
      }
    }
  } catch (err) {
    console.error('Error:', err);
  }
}

testClaude();
