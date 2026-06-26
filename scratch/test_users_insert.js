require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.EXPO_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
async function test() {
  const { error } = await supabase.from('users').insert({
    id: '123e4567-e89b-12d3-a456-426614174000',
    email: 'test@example.com',
    name: 'Athlete',
    fuel_mode: 'balance',
    calorie_target: 2000,
  });
  console.log('Error:', error);
}
test();
