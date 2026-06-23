const fs = require('fs');

const envPath = '/Users/doran/app-dotfuel-shop/.env';
const envContent = fs.readFileSync(envPath, 'utf8');

const getEnvVar = (name) => {
  const match = envContent.match(new RegExp(`${name}=(?:"([^"]+)"|([^\\s]+))`));
  return match ? (match[1] || match[2]) : null;
};

const url = getEnvVar('EXPO_PUBLIC_SUPABASE_URL');
const anonKey = getEnvVar('EXPO_PUBLIC_SUPABASE_ANON_KEY');

async function checkCols() {
  const cols = ['calories', 'protein', 'protein_g', 'carbs', 'carbs_g', 'fat', 'fat_g', 'meal_type', 'meal_time'];
  for (const col of cols) {
    const res = await fetch(`${url}/rest/v1/meals?select=${col}&limit=1`, {
      headers: { 'apikey': anonKey, 'Authorization': `Bearer ${anonKey}` }
    });
    console.log(`meals.${col}:`, res.status);
  }
}

checkCols();
