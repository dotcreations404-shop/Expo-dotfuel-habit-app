const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://xljamnukzgystdthzgud.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhsamFtbnVremd5c3RkdGh6Z3VkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzkxOTA4NSwiZXhwIjoyMDg5NDk1MDg1fQ.aK6R2eN_x81Ncpj96c9t512df8e98b7ce2b512e987c';

const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function run() {
  console.log('1. Fetching a sample user to test with...');
  const { data: users, error: userErr } = await sb.from('users').select('*').limit(1);
  if (userErr || !users || users.length === 0) {
    console.error('❌ Failed to fetch user:', userErr);
    return;
  }
  const testUser = users[0];
  console.log('✅ Test user:', testUser.id, testUser.name);

  console.log('2. Fetching today\'s daily log for the user...');
  const todayStr = new Date().toISOString().split('T')[0];
  let { data: dailyLog, error: dlError } = await sb
    .from('daily_logs')
    .select('*')
    .eq('user_id', testUser.id)
    .eq('date', todayStr)
    .maybeSingle();

  if (!dailyLog) {
    console.log('Creating daily log...');
    const { data: newDl, error: newDlErr } = await sb
      .from('daily_logs')
      .insert({
        user_id: testUser.id,
        date: todayStr,
        total_calories: 0,
        total_protein: 0,
        total_carbs: 0,
        total_fat: 0,
      })
      .select()
      .single();
    if (newDlErr) {
      console.error('❌ Daily log creation failed:', newDlErr.message);
      return;
    }
    dailyLog = newDl;
  }
  console.log('Daily log:', dailyLog.id);

  console.log('3. Testing Quick Add with decimal/float values (Rice - f:0.4)...');
  const riceMeal = { emoji: '🍚', name: 'Rice (1 cup)', cal: 200, p: 4, c: 45, f: 0.4 };
  const { data: mealData, error: mealErr } = await sb
    .from('meals')
    .insert({
      user_id: testUser.id,
      daily_log_id: dailyLog.id,
      name: riceMeal.name,
      emoji: riceMeal.emoji,
      calories: riceMeal.cal,
      protein: riceMeal.p,
      carbs: riceMeal.c,
      fat: riceMeal.f,
      meal_time: 'breakfast'
    })
    .select();

  if (mealErr) {
    console.error('❌ Insert Rice failed:', mealErr.message, mealErr);
  } else {
    console.log('✅ Insert Rice successful:', mealData[0]);
    // Clean up
    await sb.from('meals').delete().eq('id', mealData[0].id);
  }

  console.log('4. Testing Quick Add with decimal/float values (Banana - p:1.3, f:0.3)...');
  const bananaMeal = { emoji: '🍌', name: 'Banana', cal: 105, p: 1.3, c: 27, f: 0.3 };
  const { data: bananaData, error: bananaErr } = await sb
    .from('meals')
    .insert({
      user_id: testUser.id,
      daily_log_id: dailyLog.id,
      name: bananaMeal.name,
      emoji: bananaMeal.emoji,
      calories: bananaMeal.cal,
      protein: bananaMeal.p,
      carbs: bananaMeal.c,
      fat: bananaMeal.f,
      meal_time: 'breakfast'
    })
    .select();

  if (bananaErr) {
    console.error('❌ Insert Banana failed:', bananaErr.message, bananaErr);
  } else {
    console.log('✅ Insert Banana successful:', bananaData[0]);
    // Clean up
    await sb.from('meals').delete().eq('id', bananaData[0].id);
  }
}

run();
