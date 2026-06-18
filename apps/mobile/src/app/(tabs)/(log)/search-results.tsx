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
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const router = useRouter();

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
      await supabase.from('meals').insert({
        user_id: user!.id,
        daily_log_id: logId,
        name: food.food_name,
        emoji: '🍽️',
        calories: Math.round(cal),
        protein_g: Math.round(protein),
        carbs_g: Math.round(carbs),
        fat_g: Math.round(fat),
        serving_size: serving,
        source: 'fatsecret',
        meal_type: getMealType(),
      });

      // Update totals
      const { data: log } = await supabase.from('daily_logs')
        .select('total_calories, total_protein, total_carbs, total_fat')
        .eq('id', logId).single();
      if (log) {
        await supabase.from('daily_logs').update({
          total_calories: (log.total_calories || 0) + Math.round(cal),
          total_protein: (log.total_protein || 0) + Math.round(protein),
          total_carbs: (log.total_carbs || 0) + Math.round(carbs),
          total_fat: (log.total_fat || 0) + Math.round(fat),
        }).eq('id', logId);
      }
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
