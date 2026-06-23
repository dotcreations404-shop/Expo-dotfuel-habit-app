/**
 * FatSecret food search results screen.
 */
import { useState, useEffect } from 'react';
import { View, ScrollView, Pressable, ActivityIndicator, Alert } from 'react-native';
import { Text } from '@/components/ui/text';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '@/contexts/auth-context';
import { supabase } from '@/lib/supabase';
import { DotFuelColors, Spacing, Radius } from '@/constants/colors';
import { getApiUrl } from '@/lib/api-helper';

interface FoodResult {
  food_id: string;
  food_name: string;
  food_description: string;
  brand_name?: string;
}

function today(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function getMealType(): string {
  const h = new Date().getHours();
  if (h < 11) return 'breakfast';
  if (h < 15) return 'lunch';
  if (h < 19) return 'dinner';
  return 'snack';
}

function parseDescription(desc: string): { cal: number; fat: number; carbs: number; protein: number; serving: string } {
  const serving = desc.split(' - ')[0] || '';
  const cal = parseFloat(desc.match(/Calories:\s*([\d.]+)/)?.[1] || '0');
  const fat = parseFloat(desc.match(/Fat:\s*([\d.]+)/)?.[1] || '0');
  const carbs = parseFloat(desc.match(/Carbs:\s*([\d.]+)/)?.[1] || '0');
  const protein = parseFloat(desc.match(/Protein:\s*([\d.]+)/)?.[1] || '0');
  return { cal, fat, carbs, protein, serving };
}

export default function SearchResultsScreen() {
  const { q } = useLocalSearchParams<{ q: string }>();
  const { user, profile } = useAuth();
  const queryClient = useQueryClient();
  const router = useRouter();

  const recalculateAndSaveDailyTotals = async (logId: string) => {
    try {
      const todayStr = today();
      const { data: mealsData } = await supabase
        .from('meals')
        .select('calories, protein, carbs, fat')
        .eq('daily_log_id', logId);

      const eaten = mealsData?.reduce((s, m) => s + (m.calories || 0), 0) || 0;
      const proteinVal = mealsData?.reduce((s, m) => s + (m.protein || 0), 0) || 0;
      const carbsVal = mealsData?.reduce((s, m) => s + (m.carbs || 0), 0) || 0;
      const fatVal = mealsData?.reduce((s, m) => s + (m.fat || 0), 0) || 0;

      const { data: actData } = await supabase
        .from('activity_entries')
        .select('calories_burned')
        .eq('user_id', user!.id)
        .eq('logged_at', todayStr);

      const activeCals = actData?.reduce((s, a) => s + (a.calories_burned || 0), 0) || 0;

      const { data: curLog } = await supabase
        .from('daily_logs')
        .select('water_ml')
        .eq('id', logId)
        .single();
      const water = curLog?.water_ml || 0;

      const calorieTarget = profile?.calorie_target ?? 1800;
      const proteinTarget = profile?.protein_target ?? 120;
      const carbsTarget = profile?.carbs_target ?? 200;
      const fatTarget = profile?.fat_target ?? 60;
      const waterGoal = profile?.water_goal_ml ?? 3000;

      // Fuel score: multi-factor calculation
      const calorieScore = eaten > 0 ? Math.min(40, Math.round(40 * (1 - Math.abs(eaten - calorieTarget) / calorieTarget))) : 0;
      const proteinScore = proteinTarget > 0 ? Math.min(25, Math.round(25 * Math.min(1, proteinVal / proteinTarget))) : 0;
      const waterScore = waterGoal > 0 ? Math.min(20, Math.round(20 * Math.min(1, water / waterGoal))) : 0;
      const activityScore = activeCals > 0 ? Math.min(15, Math.round(15 * Math.min(1, activeCals / 300))) : 0;
      const score = Math.max(0, calorieScore + proteinScore + waterScore + activityScore);
      const dotColor = score >= 85 ? 'lime' : score >= 65 ? 'green' : score >= 40 ? 'blue' : 'red';

      await supabase
        .from('daily_logs')
        .update({
          total_calories: eaten,
          total_protein: proteinVal,
          total_carbs: carbsVal,
          total_fat: fatVal,
          active_calories: activeCals,
          fuel_score: score,
          dot_color: dotColor,
        })
        .eq('id', logId);

      // Trigger Vol3 Water Sync if appropriate
      const isHydrated = water >= 4000;
      const { data: vol3Part } = await supabase
        .from('challenge_vol3_participants')
        .select('id')
        .eq('user_id', user!.id)
        .eq('status', 'active')
        .maybeSingle();

      if (vol3Part && isHydrated) {
        await supabase
          .from('challenge_vol3_daily_progress')
          .upsert({
            user_id: user!.id,
            log_date: todayStr,
            water_synced_override: true,
          }, { onConflict: 'user_id,log_date' });
      }

    } catch (err) {
      console.warn('[recalculate] Failed to update daily log:', err);
    }
  };

  const [results, setResults] = useState<FoodResult[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!q) return;
    (async () => {
      try {
        const res = await fetch(getApiUrl(`/api/fatsecret?action=search&q=${encodeURIComponent(q)}`));
        const data = await res.json();
        const foods = data?.foods_search?.results?.food || data?.foods?.food || [];
        setResults(Array.isArray(foods) ? foods : [foods]);
      } catch (err: any) {
        Alert.alert('Error', err.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [q]);

  const addMutation = useMutation({
    mutationFn: async (food: FoodResult) => {
      const { cal, fat, carbs, protein, serving } = parseDescription(food.food_description);

      // Get or create today's log
      const todayStr = today();
      let logId: string;
      const { data: existing } = await supabase
        .from('daily_logs').select('id').eq('user_id', user!.id).eq('date', todayStr).maybeSingle();
      if (existing?.id) {
        logId = existing.id;
      } else {
        const { data, error } = await supabase.from('daily_logs')
          .insert({ user_id: user!.id, date: todayStr, total_calories: 0, total_protein: 0, total_carbs: 0, total_fat: 0 })
          .select('id').single();
        if (error) throw error;
        logId = data.id;
      }

      // Insert meal
      const { error: mealErr } = await supabase.from('meals').insert({
        user_id: user!.id,
        daily_log_id: logId,
        name: food.food_name,
        emoji: '🍽️',
        calories: Math.round(cal),
        protein: Math.round(protein),
        carbs: Math.round(carbs),
        fat: Math.round(fat),
        serving_size: serving,
        meal_time: getMealType(),
      });
      if (mealErr) throw mealErr;

      await recalculateAndSaveDailyTotals(logId);
    },
    onSuccess: () => {
      if (process.env.EXPO_OS === 'ios') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      queryClient.invalidateQueries({ queryKey: ['daily-log'] });
      queryClient.invalidateQueries({ queryKey: ['meals'] });
      router.back();
    },
    onError: (err) => Alert.alert('Error', err.message),
  });

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: DotFuelColors.black }} edges={['top', 'left', 'right']}>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 100 }}>
        <View style={{ paddingTop: 8, paddingHorizontal: Spacing['2xl'] }}>
          <Text style={{
            fontFamily: 'Inter', fontSize: 22, fontWeight: '900',
            color: DotFuelColors.white, marginBottom: 4,
          }}>
            Results for "{q}"
          </Text>
        <Text style={{ fontSize: 12, color: DotFuelColors.muted, fontWeight: '500', marginBottom: Spacing.lg }}>
          {results.length} foods found • Tap to add
        </Text>

        {loading ? (
          <View style={{ paddingTop: 40, alignItems: 'center' }}>
            <ActivityIndicator color={DotFuelColors.lime} size="large" />
          </View>
        ) : results.length === 0 ? (
          <View style={{ paddingTop: 40, alignItems: 'center' }}>
            <Text style={{ fontSize: 36, marginBottom: 10 }}>🔍</Text>
            <Text style={{ color: DotFuelColors.muted, fontSize: 14, fontWeight: '600' }}>No results found</Text>
          </View>
        ) : (
          <View style={{ gap: 8 }}>
            {results.map((food) => {
              const { cal, protein, serving } = parseDescription(food.food_description);
              return (
                <Pressable
                  key={food.food_id}
                  onPress={() => addMutation.mutate(food)}
                  disabled={addMutation.isPending}
                  style={({ pressed }) => ({
                    backgroundColor: DotFuelColors.card, borderRadius: Radius.lg,
                    padding: 14, borderWidth: 1, borderColor: DotFuelColors.cardBorder,
                    opacity: pressed ? 0.88 : 1,
                    transform: [{ scale: pressed ? 0.98 : 1 }],
                  })}
                >
                  <Text style={{ fontSize: 14, fontWeight: '700', color: DotFuelColors.white, marginBottom: 2 }}>
                    {food.food_name}
                  </Text>
                  {food.brand_name && (
                    <Text style={{ fontSize: 11, color: DotFuelColors.blue, fontWeight: '600', marginBottom: 4 }}>
                      {food.brand_name}
                    </Text>
                  )}
                  <Text style={{ fontSize: 11, color: DotFuelColors.muted, fontWeight: '500', lineHeight: 16 }}>
                    {serving} • {Math.round(cal)} kcal • {Math.round(protein)}g protein
                  </Text>
                </Pressable>
              );
            })}
          </View>
        )}
      </View>
    </ScrollView>
    </SafeAreaView>
  );
}
