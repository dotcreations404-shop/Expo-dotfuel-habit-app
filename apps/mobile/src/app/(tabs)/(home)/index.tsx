/**
 * Home screen — the main DotFuel dashboard.
 * Matches webapp layout exactly:
 *   - Header: greeting-sub (date) + greeting-name on left, avatar on right
 *   - Fuel dot with date label below
 *   - Calorie summary, macro bars, week dots, water, meals
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { View, ScrollView, RefreshControl, Pressable } from 'react-native';
import { Text } from '@/components/ui/text';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuth } from '@/contexts/auth-context';
import { supabase } from '@/lib/supabase';
import type { DailyLog, Meal } from '@/lib/types';
import { DotFuelColors, Spacing, Radius } from '@/constants/colors';
import { FuelDot } from '@/components/fuel-dot';
import { CalorieSummary } from '@/components/calorie-summary';
import { MacroBars } from '@/components/macro-bars';
import { WeekDots } from '@/components/week-dots';
import { MealItem } from '@/components/meal-item';
import { WaterCard } from '@/components/water-card';

/** Returns YYYY-MM-DD in local timezone. */
function today(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Matches webapp .home-header greeting-sub */
function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good Morning ☀️';
  if (h < 17) return 'Good Afternoon 👋';
  return 'Good Evening 🌙';
}

