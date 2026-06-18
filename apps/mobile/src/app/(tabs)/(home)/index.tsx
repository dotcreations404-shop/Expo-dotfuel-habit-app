/**
 * Home screen — the main DotFuel dashboard.
 * Matches webapp layout exactly:
 *   - Header: greeting-sub (date) + greeting-name on left, avatar on right
 *   - Fuel dot with date label below
 *   - Calorie summary, macro bars, week dots, water, meals
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { View, ScrollView, RefreshControl, Pressable, TextInput, Alert, Modal, ActivityIndicator } from 'react-native';
import { Text } from '@/components/ui/text';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';

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

function getMealType(): string {
  const h = new Date().getHours();
  if (h < 11) return 'breakfast';
  if (h < 15) return 'lunch';
  if (h < 19) return 'dinner';
  return 'snack';
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

  // ── Quick Log Meal State ───────────────────────────────────────────────────
  const [showQuickMealForm, setShowQuickMealForm] = useState(false);
  const [quickMealName, setQuickMealName] = useState('');
  const [quickMealCals, setQuickMealCals] = useState('');
  const [quickMealProtein, setQuickMealProtein] = useState('');
  const [quickMealCarbs, setQuickMealCarbs] = useState('');
  const [quickMealFat, setQuickMealFat] = useState('');

  // ── Log Activity State ─────────────────────────────────────────────────────
  const [showActivityModal, setShowActivityModal] = useState(false);
  const [activityName, setActivityName] = useState('');
  const [activityDuration, setActivityDuration] = useState('');
  const [activityCals, setActivityCals] = useState('');
  const [selectedPreset, setSelectedPreset] = useState({ name: 'Running', emoji: '🏃', calsPerMin: 10 });

  // ── Strava Sync State ──────────────────────────────────────────────────────
  const [stravaSyncing, setStravaSyncing] = useState(false);
  const [stravaActivities, setStravaActivities] = useState<any[]>([]);
  const [showStravaList, setShowStravaList] = useState(false);

  // Presets configuration
  const presets = [
    { name: 'Running', emoji: '🏃', calsPerMin: 10 },
    { name: 'Cycling', emoji: '🚴', calsPerMin: 8 },
    { name: 'Weights', emoji: '🏋️', calsPerMin: 5 },
    { name: 'Swimming', emoji: '🏊', calsPerMin: 9 },
    { name: 'Yoga', emoji: '🧘', calsPerMin: 3 },
    { name: 'Walking', emoji: '🚶', calsPerMin: 4 },
    { name: 'HIIT', emoji: '⚡', calsPerMin: 12 },
    { name: 'Custom', emoji: '✏️', calsPerMin: 0 }
  ];

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

  // ── Fetch today's activities ──────────────────────────────────────────────
  const { data: activities = [], refetch: refetchActivities } = useQuery({
    queryKey: ['activities', user?.id, todayStr],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from('activity_entries')
        .select('*')
        .eq('user_id', user.id)
        .eq('logged_at', todayStr)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
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

  // ── Recalculate & Save Daily Totals Helper ─────────────────────────────────
  const recalculateAndSaveDailyTotals = async (logId: string) => {
    try {
      const { data: mealsData } = await supabase
        .from('meals')
        .select('calories, protein, carbs, fat')
        .eq('daily_log_id', logId);

      const eaten = mealsData?.reduce((s, m) => s + (m.calories || 0), 0) || 0;
      const protein = mealsData?.reduce((s, m) => s + (m.protein || 0), 0) || 0;
      const carbs = mealsData?.reduce((s, m) => s + (m.carbs || 0), 0) || 0;
      const fat = mealsData?.reduce((s, m) => s + (m.fat || 0), 0) || 0;

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

      // Fuel score: multi-factor calculation
      const calorieScore = eaten > 0 ? Math.min(40, Math.round(40 * (1 - Math.abs(eaten - calorieTarget) / calorieTarget))) : 0;
      const proteinScore = proteinTarget > 0 ? Math.min(25, Math.round(25 * Math.min(1, protein / proteinTarget))) : 0;
      const waterScore = waterGoal > 0 ? Math.min(20, Math.round(20 * Math.min(1, water / waterGoal))) : 0;
      const activityScore = activeCals > 0 ? Math.min(15, Math.round(15 * Math.min(1, activeCals / 300))) : 0;
      const score = Math.max(0, calorieScore + proteinScore + waterScore + activityScore);
      const dotColor = score >= 85 ? 'lime' : score >= 65 ? 'green' : score >= 40 ? 'blue' : 'red';

      await supabase
        .from('daily_logs')
        .update({
          total_calories: eaten,
          total_protein: protein,
          total_carbs: carbs,
          total_fat: fat,
          active_calories: activeCals,
          fuel_score: score,
          dot_color: dotColor,
        })
        .eq('id', logId);

      // Invalidate queries to trigger refresh
      queryClient.invalidateQueries({ queryKey: ['daily-log'] });
      queryClient.invalidateQueries({ queryKey: ['meals'] });
      queryClient.invalidateQueries({ queryKey: ['week-logs'] });
      queryClient.invalidateQueries({ queryKey: ['activities'] });

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

  // ── Water mutation ─────────────────────────────────────────────────────────
  const waterMutation = useMutation({
    mutationFn: async (addMl: number) => {
      let logId = dailyLog?.id;
      if (!logId) {
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
        logId = data.id;
      } else {
        const newWater = (dailyLog!.water_ml ?? 0) + addMl;
        const { error } = await supabase
          .from('daily_logs')
          .update({ water_ml: newWater })
          .eq('id', logId);
        if (error) throw error;
      }
      await recalculateAndSaveDailyTotals(logId!);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['daily-log'] });
    },
  });

  // ── Quick Log Meal Mutation ────────────────────────────────────────────────
  const quickLogMealMutation = useMutation({
    mutationFn: async () => {
      const cals = parseInt(quickMealCals, 10);
      if (isNaN(cals) || cals <= 0) throw new Error('Please enter valid calories');

      let logId = dailyLog?.id;
      if (!logId) {
        const { data, error } = await supabase
          .from('daily_logs')
          .insert({
            user_id: user!.id,
            date: todayStr,
            total_calories: 0, total_protein: 0, total_carbs: 0, total_fat: 0,
          })
          .select()
          .single();
        if (error) throw error;
        logId = data.id;
      }

      const p = parseInt(quickMealProtein, 10) || 0;
      const c = parseInt(quickMealCarbs, 10) || 0;
      const f = parseInt(quickMealFat, 10) || 0;

      const { error: insertErr } = await supabase
        .from('meals')
        .insert({
          user_id: user!.id,
          daily_log_id: logId,
          name: quickMealName.trim() || 'Quick Meal',
          emoji: '🍽️',
          calories: cals,
          protein: p,
          carbs: c,
          fat: f,
          source: 'manual',
          meal_time: getMealType(),
        });
      if (insertErr) throw insertErr;

      await recalculateAndSaveDailyTotals(logId!);
    },
    onSuccess: () => {
      setQuickMealName('');
      setQuickMealCals('');
      setQuickMealProtein('');
      setQuickMealCarbs('');
      setQuickMealFat('');
      setShowQuickMealForm(false);
      if (process.env.EXPO_OS === 'ios') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    },
    onError: (err) => {
      Alert.alert('Error', err.message);
    }
  });

  // ── Log Activity Mutation ──────────────────────────────────────────────────
  const logActivityMutation = useMutation({
    mutationFn: async () => {
      const burned = parseInt(activityCals, 10);
      const name = activityName.trim();
      if (!name || isNaN(burned) || burned <= 0) throw new Error('Please enter a valid activity name and calories');

      let logId = dailyLog?.id;
      if (!logId) {
        const { data, error } = await supabase
          .from('daily_logs')
          .insert({
            user_id: user!.id,
            date: todayStr,
            total_calories: 0, total_protein: 0, total_carbs: 0, total_fat: 0,
          })
          .select()
          .single();
        if (error) throw error;
        logId = data.id;
      }

      const dur = parseInt(activityDuration, 10) || null;

      const { error } = await supabase
        .from('activity_entries')
        .insert({
          user_id: user!.id,
          name,
          emoji: selectedPreset.emoji,
          duration_min: dur,
          calories_burned: burned,
          meta: dur ? `${dur} min` : 'Custom',
          logged_at: todayStr,
          source: 'manual'
        });

      if (error) throw error;

      await recalculateAndSaveDailyTotals(logId!);
    },
    onSuccess: () => {
      setActivityName('');
      setActivityDuration('');
      setActivityCals('');
      setShowActivityModal(false);
      if (process.env.EXPO_OS === 'ios') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    },
    onError: (err) => {
      Alert.alert('Error', err.message);
    }
  });

  // ── Sync Strava Pipeline ───────────────────────────────────────────────────
  const syncStrava = async () => {
    setStravaSyncing(true);
    try {
      let token = '0f355e347c8908a11ddb3b689954b10c7608c297';
      let resp = await fetch(
        'https://www.strava.com/api/v3/athlete/activities?per_page=5',
        { headers: { 'Authorization': 'Bearer ' + token } }
      );

      if (resp.status === 401) {
        const refreshResp = await fetch('https://www.strava.com/oauth/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            client_id: '213839',
            client_secret: '7994741bfd5a88a1b4f805286e3783b2fa2cf004',
            refresh_token: '0eb12783dbf8d2094142c982243e7a074ec52722',
            grant_type: 'refresh_token'
          })
        });
        const refreshData = await refreshResp.json();
        if (refreshData.access_token) {
          token = refreshData.access_token;
          resp = await fetch(
            'https://www.strava.com/api/v3/athlete/activities?per_page=5',
            { headers: { 'Authorization': 'Bearer ' + token } }
          );
        }
      }

      if (resp.ok) {
        const data = await resp.json();
        if (Array.isArray(data)) {
          setStravaActivities(data);
          setShowStravaList(true);
          if (process.env.EXPO_OS === 'ios') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } else {
          Alert.alert('Strava Sync', 'No recent activities found.');
        }
      } else {
        Alert.alert('Sync Failed', 'Could not fetch from Strava.');
      }
    } catch (err) {
      console.warn(err);
      Alert.alert('Error', 'Strava connection failed.');
    } finally {
      setStravaSyncing(false);
    }
  };

  const logStravaActivity = async (act: any) => {
    try {
      const cals = act.kilojoules ? Math.round(act.kilojoules * 0.239) : Math.round((act.moving_time / 60) * 8);
      const typeEmoji: any = { Run: '🏃', Ride: '🚴', Swim: '🏊', Walk: '🚶', Hike: '🥾', WeightTraining: '🏋️', Yoga: '🧘' };
      const emoji = typeEmoji[act.type] || '🏅';
      const duration = Math.round(act.moving_time / 60);

      let logId = dailyLog?.id;
      if (!logId) {
        const { data, error } = await supabase
          .from('daily_logs')
          .insert({
            user_id: user!.id,
            date: todayStr,
            total_calories: 0, total_protein: 0, total_carbs: 0, total_fat: 0,
          })
          .select()
          .single();
        if (error) throw error;
        logId = data.id;
      }

      const { error } = await supabase
        .from('activity_entries')
        .insert({
          user_id: user!.id,
          name: act.name,
          emoji,
          duration_min: duration,
          calories_burned: cals,
          meta: `${duration} min`,
          logged_at: todayStr,
          source: 'strava'
        });

      if (error) throw error;

      await recalculateAndSaveDailyTotals(logId!);
      setStravaActivities(prev => prev.filter(a => a.id !== act.id));
      if (process.env.EXPO_OS === 'ios') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Logged', `${act.name} has been copied to your activities!`);
    } catch (err: any) {
      Alert.alert('Error', err.message);
    }
  };

  // ── Delete meal ────────────────────────────────────────────────────────────
  const deleteMealMutation = useMutation({
    mutationFn: async (mealId: string) => {
      const { error } = await supabase.from('meals').delete().eq('id', mealId);
      if (error) throw error;
      if (dailyLog?.id) {
        await recalculateAndSaveDailyTotals(dailyLog.id);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meals'] });
      queryClient.invalidateQueries({ queryKey: ['daily-log'] });
    },
  });

  // ── Delete activity ────────────────────────────────────────────────────────
  const deleteActivityMutation = useMutation({
    mutationFn: async (actId: string) => {
      const { error } = await supabase.from('activity_entries').delete().eq('id', actId);
      if (error) throw error;
      if (dailyLog?.id) {
        await recalculateAndSaveDailyTotals(dailyLog.id);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['activities'] });
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
      queryClient.invalidateQueries({ queryKey: ['activities'] }),
    ]);
    setRefreshing(false);
  }, [queryClient]);

  // ── Derived values ─────────────────────────────────────────────────────────
  const eaten = dailyLog?.total_calories ?? 0;
  const dbBurned = dailyLog?.active_calories ?? 0;
  const localBurned = activities?.reduce((s: number, a: any) => s + (a.calories_burned || 0), 0) || 0;
  const burned = dbBurned || localBurned; // Resilient sum

  const protein = dailyLog?.total_protein ?? 0;
  const carbs = dailyLog?.total_carbs ?? 0;
  const fat = dailyLog?.total_fat ?? 0;
  const water = dailyLog?.water_ml ?? 0;
  const fuelScore = dailyLog?.fuel_score ?? 0;
  const streakDays = profile?.streak_days ?? 0;

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
        {/* ── HEADER ──────────────────────── */}
        <Animated.View entering={FadeIn.duration(400)} style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          paddingTop: 16,
          paddingHorizontal: Spacing['2xl'],
          paddingBottom: Spacing.lg,
        }}>
          <View>
            <Text style={{
              fontSize: 11, color: DotFuelColors.muted, fontWeight: '600',
              letterSpacing: 1.8, textTransform: 'uppercase', opacity: 0.85,
            }}>
              {greeting()}
            </Text>
            <Text style={{
              fontFamily: 'Inter', fontSize: 30, fontWeight: '900',
              color: DotFuelColors.white, textTransform: 'uppercase',
              letterSpacing: -1.5, lineHeight: 32,
            }}>
              {profile?.name || 'YOU'}
            </Text>
            {streakDays > 0 && (
              <Text style={{ fontSize: 12, color: DotFuelColors.muted, fontWeight: '500', marginTop: 1 }}>
                <Text style={{ color: DotFuelColors.lime }}>
                  {streakDays} day streak 🔥
                </Text>
              </Text>
            )}
          </View>

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

        {/* ── FUEL DOT ────────────────────── */}
        <Animated.View entering={FadeInDown.delay(100).duration(400)} style={{
          alignItems: 'center', paddingHorizontal: Spacing['2xl'], paddingBottom: Spacing.xl,
        }}>
          <FuelDot score={fuelScore} size={150} />
          <Text style={{
            fontSize: 11, color: DotFuelColors.muted, fontWeight: '700',
            letterSpacing: 1, textTransform: 'uppercase', marginTop: 10,
          }}>
            {formatDate()}
          </Text>
          {fuelScore === 0 && (
            <Text style={{
              fontSize: 11, color: DotFuelColors.muted, fontWeight: '600',
              textAlign: 'center', marginTop: 4, letterSpacing: 0.3,
            }}>
              Log a meal or activity to start scoring
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

        {/* ── EXERCISE / ACTIVITIES CARD ────────────────────────────────── */}
        <Animated.View entering={FadeInDown.delay(320).duration(400)} style={{
          backgroundColor: DotFuelColors.card, borderRadius: Radius['2xl'],
          padding: 20, marginHorizontal: Spacing['2xl'], marginBottom: Spacing.md,
          borderWidth: 1, borderColor: DotFuelColors.cardBorder,
        }}>
          {/* Header */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Text style={{ fontSize: 22 }}>🏃</Text>
              <View>
                <Text style={{ fontFamily: 'Inter', fontSize: 15, fontWeight: '900', color: DotFuelColors.white }}>ACTIVITIES</Text>
                <Text style={{ fontSize: 11, color: DotFuelColors.muted, fontWeight: '600' }}>Calories burned today</Text>
              </View>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Pressable
                onPress={() => syncStrava()}
                disabled={stravaSyncing}
                style={{
                  backgroundColor: DotFuelColors.stravaLight, borderWidth: 1, borderColor: 'rgba(252,76,2,0.2)',
                  paddingVertical: 5, paddingHorizontal: 12, borderRadius: 8,
                }}
              >
                <Text style={{ fontSize: 11, fontWeight: '800', color: DotFuelColors.strava, textTransform: 'uppercase' }}>
                  {stravaSyncing ? 'Syncing...' : '↻ Strava'}
                </Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  setSelectedPreset(presets[0]);
                  setActivityName(presets[0].name);
                  setActivityDuration('');
                  setActivityCals('');
                  setShowActivityModal(true);
                }}
                style={{
                  width: 28, height: 28, borderRadius: 14, backgroundColor: DotFuelColors.lime,
                  alignItems: 'center', justifyContent: 'center',
                }}
              >
                <Text style={{ fontFamily: 'Inter', fontSize: 18, fontWeight: '900', color: DotFuelColors.black, lineHeight: 20 }}>+</Text>
              </Pressable>
            </View>
          </View>

          {/* Strava activities waiting to be logged */}
          {showStravaList && stravaActivities.length > 0 && (
            <View style={{
              backgroundColor: 'rgba(252,76,2,0.06)', borderRadius: 12,
              borderWidth: 1, borderColor: 'rgba(252,76,2,0.15)',
              padding: 12, gap: 10, marginBottom: 12
            }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={{ fontSize: 11, fontWeight: '800', color: DotFuelColors.strava, letterSpacing: 0.5 }}>RECENT STRAVA WORKOUTS</Text>
                <Pressable onPress={() => setShowStravaList(false)}>
                  <Text style={{ fontSize: 10, fontWeight: '800', color: DotFuelColors.muted }}>HIDE</Text>
                </Pressable>
              </View>
              {stravaActivities.map((act) => {
                const actCals = act.kilojoules ? Math.round(act.kilojoules * 0.239) : Math.round((act.moving_time / 60) * 8);
                const actDur = Math.round(act.moving_time / 60);
                return (
                  <View key={act.id} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: DotFuelColors.surface, padding: 10, borderRadius: 8 }}>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 13, fontWeight: '700', color: DotFuelColors.white }}>{act.name}</Text>
                      <Text style={{ fontSize: 10, color: DotFuelColors.muted, marginTop: 1 }}>{actDur} min • {actCals} kcal</Text>
                    </View>
                    <Pressable
                      onPress={() => logStravaActivity(act)}
                      style={{ backgroundColor: DotFuelColors.strava, paddingVertical: 5, paddingHorizontal: 12, borderRadius: 6 }}
                    >
                      <Text style={{ fontSize: 10, fontWeight: '800', color: DotFuelColors.white }}>LOG</Text>
                    </Pressable>
                  </View>
                );
              })}
            </View>
          )}

          {/* Activities List */}
          <View style={{ gap: 8, marginBottom: 14 }}>
            {activities.length > 0 ? (
              activities.map((act: any) => (
                <View key={act.id} style={{
                  flexDirection: 'row', alignItems: 'center', gap: 12,
                  backgroundColor: DotFuelColors.surface, borderRadius: Radius.lg,
                  padding: 12, borderWidth: 1, borderColor: DotFuelColors.cardBorder
                }}>
                  <Text style={{ fontSize: 20 }}>{act.emoji || '🏅'}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 13, fontWeight: '700', color: DotFuelColors.white }}>{act.name}</Text>
                    <Text style={{ fontSize: 10, color: DotFuelColors.muted, marginTop: 1 }}>{act.meta || 'Custom'}</Text>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <Text style={{ fontSize: 13, fontWeight: '800', color: DotFuelColors.orange }}>{act.calories_burned} kcal</Text>
                    <Pressable onPress={() => deleteActivityMutation.mutate(act.id)}>
                      <Text style={{ fontSize: 14, color: DotFuelColors.red, fontWeight: 'bold', paddingHorizontal: 6 }}>✕</Text>
                    </Pressable>
                  </View>
                </View>
              ))
            ) : (
              <Text style={{ textAlign: 'center', fontSize: 11, color: DotFuelColors.muted, paddingVertical: 12, fontWeight: '600' }}>
                No activities logged yet. Tap + to add one.
              </Text>
            )}
          </View>

          {/* Net Calories row */}
          <View style={{
            flexDirection: 'row', justifyContent: 'space-between',
            borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.06)',
            paddingTop: 12, marginTop: 4,
          }}>
            <View style={{ alignItems: 'center', flex: 1 }}>
              <Text style={{ fontSize: 14, fontWeight: '900', color: DotFuelColors.lime }}>{eaten}</Text>
              <Text style={{ fontSize: 9, color: DotFuelColors.muted, fontWeight: '700', letterSpacing: 0.5, marginTop: 2 }}>EATEN</Text>
            </View>
            <View style={{ width: 1, backgroundColor: 'rgba(255,255,255,0.06)' }} />
            <View style={{ alignItems: 'center', flex: 1 }}>
              <Text style={{ fontSize: 14, fontWeight: '900', color: DotFuelColors.orange }}>{burned}</Text>
              <Text style={{ fontSize: 9, color: DotFuelColors.muted, fontWeight: '700', letterSpacing: 0.5, marginTop: 2 }}>BURNED</Text>
            </View>
            <View style={{ width: 1, backgroundColor: 'rgba(255,255,255,0.06)' }} />
            <View style={{ alignItems: 'center', flex: 1 }}>
              <Text style={{ fontSize: 14, fontWeight: '900', color: DotFuelColors.white }}>{Math.max(0, eaten - burned)}</Text>
              <Text style={{ fontSize: 9, color: DotFuelColors.muted, fontWeight: '700', letterSpacing: 0.5, marginTop: 2 }}>NET CALS</Text>
            </View>
          </View>
        </Animated.View>

        {/* ── QUICK MEAL ENTRY SECTION ────────────────────────────────── */}
        <Animated.View entering={FadeInDown.delay(340).duration(400)} style={{
          marginHorizontal: Spacing['2xl'], marginBottom: Spacing.md
        }}>
          <Pressable
            onPress={() => {
              setShowQuickMealForm(!showQuickMealForm);
              if (process.env.EXPO_OS === 'ios') Haptics.selectionAsync();
            }}
            style={{
              backgroundColor: DotFuelColors.limeLight, borderWidth: 1, borderColor: 'rgba(194,240,0,0.15)',
              borderRadius: Radius.lg, paddingVertical: 12, alignItems: 'center',
            }}
          >
            <Text style={{ fontFamily: 'Inter', fontSize: 12, fontWeight: '800', color: DotFuelColors.lime, textTransform: 'uppercase', letterSpacing: 0.5 }}>
              {showQuickMealForm ? '✕ Close Quick Logger' : '✏️ Quick Log Meal / Calories'}
            </Text>
          </Pressable>

          {showQuickMealForm && (
            <Animated.View entering={FadeIn.duration(200)} style={{
              backgroundColor: DotFuelColors.card, borderRadius: Radius.xl,
              padding: 16, marginTop: 10, borderWidth: 1, borderColor: DotFuelColors.cardBorder,
              gap: 10
            }}>
              <TextInput
                value={quickMealName}
                onChangeText={setQuickMealName}
                placeholder="Meal Name (e.g. Oats with milk)"
                placeholderTextColor={DotFuelColors.muted}
                style={{
                  backgroundColor: DotFuelColors.surface, color: DotFuelColors.white,
                  borderRadius: 10, padding: 12, fontSize: 14,
                  borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)'
                }}
              />
              <TextInput
                value={quickMealCals}
                onChangeText={setQuickMealCals}
                placeholder="Calories (Required)"
                placeholderTextColor={DotFuelColors.muted}
                keyboardType="numeric"
                style={{
                  backgroundColor: DotFuelColors.surface, color: DotFuelColors.lime,
                  borderRadius: 10, padding: 12, fontSize: 20, fontWeight: '900',
                  textAlign: 'center', fontFamily: 'Inter',
                  borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)'
                }}
              />
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {[
                  { label: 'Protein (g)', val: quickMealProtein, set: setQuickMealProtein },
                  { label: 'Carbs (g)', val: quickMealCarbs, set: setQuickMealCarbs },
                  { label: 'Fat (g)', val: quickMealFat, set: setQuickMealFat }
                ].map((input) => (
                  <View key={input.label} style={{ flex: 1 }}>
                    <TextInput
                      value={input.val}
                      onChangeText={input.set}
                      placeholder="0"
                      placeholderTextColor={DotFuelColors.muted}
                      keyboardType="numeric"
                      style={{
                        backgroundColor: DotFuelColors.surface, color: DotFuelColors.white,
                        borderRadius: 8, padding: 10, fontSize: 14, fontWeight: '700',
                        textAlign: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)'
                      }}
                    />
                    <Text style={{ fontSize: 9, color: DotFuelColors.muted, fontWeight: '700', textAlign: 'center', marginTop: 4 }}>{input.label}</Text>
                  </View>
                ))}
              </View>
              <Pressable
                onPress={() => quickLogMealMutation.mutate()}
                disabled={quickLogMealMutation.isPending || !quickMealCals}
                style={({ pressed }) => ({
                  backgroundColor: DotFuelColors.lime, borderRadius: 12,
                  paddingVertical: 14, alignItems: 'center', justifyContent: 'center',
                  opacity: pressed ? 0.85 : 1, marginTop: 4
                })}
              >
                <Text style={{ fontFamily: 'Inter', fontSize: 13, fontWeight: '900', color: DotFuelColors.black }}>
                  {quickLogMealMutation.isPending ? 'LOGGING...' : 'LOG MEAL →'}
                </Text>
              </Pressable>
            </Animated.View>
          )}
        </Animated.View>

        {/* ── TODAY'S MEALS ─────────────────────────────────────────────── */}
        <Animated.View entering={FadeInDown.delay(350).duration(400)} style={{
          marginHorizontal: Spacing['2xl'], marginBottom: Spacing.md,
        }}>
          <View style={{
            flexDirection: 'row', justifyContent: 'space-between',
            alignItems: 'center', marginBottom: 10,
          }}>
            <Text style={{
              fontSize: 10, fontWeight: '800', color: DotFuelColors.muted,
              textTransform: 'uppercase', letterSpacing: 2,
            }}>
              Today's Meals
            </Text>

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

      {/* ── ACTIVITY LOG MODAL (MANUAL ENTRY) ── */}
      <Modal
        visible={showActivityModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowActivityModal(false)}
      >
        <View style={{
          flex: 1, backgroundColor: 'rgba(0,0,0,0.85)',
          justifyContent: 'flex-end'
        }}>
          <View style={{
            backgroundColor: DotFuelColors.card,
            borderTopLeftRadius: 24, borderTopRightRadius: 24,
            padding: 24, gap: 16,
            borderWidth: 1, borderColor: DotFuelColors.cardBorder
          }}>
            {/* Grab handle */}
            <View style={{ width: 40, height: 4, backgroundColor: DotFuelColors.surface, borderRadius: 2, alignSelf: 'center', marginBottom: 4 }} />

            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={{ fontFamily: 'Inter', fontSize: 18, fontWeight: '900', color: DotFuelColors.white }}>🏃 Log Activity</Text>
              <Pressable onPress={() => setShowActivityModal(false)}>
                <Text style={{ fontSize: 20, color: DotFuelColors.muted, fontWeight: 'bold' }}>✕</Text>
              </Pressable>
            </View>

            {/* Presets Grid */}
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginVertical: 4 }}>
              {presets.map((p) => {
                const isSel = selectedPreset.name === p.name;
                return (
                  <Pressable
                    key={p.name}
                    onPress={() => {
                      setSelectedPreset(p);
                      setActivityName(p.name === 'Custom' ? '' : p.name);
                      if (activityDuration && p.calsPerMin > 0) {
                        setActivityCals(String(Math.round(parseInt(activityDuration, 10) * p.calsPerMin)));
                      }
                      if (process.env.EXPO_OS === 'ios') Haptics.selectionAsync();
                    }}
                    style={{
                      paddingVertical: 8, paddingHorizontal: 12, borderRadius: 10,
                      backgroundColor: isSel ? 'rgba(194,240,0,0.15)' : DotFuelColors.surface,
                      borderWidth: 1, borderColor: isSel ? DotFuelColors.lime : 'rgba(255,255,255,0.05)',
                      alignItems: 'center', minWidth: '22%'
                    }}
                  >
                    <Text style={{ fontSize: 16, marginBottom: 2 }}>{p.emoji}</Text>
                    <Text style={{ fontSize: 10, fontWeight: '700', color: isSel ? DotFuelColors.lime : DotFuelColors.text }}>{p.name}</Text>
                  </Pressable>
                );
              })}
            </View>

            {/* Fields */}
            <View style={{ gap: 12 }}>
              <View style={{ gap: 4 }}>
                <Text style={{ fontSize: 11, fontWeight: '700', color: DotFuelColors.muted, textTransform: 'uppercase' }}>Activity Name</Text>
                <TextInput
                  value={activityName}
                  onChangeText={setActivityName}
                  placeholder="e.g. Hiking, Basketball"
                  placeholderTextColor={DotFuelColors.muted}
                  style={{
                    backgroundColor: DotFuelColors.surface, color: DotFuelColors.white,
                    borderRadius: 12, padding: 14, fontSize: 14, fontWeight: '600',
                    borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)'
                  }}
                />
              </View>

              <View style={{ flexDirection: 'row', gap: 12 }}>
                <View style={{ flex: 1, gap: 4 }}>
                  <Text style={{ fontSize: 11, fontWeight: '700', color: DotFuelColors.muted, textTransform: 'uppercase' }}>Duration (min)</Text>
                  <TextInput
                    value={activityDuration}
                    onChangeText={(val) => {
                      setActivityDuration(val);
                      const min = parseInt(val, 10);
                      if (!isNaN(min) && selectedPreset.calsPerMin > 0) {
                        setActivityCals(String(Math.round(min * selectedPreset.calsPerMin)));
                      }
                    }}
                    placeholder="30"
                    placeholderTextColor={DotFuelColors.muted}
                    keyboardType="numeric"
                    style={{
                      backgroundColor: DotFuelColors.surface, color: DotFuelColors.white,
                      borderRadius: 12, padding: 14, fontSize: 16, fontWeight: '800',
                      borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)'
                    }}
                  />
                </View>

                <View style={{ flex: 1, gap: 4 }}>
                  <Text style={{ fontSize: 11, fontWeight: '700', color: DotFuelColors.muted, textTransform: 'uppercase' }}>Calories Burned</Text>
                  <TextInput
                    value={activityCals}
                    onChangeText={setActivityCals}
                    placeholder="200"
                    placeholderTextColor={DotFuelColors.muted}
                    keyboardType="numeric"
                    style={{
                      backgroundColor: DotFuelColors.surface, color: DotFuelColors.orange,
                      borderRadius: 12, padding: 14, fontSize: 16, fontWeight: '900',
                      borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)'
                    }}
                  />
                </View>
              </View>
            </View>

            <Pressable
              onPress={() => logActivityMutation.mutate()}
              disabled={logActivityMutation.isPending || !activityName || !activityCals}
              style={({ pressed }) => ({
                backgroundColor: DotFuelColors.lime, borderRadius: 14,
                paddingVertical: 15, alignItems: 'center', justifyContent: 'center',
                opacity: pressed ? 0.85 : 1, marginTop: 8
              })}
            >
              <Text style={{ fontFamily: 'Inter', fontSize: 13, fontWeight: '900', color: DotFuelColors.black }}>
                {logActivityMutation.isPending ? 'LOGGING...' : 'LOG ACTIVITY →'}
              </Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

