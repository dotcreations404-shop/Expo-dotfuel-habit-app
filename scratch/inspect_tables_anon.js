const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://xljamnukzgystdthzgud.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhsamFtbnVremd5c3RkdGh6Z3VkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM5MTkwODUsImV4cCI6MjA4OTQ5NTA4NX0.lpGkMe7XvOEcSSuKh229X5AbBeho0w-vpZwPdNwk1CE';

const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function run() {
  console.log('1. Signing up a new test user...');
  const email = `test_inspect_${Date.now()}@gmail.com`;
  const password = 'Password123!';
  const { data: authData, error: authError } = await sb.auth.signUp({
    email,
    password
  });

  if (authError) {
    console.error('❌ Sign up failed:', authError.message);
    return;
  }

  const user = authData.user;
  console.log('✅ Signed in! User ID:', user.id);

  console.log('2. Fetching profile...');
  const { data: profile, error: profileErr } = await sb
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle();

  console.log('Profile from profiles:', profile || profileErr);

  const { data: userRow, error: userRowErr } = await sb
    .from('users')
    .select('*')
    .eq('id', user.id)
    .maybeSingle();

  console.log('Profile from users:', userRow || userRowErr);

  console.log('3. Getting daily log for today...');
  const todayStr = new Date().toISOString().split('T')[0];
  let { data: dailyLog, error: dlError } = await sb
    .from('daily_logs')
    .select('*')
    .eq('user_id', user.id)
    .eq('date', todayStr)
    .maybeSingle();

  if (!dailyLog) {
    console.log('Creating daily log for today...');
    const { data: newDl, error: newDlErr } = await sb
      .from('daily_logs')
      .insert({
        user_id: user.id,
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

  console.log('Daily log:', dailyLog);

  console.log('4. Testing Quick Add with decimal/float values (Rice - f:0.4)...');
  const riceMeal = { emoji: '🍚', name: 'Rice (1 cup)', cal: 200, p: 4, c: 45, f: 0.4 };
  const { data: mealData, error: mealErr } = await sb
    .from('meals')
    .insert({
      user_id: user.id,
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
    console.log('Rice details:', mealData);
    console.log('✅ Insert Rice successful!');
  }

  console.log('5. Testing Quick Add with Math.round on macros...');
  const { data: roundedMeal, error: roundedMealErr } = await sb
    .from('meals')
    .insert({
      user_id: user.id,
      daily_log_id: dailyLog.id,
      name: riceMeal.name,
      emoji: riceMeal.emoji,
      calories: Math.round(riceMeal.cal),
      protein: Math.round(riceMeal.p),
      carbs: Math.round(riceMeal.c),
      fat: Math.round(riceMeal.f),
      meal_time: 'breakfast'
    })
    .select();

  if (roundedMealErr) {
    console.error('❌ Insert Rounded Rice failed:', roundedMealErr.message, roundedMealErr);
  } else {
    console.log('✅ Insert Rounded Rice successful:', roundedMeal);
    const createdMeal = roundedMeal[0];

    console.log('6. Testing Update Meal...');
    const { data: updatedMeal, error: updateErr } = await sb
      .from('meals')
      .update({
        name: 'Rice (Updated)',
        calories: 220,
        protein: 5,
        carbs: 48,
        fat: 1
      })
      .eq('id', createdMeal.id)
      .select();

    if (updateErr) {
      console.error('❌ Update failed:', updateErr.message, updateErr);
    } else {
      console.log('✅ Update successful:', updatedMeal);
    }

    console.log('7. Testing Delete Meal...');
    const { data: deletedRes, error: deleteErr } = await sb
      .from('meals')
      .delete()
      .eq('id', createdMeal.id);

    if (deleteErr) {
      console.error('❌ Delete failed:', deleteErr.message, deleteErr);
    } else {
      console.log('✅ Delete successful! Result:', deletedRes);
    }
  }
}

run();