/** Fuel date shown below dot — matches webapp .fuel-date */
function formatDate(): string {
  return new Date().toLocaleDateString('en-IN', {
    weekday: 'long', month: 'short', day: 'numeric',
  }).toUpperCase();
}

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export default function HomeScreen() {
  const { profile, user } = useAuth();
  const queryClient = useQueryClient();
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);
  const insets = useSafeAreaInsets();

  const todayStr = today();
  const calorieTarget = profile?.calorie_target ?? 1800;
  const proteinTarget = profile?.protein_target ?? 120;
  const carbsTarget = profile?.carbs_target ?? 200;
  const fatTarget = profile?.fat_target ?? 60;
  const waterGoal = profile?.water_goal_ml ?? 3000;

  // ── Fetch today's log ──────────────────────────────────────────────────────
  const { data: dailyLog, refetch: refetchLog } = useQuery({
    queryKey: ['daily-log', user?.id, todayStr],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from('daily_logs')
        .select('*')
        .eq('user_id', user.id)
        .eq('date', todayStr)
        .maybeSingle();
      if (error) throw error;
      return data as DailyLog | null;
    },
    enabled: !!user?.id,
  });

  // ── Fetch today's meals ────────────────────────────────────────────────────
  const { data: meals = [] } = useQuery({
    queryKey: ['meals', dailyLog?.id],
    queryFn: async () => {
      if (!dailyLog?.id) return [];
      const { data, error } = await supabase
        .from('meals')
        .select('*')
        .eq('daily_log_id', dailyLog.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as Meal[];
    },
    enabled: !!dailyLog?.id,
  });

  // ── Week data for dots ─────────────────────────────────────────────────────
  const { data: weekLogs = [] } = useQuery({
    queryKey: ['week-logs', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 6);
      const weekAgoStr = `${weekAgo.getFullYear()}-${String(weekAgo.getMonth() + 1).padStart(2, '0')}-${String(weekAgo.getDate()).padStart(2, '0')}`;

      const { data, error } = await supabase
        .from('daily_logs')
        .select('date, fuel_score, total_calories')
        .eq('user_id', user.id)
        .gte('date', weekAgoStr)
        .lte('date', todayStr)
        .order('date');
      if (error) throw error;
      return data as Array<{ date: string; fuel_score: number | null; total_calories: number }>;
    },
    enabled: !!user?.id,
  });

  const weekDays = useMemo(() => {
    const result = [];
    const logMap = new Map(weekLogs.map(l => [l.date, l]));

    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      const log = logMap.get(dateStr);
      const dayIndex = (d.getDay() + 6) % 7; // Mon=0

      result.push({
        label: DAY_LABELS[dayIndex],
        scorePct: log?.fuel_score ?? (log?.total_calories && calorieTarget > 0
          ? Math.min(100, Math.round((log.total_calories / calorieTarget) * 100))
          : 0),
        isToday: i === 0,
      });
    }
    return result;
  }, [weekLogs, todayStr, calorieTarget]);

  // ── Water mutation ─────────────────────────────────────────────────────────
  const waterMutation = useMutation({
    mutationFn: async (addMl: number) => {
      if (!dailyLog?.id) {
        const { data, error } = await supabase
          .from('daily_logs')
          .upsert({
            user_id: user!.id,
            date: todayStr,
            water_ml: addMl,
            total_calories: 0, total_protein: 0, total_carbs: 0, total_fat: 0,
          }, { onConflict: 'user_id,date' })
          .select()
          .single();
        if (error) throw error;
        return data;
      }
      const newWater = (dailyLog.water_ml ?? 0) + addMl;
      const { error } = await supabase
        .from('daily_logs')
        .update({ water_ml: newWater })
        .eq('id', dailyLog.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['daily-log'] });
    },
  });

  // ── Delete meal ────────────────────────────────────────────────────────────
  const deleteMealMutation = useMutation({
    mutationFn: async (mealId: string) => {
      const { error } = await supabase.from('meals').delete().eq('id', mealId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meals'] });
      queryClient.invalidateQueries({ queryKey: ['daily-log'] });
    },
  });

  // ── Pull to refresh ────────────────────────────────────────────────────────
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['daily-log'] }),
      queryClient.invalidateQueries({ queryKey: ['meals'] }),
      queryClient.invalidateQueries({ queryKey: ['week-logs'] }),
    ]);
    setRefreshing(false);
  }, [queryClient]);

  // ── Derived values ─────────────────────────────────────────────────────────
  const eaten = dailyLog?.total_calories ?? 0;
  const burned = dailyLog?.burned_calories ?? 0;
  const protein = dailyLog?.total_protein ?? 0;
  const carbs = dailyLog?.total_carbs ?? 0;
  const fat = dailyLog?.total_fat ?? 0;
  const water = dailyLog?.water_ml ?? 0;
  const fuelScore = dailyLog?.fuel_score ?? 0;
  const streakDays = profile?.streak_days ?? 0;

  /** First letter of name for avatar — matches webapp .avatar */
  const avatarLetter = (profile?.name ?? 'U').charAt(0).toUpperCase();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: DotFuelColors.black }} edges={['top', 'left', 'right']}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 100 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={DotFuelColors.lime} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* ── HEADER — matches webapp .home-header ──────────────────────── */}
        <Animated.View entering={FadeIn.duration(400)} style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          paddingTop: 16,
          paddingHorizontal: Spacing['2xl'],
          paddingBottom: Spacing.lg,
        }}>
        {/* Left: greeting-sub + greeting-name */}
        <View>
          {/* .greeting-sub — date + greeting, 11px muted uppercase */}
          <Text style={{
            fontSize: 11, color: DotFuelColors.muted, fontWeight: '600',
            letterSpacing: 1.8, textTransform: 'uppercase', opacity: 0.85,
          }}>
            {greeting()}
          </Text>
          {/* .greeting-name — DM Sans, 30px, 900, white, uppercase, -1.5px */}
          <Text style={{
            fontFamily: 'Inter', fontSize: 30, fontWeight: '900',
            color: DotFuelColors.white, textTransform: 'uppercase',
            letterSpacing: -1.5, lineHeight: 32,
          }}>
            {profile?.name || 'YOU'}
          </Text>
          {/* Streak sub-line */}
          {streakDays > 0 && (
            <Text style={{ fontSize: 12, color: DotFuelColors.muted, fontWeight: '500', marginTop: 1 }}>
              <Text style={{ color: DotFuelColors.lime }}>
                {streakDays} day streak 🔥
              </Text>
            </Text>
          )}
        </View>

        {/* Right: .avatar — 40×40 lime circle with initial letter */}
        <View style={{
          width: 40, height: 40, borderRadius: 20,
          backgroundColor: DotFuelColors.lime,
          alignItems: 'center', justifyContent: 'center',
        }}>
          <Text style={{
            fontFamily: 'Inter', fontSize: 17, fontWeight: '900',
            color: DotFuelColors.black,
          }}>
            {avatarLetter}
          </Text>
        </View>
      </Animated.View>

      {/* ── FUEL DOT — matches webapp .dot-section ────────────────────── */}
      <Animated.View entering={FadeInDown.delay(100).duration(400)} style={{
        alignItems: 'center', paddingHorizontal: Spacing['2xl'], paddingBottom: Spacing.xl,
      }}>
        <FuelDot score={fuelScore} size={150} />

        {/* .fuel-date — date below dot, matches webapp */}
        <Text style={{
          fontSize: 11, color: DotFuelColors.muted, fontWeight: '700',
          letterSpacing: 1, textTransform: 'uppercase', marginTop: 10,
        }}>
          {formatDate()}
        </Text>

        {/* Score hint when zero — matches webapp #score-zero-hint */}
        {fuelScore === 0 && (
          <Text style={{
            fontSize: 11, color: DotFuelColors.muted, fontWeight: '600',
            textAlign: 'center', marginTop: 4, letterSpacing: 0.3,
          }}>
            Log a meal to start scoring
          </Text>
        )}
      </Animated.View>

      {/* ── CALORIE SUMMARY ───────────────────────────────────────────── */}
      <Animated.View entering={FadeInDown.delay(150).duration(400)} style={{ marginBottom: Spacing.md }}>
        <CalorieSummary eaten={eaten} target={calorieTarget} burned={burned} />
      </Animated.View>

      {/* ── MACROS ────────────────────────────────────────────────────── */}
      <Animated.View entering={FadeInDown.delay(200).duration(400)} style={{ marginBottom: Spacing.md }}>
        <MacroBars
          protein={{ current: protein, target: proteinTarget }}
          carbs={{ current: carbs, target: carbsTarget }}
          fat={{ current: fat, target: fatTarget }}
        />
      </Animated.View>

      {/* ── WEEK DOTS ─────────────────────────────────────────────────── */}
      <Animated.View entering={FadeInDown.delay(250).duration(400)}>
        <WeekDots days={weekDays} />
      </Animated.View>

      {/* ── WATER ─────────────────────────────────────────────────────── */}
      <Animated.View entering={FadeInDown.delay(300).duration(400)} style={{ marginBottom: Spacing.md }}>
        <WaterCard
          currentMl={water}
          goalMl={waterGoal}
          onAdd={(ml) => waterMutation.mutate(ml)}
        />
      </Animated.View>

      {/* ── TODAY'S MEALS ─────────────────────────────────────────────── */}
      <Animated.View entering={FadeInDown.delay(350).duration(400)} style={{
        marginHorizontal: Spacing['2xl'], marginBottom: Spacing.md,
      }}>
        {/* Section header — matches webapp .section-header */}
        <View style={{
          flexDirection: 'row', justifyContent: 'space-between',
          alignItems: 'center', marginBottom: 10,
        }}>
          {/* .section-label — 10px, 800, 2px letter-spacing, uppercase, muted */}
          <Text style={{
            fontSize: 10, fontWeight: '800', color: DotFuelColors.muted,
            textTransform: 'uppercase', letterSpacing: 2,
          }}>
            Today's Meals
          </Text>

          {/* .section-add — 28×28 lime circle with "+" matching webapp */}
          <Pressable
            onPress={() => router.push('/(tabs)/(log)')}
            style={({ pressed }) => ({
              width: 28, height: 28, borderRadius: 14,
              backgroundColor: DotFuelColors.lime,
              alignItems: 'center', justifyContent: 'center',
              opacity: pressed ? 0.85 : 1,
            })}
          >
            <Text style={{
              fontFamily: 'Inter', fontSize: 18, fontWeight: '900',
              color: DotFuelColors.black, lineHeight: 20,
            }}>
              +
            </Text>
          </Pressable>
        </View>

        {meals.length > 0 ? (
          <View style={{ gap: 8 }}>
            {meals.map((meal) => (
              <MealItem
                key={meal.id}
                meal={meal}
                onDelete={(id) => deleteMealMutation.mutate(id)}
              />
            ))}
          </View>
        ) : (
          // Empty state — matches webapp #meals-empty-state
          <View style={{
            backgroundColor: DotFuelColors.card, borderRadius: Radius.lg,
            padding: 20, alignItems: 'center',
            borderWidth: 1, borderStyle: 'dashed', borderColor: DotFuelColors.limeMuted,
          }}>
            <Text style={{ fontSize: 24, marginBottom: 8 }}>🍽️</Text>
            <Text style={{
              fontSize: 13, fontWeight: '700', color: DotFuelColors.white,
              marginBottom: 4, textAlign: 'center',
            }}>
              No meals logged yet
            </Text>
            <Text style={{
              fontSize: 11, color: DotFuelColors.muted, marginBottom: 14,
              textAlign: 'center',
            }}>
              Log your first meal to start tracking your fuel score
            </Text>
            <Pressable
              onPress={() => router.push('/(tabs)/(log)')}
              style={({ pressed }) => ({
                backgroundColor: DotFuelColors.lime, borderRadius: 10,
                paddingVertical: 9, paddingHorizontal: 20,
                opacity: pressed ? 0.88 : 1,
              })}
            >
              <Text style={{
                fontFamily: 'Inter', fontSize: 12, fontWeight: '800',
                color: DotFuelColors.black, textTransform: 'uppercase', letterSpacing: 0.5,
              }}>
                + Log a Meal
              </Text>
            </Pressable>
          </View>
        )}
      </Animated.View>
    </ScrollView>
    </SafeAreaView>
  );
}
