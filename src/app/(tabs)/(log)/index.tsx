/**
 * Log screen — food logging hub with multiple entry methods.
 * Photo AI, Voice, Search, Barcode, Quick-add, Custom food.
 */
import { useState, useCallback } from 'react';
import { View, Text, ScrollView, Pressable, TextInput, Alert, KeyboardAvoidingView } from 'react-native';
import Animated, { FadeInDown, FadeIn, FadeOut } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { Image } from 'expo-image';

import { useAuth } from '@/contexts/auth-context';
import { supabase } from '@/lib/supabase';
import { DotFuelColors, Spacing, Radius } from '@/constants/colors';
import type { DailyLog } from '@/lib/types';

/** Returns YYYY-MM-DD in local timezone. */
function today(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

const LOG_METHODS = [
  { id: 'search', emoji: '🔍', label: 'Search Food', desc: 'FatSecret database', color: DotFuelColors.lime },
  { id: 'photo', emoji: '📸', label: 'Photo AI', desc: 'Snap & estimate', color: DotFuelColors.blue },
  { id: 'barcode', emoji: '📱', label: 'Barcode', desc: 'Scan product', color: DotFuelColors.green },
  { id: 'voice', emoji: '🎙️', label: 'Voice', desc: 'Say what you ate', color: DotFuelColors.orange },
];

const QUICK_FOODS = [
  { emoji: '🍚', name: 'Rice (1 cup)', cal: 200, p: 4, c: 45, f: 0.4 },
  { emoji: '🍗', name: 'Chicken (100g)', cal: 165, p: 31, c: 0, f: 3.6 },
  { emoji: '🥚', name: 'Egg (boiled)', cal: 78, p: 6, c: 0.6, f: 5.3 },
  { emoji: '🫘', name: 'Dal (1 bowl)', cal: 180, p: 12, c: 28, f: 3 },
  { emoji: '🫓', name: 'Roti (1)', cal: 120, p: 3, c: 24, f: 1.4 },
  { emoji: '🍌', name: 'Banana', cal: 105, p: 1.3, c: 27, f: 0.3 },
  { emoji: '🥛', name: 'Milk (250ml)', cal: 150, p: 8, c: 12, f: 8 },
  { emoji: '🥜', name: 'Peanuts (30g)', cal: 170, p: 7, c: 5, f: 14 },
];

export default function LogScreen() {
  const { user, profile } = useAuth();
  const queryClient = useQueryClient();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [showCustom, setShowCustom] = useState(false);
  const [customName, setCustomName] = useState('');
  const [customCal, setCustomCal] = useState('');
  const todayStr = today();

  // ── Get or create today's log ──────────────────────────────────────────────
  const getOrCreateLog = useCallback(async (): Promise<string> => {
    const { data: existing } = await supabase
      .from('daily_logs')
      .select('id')
      .eq('user_id', user!.id)
      .eq('date', todayStr)
      .maybeSingle();

    if (existing?.id) return existing.id;

    const { data, error } = await supabase
      .from('daily_logs')
      .insert({
        user_id: user!.id,
        date: todayStr,
        total_calories: 0, total_protein: 0, total_carbs: 0, total_fat: 0,
      })
      .select('id')
      .single();
    if (error) throw error;
    return data.id;
  }, [user?.id, todayStr]);

  // ── Quick-add mutation ─────────────────────────────────────────────────────
  const quickAddMutation = useMutation({
    mutationFn: async (food: typeof QUICK_FOODS[0]) => {
      const logId = await getOrCreateLog();

      // Insert meal
      const { error: mealErr } = await supabase.from('meals').insert({
        user_id: user!.id,
        daily_log_id: logId,
        name: food.name,
        emoji: food.emoji,
        calories: food.cal,
        protein_g: food.p,
        carbs_g: food.c,
        fat_g: food.f,
        source: 'manual',
        meal_type: getMealType(),
      });
      if (mealErr) throw mealErr;

      // Update totals
      const { data: log } = await supabase
        .from('daily_logs')
        .select('total_calories, total_protein, total_carbs, total_fat')
        .eq('id', logId)
        .single();

      if (log) {
        await supabase.from('daily_logs').update({
          total_calories: (log.total_calories || 0) + food.cal,
          total_protein: (log.total_protein || 0) + food.p,
          total_carbs: (log.total_carbs || 0) + food.c,
          total_fat: (log.total_fat || 0) + food.f,
        }).eq('id', logId);
      }
    },
    onSuccess: () => {
      if (process.env.EXPO_OS === 'ios') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      queryClient.invalidateQueries({ queryKey: ['daily-log'] });
      queryClient.invalidateQueries({ queryKey: ['meals'] });
    },
    onError: (err) => {
      Alert.alert('Error', err.message);
    },
  });

  // ── Custom calorie mutation ────────────────────────────────────────────────
  const customMutation = useMutation({
    mutationFn: async () => {
      const cal = parseInt(customCal, 10);
      if (isNaN(cal) || cal <= 0) throw new Error('Enter a valid calorie amount');

      const logId = await getOrCreateLog();

      await supabase.from('meals').insert({
        user_id: user!.id,
        daily_log_id: logId,
        name: customName || 'Custom Entry',
        emoji: '✏️',
        calories: cal,
        source: 'manual',
        meal_type: getMealType(),
      });

      // Update totals
      const { data: log } = await supabase
        .from('daily_logs')
        .select('total_calories')
        .eq('id', logId)
        .single();

      if (log) {
        await supabase.from('daily_logs').update({
          total_calories: (log.total_calories || 0) + cal,
        }).eq('id', logId);
      }
    },
    onSuccess: () => {
      if (process.env.EXPO_OS === 'ios') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setShowCustom(false);
      setCustomName('');
      setCustomCal('');
      queryClient.invalidateQueries({ queryKey: ['daily-log'] });
      queryClient.invalidateQueries({ queryKey: ['meals'] });
    },
    onError: (err) => {
      Alert.alert('Error', err.message);
    },
  });

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={process.env.EXPO_OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView
        style={{ flex: 1, backgroundColor: DotFuelColors.black }}
        contentContainerStyle={{ paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={{
          paddingTop: 60, paddingHorizontal: Spacing['2xl'],
          paddingBottom: Spacing.md,
        }}>
          <Text style={{
            fontFamily: 'Inter', fontSize: 28, fontWeight: '900',
            color: DotFuelColors.white, letterSpacing: -0.5,
          }}>
            Log Food
          </Text>
          <Text style={{
            fontSize: 13, color: DotFuelColors.muted, fontWeight: '500', marginTop: 4,
          }}>
            Choose how you want to log
          </Text>
        </View>

        {/* Search bar */}
        <View style={{
          marginHorizontal: Spacing['2xl'], marginBottom: Spacing.lg,
        }}>
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={() => {
              if (searchQuery.trim()) {
                router.push({ pathname: '/(tabs)/(log)/search-results', params: { q: searchQuery } });
              }
            }}
            placeholder="Search foods..."
            placeholderTextColor={DotFuelColors.muted}
            returnKeyType="search"
            style={{
              backgroundColor: DotFuelColors.card,
              borderWidth: 1, borderColor: DotFuelColors.surfaceBorder,
              borderRadius: Radius.lg, paddingVertical: 13, paddingHorizontal: 16,
              color: DotFuelColors.white, fontFamily: 'Inter', fontSize: 14,
            }}
          />
        </View>

        {/* Method cards */}
        <View style={{
          flexDirection: 'row', flexWrap: 'wrap',
          gap: 10, marginHorizontal: Spacing['2xl'], marginBottom: Spacing.xl,
        }}>
          {LOG_METHODS.map((method) => (
            <Pressable
              key={method.id}
              onPress={() => {
                if (process.env.EXPO_OS === 'ios') Haptics.selectionAsync();
                if (method.id === 'search') {
                  // Focus search or navigate
                } else if (method.id === 'barcode') {
                  router.push('/(tabs)/(log)/barcode-scanner');
                } else {
                  Alert.alert('Coming Soon', `${method.label} will be available soon!`);
                }
              }}
              style={({ pressed }) => ({
                width: '48%', flexGrow: 1,
                backgroundColor: DotFuelColors.card,
                borderWidth: 1, borderColor: DotFuelColors.cardBorder,
                borderRadius: Radius.xl, padding: 16,
                opacity: pressed ? 0.88 : 1,
                transform: [{ scale: pressed ? 0.97 : 1 }],
              })}
            >
              <Text style={{ fontSize: 28, marginBottom: 6 }}>{method.emoji}</Text>
              <Text style={{ fontFamily: 'Inter', fontSize: 13, fontWeight: '800', color: DotFuelColors.white }}>
                {method.label}
              </Text>
              <Text style={{ fontSize: 11, color: DotFuelColors.muted, fontWeight: '500', marginTop: 2 }}>
                {method.desc}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Custom calorie button */}
        <View style={{ marginHorizontal: Spacing['2xl'], marginBottom: Spacing.md }}>
          <Pressable
            onPress={() => {
              setShowCustom(!showCustom);
              if (process.env.EXPO_OS === 'ios') Haptics.selectionAsync();
            }}
            style={({ pressed }) => ({
              backgroundColor: DotFuelColors.limeLight,
              borderWidth: 1, borderColor: 'rgba(194,240,0,0.2)',
              borderRadius: Radius.lg, paddingVertical: 14, alignItems: 'center',
              opacity: pressed ? 0.88 : 1,
            })}
          >
            <Text style={{
              fontFamily: 'Inter', fontSize: 13, fontWeight: '800',
              color: DotFuelColors.lime, textTransform: 'uppercase', letterSpacing: 0.5,
            }}>
              ✏️ Quick Calorie Entry
            </Text>
          </Pressable>
        </View>

        {/* Custom input panel */}
        {showCustom && (
          <Animated.View entering={FadeIn.duration(200)} style={{
            marginHorizontal: Spacing['2xl'], marginBottom: Spacing.lg,
            backgroundColor: DotFuelColors.card, borderRadius: Radius.xl,
            padding: 16, gap: 10,
          }}>
            <TextInput
              value={customName}
              onChangeText={setCustomName}
              placeholder="Food name (optional)"
              placeholderTextColor={DotFuelColors.muted}
              style={{
                backgroundColor: DotFuelColors.surface,
                borderRadius: 10, padding: 12,
                color: DotFuelColors.white, fontSize: 14,
              }}
            />
            <TextInput
              value={customCal}
              onChangeText={setCustomCal}
              placeholder="Calories"
              placeholderTextColor={DotFuelColors.muted}
              keyboardType="numeric"
              style={{
                backgroundColor: DotFuelColors.surface,
                borderRadius: 10, padding: 12,
                color: DotFuelColors.lime, fontSize: 20, fontWeight: '900',
                textAlign: 'center', fontFamily: 'Inter',
              }}
            />
            <Pressable
              onPress={() => customMutation.mutate()}
              disabled={customMutation.isPending}
              style={({ pressed }) => ({
                backgroundColor: DotFuelColors.lime, borderRadius: 12,
                paddingVertical: 12, alignItems: 'center',
                opacity: customMutation.isPending ? 0.4 : pressed ? 0.88 : 1,
              })}
            >
              <Text style={{
                fontFamily: 'Inter', fontSize: 13, fontWeight: '800',
                color: DotFuelColors.black, textTransform: 'uppercase',
              }}>
                {customMutation.isPending ? 'Adding…' : 'Add Entry'}
              </Text>
            </Pressable>
          </Animated.View>
        )}

        {/* Quick-add pills */}
        <View style={{ marginHorizontal: Spacing['2xl'] }}>
          <Text style={{
            fontSize: 13, fontWeight: '800', color: DotFuelColors.white,
            textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10,
          }}>
            Quick Add
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {QUICK_FOODS.map((food) => (
              <Pressable
                key={food.name}
                onPress={() => quickAddMutation.mutate(food)}
                disabled={quickAddMutation.isPending}
                style={({ pressed }) => ({
                  flexDirection: 'row', alignItems: 'center', gap: 6,
                  backgroundColor: DotFuelColors.card,
                  borderWidth: 1, borderColor: DotFuelColors.cardBorder,
                  borderRadius: 10, paddingVertical: 8, paddingHorizontal: 12,
                  opacity: pressed ? 0.88 : 1,
                  transform: [{ scale: pressed ? 0.96 : 1 }],
                })}
              >
                <Text style={{ fontSize: 16 }}>{food.emoji}</Text>
                <Text style={{ fontSize: 12, fontWeight: '700', color: DotFuelColors.white }}>
                  {food.name}
                </Text>
                <Text style={{ fontSize: 11, color: DotFuelColors.muted, fontWeight: '600' }}>
                  {food.cal}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

/** Determines meal type based on current time. */
function getMealType(): string {
  const h = new Date().getHours();
  if (h < 11) return 'breakfast';
  if (h < 15) return 'lunch';
  if (h < 19) return 'dinner';
  return 'snack';
}
