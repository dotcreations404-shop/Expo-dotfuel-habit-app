/**
 * Log screen — food logging hub with multiple entry methods.
 * Photo AI, Voice, Search, Barcode, Quick-add, Custom food.
 */
import { useState, useCallback, useRef, useEffect } from 'react';
import { View, ScrollView, Pressable, TextInput, Alert, KeyboardAvoidingView, Modal, Platform, ActivityIndicator } from 'react-native';
import { Text } from '@/components/ui/text';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import Animated, { FadeInDown, FadeIn, FadeOut } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Image } from 'expo-image';

import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '@/contexts/auth-context';
import { supabase } from '@/lib/supabase';
import { DotFuelColors, Spacing, Radius } from '@/constants/colors';
import type { DailyLog } from '@/lib/types';
import { getApiUrl } from '@/lib/api-helper';

/** Returns YYYY-MM-DD in local timezone. */
function today(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function parseDescription(desc: string): { cal: number; fat: number; carbs: number; protein: number; serving: string } {
  const serving = desc.split(' - ')[0] || '';
  const cal = parseFloat(desc.match(/Calories:\s*([\d.]+)/)?.[1] || '0');
  const fat = parseFloat(desc.match(/Fat:\s*([\d.]+)/)?.[1] || '0');
  const carbs = parseFloat(desc.match(/Carbs:\s*([\d.]+)/)?.[1] || '0');
  const protein = parseFloat(desc.match(/Protein:\s*([\d.]+)/)?.[1] || '0');
  return { cal, fat, carbs, protein, serving };
}

const LOG_METHODS = [
  { id: 'custom_meal', emoji: '🍳', label: 'Custom Meal', desc: 'Log manually', color: '#A855F7' },
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
  const { scannedFood } = useLocalSearchParams<{ scannedFood?: string }>();
  const [showCustom, setShowCustom] = useState(false);
  const [customName, setCustomName] = useState('');
  const [customCal, setCustomCal] = useState('');
  const todayStr = today();

  const [isAiEstimating, setIsAiEstimating] = useState(false);
  const [showVoiceModal, setShowVoiceModal] = useState(false);
  const [showResultsModal, setShowResultsModal] = useState(false);
  const [voiceText, setVoiceText] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [recognitionInstance, setRecognitionInstance] = useState<any>(null);

  const [estimatedFood, setEstimatedFood] = useState({
    name: '',
    emoji: '🍽️',
    calories: 0,
    protein_g: 0,
    carbs_g: 0,
    fat_g: 0,
    fiber_g: 0,
    serving_size: '1 serving',
    source: 'ai',
    meal_time: getMealType(),
  });

  useEffect(() => {
    if (scannedFood) {
      try {
        const parsed = JSON.parse(scannedFood);
        setEstimatedFood({
          name: parsed.name || 'Scanned Food',
          emoji: parsed.emoji || '📱',
          calories: parsed.calories || 0,
          protein_g: parsed.protein_g || 0,
          carbs_g: parsed.carbs_g || 0,
          fat_g: parsed.fat_g || 0,
          fiber_g: parsed.fiber_g || 0,
          serving_size: parsed.serving_size || '1 serving',
          source: parsed.source || 'barcode',
          meal_time: getMealType(),
        });
        setShowResultsModal(true);
        // Clear param by replacing history
        router.setParams({ scannedFood: undefined });
      } catch (err) {
        console.error('Error parsing scanned food param', err);
      }
    }
  }, [scannedFood]);

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

  const recalculateAndSaveDailyTotals = async (logId: string) => {
    try {
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
        protein: food.p,
        carbs: food.c,
        fat: food.f,
        meal_time: getMealType(),
      });
      if (mealErr) throw mealErr;

      await recalculateAndSaveDailyTotals(logId);
    },
    onSuccess: () => {
      if (process.env.EXPO_OS === 'ios') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      queryClient.invalidateQueries({ queryKey: ['daily-log'] });
      queryClient.invalidateQueries({ queryKey: ['meals'] });
      queryClient.invalidateQueries({ queryKey: ['week-logs'] });
      router.push('/(tabs)/(home)');
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

      const { error: mealErr } = await supabase.from('meals').insert({
        user_id: user!.id,
        daily_log_id: logId,
        name: customName || 'Custom Entry',
        emoji: '✏️',
        calories: cal,
        meal_time: getMealType(),
      });
      if (mealErr) throw mealErr;

      await recalculateAndSaveDailyTotals(logId);
    },
    onSuccess: () => {
      if (process.env.EXPO_OS === 'ios') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setShowCustom(false);
      setCustomName('');
      setCustomCal('');
      queryClient.invalidateQueries({ queryKey: ['daily-log'] });
      queryClient.invalidateQueries({ queryKey: ['meals'] });
      queryClient.invalidateQueries({ queryKey: ['week-logs'] });
      router.push('/(tabs)/(home)');
    },
    onError: (err) => {
      Alert.alert('Error', err.message);
    },
  });

  // ── AI Estimate save mutation ──────────────────────────────────────────────
  const addEstimatedMealMutation = useMutation({
    mutationFn: async () => {
      const logId = await getOrCreateLog();

      // Insert meal
      const { error: mealErr } = await supabase.from('meals').insert({
        user_id: user!.id,
        daily_log_id: logId,
        name: estimatedFood.name || 'AI Estimate',
        emoji: estimatedFood.emoji || '🍽️',
        calories: Number(estimatedFood.calories),
        protein: Number(estimatedFood.protein_g),
        carbs: Number(estimatedFood.carbs_g),
        fat: Number(estimatedFood.fat_g),
        fiber: Number(estimatedFood.fiber_g),
        serving_size: estimatedFood.serving_size,
        meal_time: estimatedFood.meal_time || getMealType(),
      });
      if (mealErr) throw mealErr;

      await recalculateAndSaveDailyTotals(logId);
    },
    onSuccess: () => {
      if (process.env.EXPO_OS === 'ios') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setShowResultsModal(false);
      queryClient.invalidateQueries({ queryKey: ['daily-log'] });
      queryClient.invalidateQueries({ queryKey: ['meals'] });
      queryClient.invalidateQueries({ queryKey: ['week-logs'] });
      router.push('/(tabs)/(home)');
    },
    onError: (err) => {
      Alert.alert('Error', err.message);
    },
  });

  // ── Web Speech API Handler ─────────────────────────────────────────────────
  const startSpeechRecognition = () => {
    if (isListening) {
      if (recognitionInstance) {
        recognitionInstance.stop();
      }
      setIsListening(false);
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      Alert.alert('Not Supported', 'Speech recognition is not supported on this browser. Please type your entry instead.');
      return;
    }

    try {
      const rec = new SpeechRecognition();
      rec.continuous = false;
      rec.lang = 'en-US';
      rec.interimResults = false;

      rec.onstart = () => {
        setIsListening(true);
      };

      rec.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setVoiceText(transcript);
      };

      rec.onerror = (event: any) => {
        console.error('Speech recognition error', event.error);
        setIsListening(false);
      };

      rec.onend = () => {
        setIsListening(false);
      };

      rec.start();
      setRecognitionInstance(rec);
    } catch (err) {
      console.error('Speech recognition failed to start', err);
      setIsListening(false);
    }
  };

  // ── Voice description macro estimator ──────────────────────────────────────
  const handleVoiceEstimate = async () => {
    if (!voiceText.trim()) {
      Alert.alert('Empty input', 'Please type or speak what you ate.');
      return;
    }

    setShowVoiceModal(false);
    setIsAiEstimating(true);

    try {
      const res = await fetch(getApiUrl('/api/ai-estimate'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ food: voiceText })
      });

      if (!res.ok) throw new Error(`HTTP error ${res.status}`);
      const data = await res.json();

      setEstimatedFood({
        name: data.name || voiceText,
        emoji: data.emoji || '🎙️',
        calories: data.calories || 0,
        protein_g: data.protein_g || 0,
        carbs_g: data.carbs_g || 0,
        fat_g: data.fat_g || 0,
        fiber_g: data.fiber_g || 0,
        serving_size: data.serving_size || '1 serving',
        source: 'voice',
        meal_time: getMealType(),
      });
      setShowResultsModal(true);
    } catch (err: any) {
      Alert.alert('AI Estimation Failed', err.message || 'Failed to estimate macros. Please try again.');
    } finally {
      setIsAiEstimating(false);
    }
  };


  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: DotFuelColors.black }} edges={['top', 'left', 'right']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={process.env.EXPO_OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingBottom: 100 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header — matches webapp .log-title: 22px 900 white uppercase */}
          <View style={{
            paddingTop: 16, paddingHorizontal: Spacing['2xl'],
            paddingBottom: Spacing.md,
          }}>
          <Text style={{
            fontFamily: 'Inter', fontSize: 22, fontWeight: '900',
            color: DotFuelColors.white, textTransform: 'uppercase', letterSpacing: -0.5,
          }}>
            Log Food
          </Text>
          <Text style={{
            fontSize: 13, color: DotFuelColors.muted, fontWeight: '500', marginTop: 4,
          }}>
            Choose how you want to log
          </Text>
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
                    if (method.id === 'custom_meal') {
                      setEstimatedFood({
                        name: '',
                        emoji: '🍳',
                        calories: 0,
                        protein_g: 0,
                        carbs_g: 0,
                        fat_g: 0,
                        fiber_g: 0,
                        serving_size: '1 serving',
                        source: 'manual',
                        meal_time: getMealType(),
                      });
                      setShowResultsModal(true);
                    } else if (method.id === 'barcode') {
                      router.push('/(tabs)/(log)/barcode-scanner');
                    } else if (method.id === 'voice') {
                      setVoiceText('');
                      setShowVoiceModal(true);
                    }
                  }}
                  style={({ pressed }) => ({
                    width: '48%', flexGrow: 1,
                    backgroundColor: DotFuelColors.card,
                    borderWidth: 1.5,
                    borderColor: method.id === 'custom_meal'
                      ? 'rgba(168,85,247,0.3)'
                      : method.id === 'voice'
                      ? 'rgba(0,232,122,0.3)'
                      : 'rgba(255,255,255,0.1)',
                    borderRadius: Radius.xl, paddingTop: 20, paddingBottom: 18, paddingHorizontal: 16,
                    overflow: 'hidden',
                    opacity: pressed ? 0.88 : 1,
                    transform: [{ scale: pressed ? 0.97 : 1 }],
                  })}
                >
                  {/* 3px top color bar — matches webapp .method-card::before */}
                  <View style={{
                    position: 'absolute', top: 0, left: 0, right: 0, height: 3,
                    backgroundColor: method.color,
                  }} />
                  <Text style={{ fontSize: 32, marginBottom: 8, textAlign: 'center' }}>{method.emoji}</Text>
                  <Text style={{
                    fontFamily: 'Inter', fontSize: 14, fontWeight: '800',
                    color: DotFuelColors.white, textTransform: 'uppercase',
                    letterSpacing: 0.5, marginBottom: 4,
                  }}>
                    {method.label}
                  </Text>
                  <Text style={{ fontSize: 10, color: DotFuelColors.muted, lineHeight: 14 }}>
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
                <Button
                  title={customMutation.isPending ? 'Adding…' : 'Add Entry'}
                  onPress={() => customMutation.mutate()}
                  disabled={customMutation.isPending}
                />
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
                      // Matches webapp .quick-pill: border-radius 30px
                      borderRadius: 30, paddingVertical: 7, paddingHorizontal: 13,
                      opacity: pressed ? 0.88 : 1,
                      transform: [{ scale: pressed ? 0.96 : 1 }],
                    })}
                  >
                    {/* .quick-pill-emoji */}
                    <Text style={{ fontSize: 15 }}>{food.emoji}</Text>
                    {/* .quick-pill-label */}
                    <Text style={{ fontSize: 12, fontWeight: '700', color: DotFuelColors.text }}>
                      {food.name}
                    </Text>
                    {/* .quick-pill-cals */}
                    <Text style={{ fontSize: 10, color: DotFuelColors.muted, fontWeight: '700' }}>
                      {food.cal}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
      </ScrollView>

      {/* Loading Overlay */}
      {isAiEstimating && (
        <View style={{
          position: 'absolute',
          top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.85)',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 9999,
        }}>
          <ActivityIndicator size="large" color={DotFuelColors.lime} />
          <Text style={{
            fontFamily: 'Inter',
            fontSize: 16,
            fontWeight: '800',
            color: DotFuelColors.white,
            marginTop: 16,
            textTransform: 'uppercase',
            letterSpacing: 0.5,
          }}>
            Analyzing with AI...
          </Text>
          <Text style={{
            fontSize: 12,
            color: DotFuelColors.muted,
            marginTop: 6,
          }}>
            Claude is estimating macros
          </Text>
        </View>
      )}

      {/* ── VOICE INPUT MODAL ── */}
      <Modal
        visible={showVoiceModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowVoiceModal(false)}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'flex-end' }}>
          <View style={{
            backgroundColor: DotFuelColors.card,
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            padding: 24,
            borderWidth: 1,
            borderColor: DotFuelColors.cardBorder,
            paddingBottom: 40,
          }}>
            <View style={{ width: 40, height: 4, backgroundColor: DotFuelColors.surface, borderRadius: 2, alignSelf: 'center', marginBottom: 16 }} />
            
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <Text style={{ fontFamily: 'Inter', fontSize: 18, fontWeight: '900', color: DotFuelColors.white }}>
                🎙️ Voice AI Logger
              </Text>
              <Pressable onPress={() => setShowVoiceModal(false)} style={{ padding: 4 }}>
                <Text style={{ fontSize: 18, color: DotFuelColors.muted, fontWeight: 'bold' }}>✕</Text>
              </Pressable>
            </View>

            <Text style={{ fontSize: 13, color: DotFuelColors.muted, marginBottom: 16, lineHeight: 18 }}>
              Describe what you ate (e.g. "two scrambled eggs with two slices of whole wheat toast") or type it below.
            </Text>

            {/* Transcription / Input area */}
            <TextInput
              value={voiceText}
              onChangeText={setVoiceText}
              multiline
              placeholder="Describe your meal..."
              placeholderTextColor={DotFuelColors.muted}
              style={{
                backgroundColor: DotFuelColors.surface,
                borderRadius: 12,
                padding: 16,
                color: DotFuelColors.white,
                fontFamily: 'Inter',
                fontSize: 14,
                height: 120,
                textAlignVertical: 'top',
                borderWidth: 1,
                borderColor: 'rgba(255,255,255,0.05)',
                marginBottom: 20,
              }}
            />

            {/* Voice listen controls */}
            <View style={{ alignItems: 'center', marginBottom: 24 }}>
              <Pressable
                onPress={startSpeechRecognition}
                style={({ pressed }) => ({
                  width: 72,
                  height: 72,
                  borderRadius: 36,
                  backgroundColor: isListening ? '#FF3B3B' : 'rgba(194, 240, 0, 0.1)',
                  borderWidth: 2,
                  borderColor: isListening ? '#FF8C00' : DotFuelColors.lime,
                  alignItems: 'center',
                  justifyContent: 'center',
                  opacity: pressed ? 0.8 : 1,
                })}
              >
                <Text style={{ fontSize: 32 }}>{isListening ? '⏹️' : '🎙️'}</Text>
              </Pressable>
              <Text style={{ fontSize: 12, color: isListening ? '#FF8C00' : DotFuelColors.muted, fontWeight: '800', marginTop: 8 }}>
                {isListening ? 'LISTENING... TAP TO STOP' : 'TAP MIC TO START SPEAKING'}
              </Text>
            </View>

            {/* Action buttons */}
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <Pressable
                onPress={() => setShowVoiceModal(false)}
                style={({ pressed }) => ({
                  flex: 1,
                  backgroundColor: DotFuelColors.surface,
                  borderRadius: 14,
                  paddingVertical: 14,
                  alignItems: 'center',
                  opacity: pressed ? 0.8 : 1,
                })}
              >
                <Text style={{ fontFamily: 'Inter', fontSize: 13, fontWeight: '800', color: DotFuelColors.white }}>CANCEL</Text>
              </Pressable>
              <Pressable
                onPress={handleVoiceEstimate}
                disabled={!voiceText.trim()}
                style={({ pressed }) => ({
                  flex: 2,
                  backgroundColor: voiceText.trim() ? DotFuelColors.lime : DotFuelColors.surface,
                  borderRadius: 14,
                  paddingVertical: 14,
                  alignItems: 'center',
                  opacity: pressed ? 0.8 : (voiceText.trim() ? 1 : 0.5),
                })}
              >
                <Text style={{
                  fontFamily: 'Inter',
                  fontSize: 13,
                  fontWeight: '900',
                  color: voiceText.trim() ? DotFuelColors.black : DotFuelColors.muted,
                  textTransform: 'uppercase',
                  letterSpacing: 0.5,
                }}>
                  Estimate Macros ⚡
                </Text>
              </Pressable>
            </View>

          </View>
        </View>
      </Modal>

      {/* ── RESULTS EDIT MODAL ── */}
      <Modal
        visible={showResultsModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowResultsModal(false)}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'flex-end' }}>
          <View style={{
            backgroundColor: DotFuelColors.card,
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            padding: 24,
            borderWidth: 1,
            borderColor: DotFuelColors.cardBorder,
            paddingBottom: 40,
          }}>
            <View style={{ width: 40, height: 4, backgroundColor: DotFuelColors.surface, borderRadius: 2, alignSelf: 'center', marginBottom: 16 }} />
            
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <Text style={{ fontFamily: 'Inter', fontSize: 18, fontWeight: '900', color: DotFuelColors.white }}>
                {estimatedFood.source === 'manual' ? '🍳 Custom Meal' : '🔍 AI Nutrition Estimate'}
              </Text>
              <Pressable onPress={() => setShowResultsModal(false)} style={{ padding: 4 }}>
                <Text style={{ fontSize: 18, color: DotFuelColors.muted, fontWeight: 'bold' }}>✕</Text>
              </Pressable>
            </View>

            <Text style={{ fontSize: 12, color: DotFuelColors.muted, marginBottom: 16 }}>
              {estimatedFood.source === 'manual' ? 'Enter meal details before adding to your log.' : 'Review or adjust details before adding to your food log.'}
            </Text>

            {/* Editable Fields */}
            <View style={{ gap: 12, marginBottom: 24 }}>
              {/* Name & Emoji row */}
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <TextInput
                  value={estimatedFood.emoji}
                  onChangeText={(val) => setEstimatedFood(prev => ({ ...prev, emoji: val }))}
                  style={{
                    backgroundColor: DotFuelColors.surface,
                    borderRadius: 10,
                    padding: 12,
                    color: DotFuelColors.white,
                    fontSize: 20,
                    width: 52,
                    textAlign: 'center',
                    borderWidth: 1,
                    borderColor: 'rgba(255,255,255,0.05)',
                  }}
                />
                <TextInput
                  value={estimatedFood.name}
                  onChangeText={(val) => setEstimatedFood(prev => ({ ...prev, name: val }))}
                  placeholder="Food name"
                  placeholderTextColor={DotFuelColors.muted}
                  style={{
                    flex: 1,
                    backgroundColor: DotFuelColors.surface,
                    borderRadius: 10,
                    padding: 12,
                    color: DotFuelColors.white,
                    fontFamily: 'Inter',
                    fontSize: 14,
                    borderWidth: 1,
                    borderColor: 'rgba(255,255,255,0.05)',
                  }}
                />
              </View>

              {/* Portion size */}
              <View>
                <Text style={{ fontSize: 10, color: DotFuelColors.muted, fontWeight: '800', marginBottom: 4, letterSpacing: 0.5 }}>PORTION SIZE</Text>
                <TextInput
                  value={estimatedFood.serving_size}
                  onChangeText={(val) => setEstimatedFood(prev => ({ ...prev, serving_size: val }))}
                  placeholder="1 serving, 100g, etc."
                  placeholderTextColor={DotFuelColors.muted}
                  style={{
                    backgroundColor: DotFuelColors.surface,
                    borderRadius: 10,
                    padding: 12,
                    color: DotFuelColors.white,
                    fontSize: 14,
                    borderWidth: 1,
                    borderColor: 'rgba(255,255,255,0.05)',
                  }}
                />
              </View>

              {/* Meal Type selection */}
              <View>
                <Text style={{ fontSize: 10, color: DotFuelColors.muted, fontWeight: '800', marginBottom: 6, letterSpacing: 0.5 }}>MEAL TYPE</Text>
                <View style={{ flexDirection: 'row', gap: 6 }}>
                  {[
                    { id: 'breakfast', label: 'Breakfast 🥞' },
                    { id: 'lunch', label: 'Lunch 🥪' },
                    { id: 'dinner', label: 'Dinner 🍲' },
                    { id: 'snack', label: 'Snack 🍎' }
                  ].map((type) => {
                    const isSelected = estimatedFood.meal_time === type.id;
                    return (
                      <Pressable
                        key={type.id}
                        onPress={() => {
                          if (process.env.EXPO_OS === 'ios') Haptics.selectionAsync();
                          setEstimatedFood(prev => ({ ...prev, meal_time: type.id }));
                        }}
                        style={({ pressed }) => ({
                          flex: 1,
                          backgroundColor: isSelected ? DotFuelColors.limeLight : DotFuelColors.surface,
                          borderWidth: 1,
                          borderColor: isSelected ? DotFuelColors.lime : 'rgba(255,255,255,0.05)',
                          borderRadius: Radius.md,
                          paddingVertical: 10,
                          alignItems: 'center',
                          opacity: pressed ? 0.8 : 1,
                        })}
                      >
                        <Text style={{
                          fontFamily: 'Inter',
                          fontSize: 11,
                          fontWeight: '800',
                          color: isSelected ? DotFuelColors.lime : DotFuelColors.muted,
                          textTransform: 'uppercase',
                        }}>
                          {type.label.split(' ')[0]}
                        </Text>
                        <Text style={{ fontSize: 14, marginTop: 2 }}>
                          {type.label.split(' ')[1]}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              {/* Macros grid */}
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
                {/* Calories */}
                <View style={{ flex: 1, minWidth: '45%' }}>
                  <Text style={{ fontSize: 10, color: DotFuelColors.muted, fontWeight: '800', marginBottom: 4, letterSpacing: 0.5 }}>CALORIES (KCAL)</Text>
                  <TextInput
                    value={String(estimatedFood.calories || '')}
                    onChangeText={(val) => setEstimatedFood(prev => ({ ...prev, calories: parseInt(val, 10) || 0 }))}
                    keyboardType="numeric"
                    style={{
                      backgroundColor: DotFuelColors.surface,
                      borderRadius: 10,
                      padding: 12,
                      color: DotFuelColors.lime,
                      fontSize: 16,
                      fontWeight: '800',
                      borderWidth: 1,
                      borderColor: 'rgba(255,255,255,0.05)',
                    }}
                  />
                </View>

                {/* Protein */}
                <View style={{ flex: 1, minWidth: '45%' }}>
                  <Text style={{ fontSize: 10, color: DotFuelColors.muted, fontWeight: '800', marginBottom: 4, letterSpacing: 0.5 }}>PROTEIN (G)</Text>
                  <TextInput
                    value={String(estimatedFood.protein_g || '')}
                    onChangeText={(val) => setEstimatedFood(prev => ({ ...prev, protein_g: parseInt(val, 10) || 0 }))}
                    keyboardType="numeric"
                    style={{
                      backgroundColor: DotFuelColors.surface,
                      borderRadius: 10,
                      padding: 12,
                      color: DotFuelColors.blue,
                      fontSize: 16,
                      fontWeight: '800',
                      borderWidth: 1,
                      borderColor: 'rgba(255,255,255,0.05)',
                    }}
                  />
                </View>

                {/* Carbs */}
                <View style={{ flex: 1, minWidth: '45%' }}>
                  <Text style={{ fontSize: 10, color: DotFuelColors.muted, fontWeight: '800', marginBottom: 4, letterSpacing: 0.5 }}>CARBS (G)</Text>
                  <TextInput
                    value={String(estimatedFood.carbs_g || '')}
                    onChangeText={(val) => setEstimatedFood(prev => ({ ...prev, carbs_g: parseInt(val, 10) || 0 }))}
                    keyboardType="numeric"
                    style={{
                      backgroundColor: DotFuelColors.surface,
                      borderRadius: 10,
                      padding: 12,
                      color: DotFuelColors.orange,
                      fontSize: 16,
                      fontWeight: '800',
                      borderWidth: 1,
                      borderColor: 'rgba(255,255,255,0.05)',
                    }}
                  />
                </View>

                {/* Fat */}
                <View style={{ flex: 1, minWidth: '45%' }}>
                  <Text style={{ fontSize: 10, color: DotFuelColors.muted, fontWeight: '800', marginBottom: 4, letterSpacing: 0.5 }}>FAT (G)</Text>
                  <TextInput
                    value={String(estimatedFood.fat_g || '')}
                    onChangeText={(val) => setEstimatedFood(prev => ({ ...prev, fat_g: parseInt(val, 10) || 0 }))}
                    keyboardType="numeric"
                    style={{
                      backgroundColor: DotFuelColors.surface,
                      borderRadius: 10,
                      padding: 12,
                      color: DotFuelColors.green,
                      fontSize: 16,
                      fontWeight: '800',
                      borderWidth: 1,
                      borderColor: 'rgba(255,255,255,0.05)',
                    }}
                  />
                </View>
              </View>
            </View>

            {/* Actions */}
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <Pressable
                onPress={() => setShowResultsModal(false)}
                style={({ pressed }) => ({
                  flex: 1,
                  backgroundColor: DotFuelColors.surface,
                  borderRadius: 14,
                  paddingVertical: 14,
                  alignItems: 'center',
                  opacity: pressed ? 0.8 : 1,
                })}
              >
                <Text style={{ fontFamily: 'Inter', fontSize: 13, fontWeight: '800', color: DotFuelColors.white }}>CANCEL</Text>
              </Pressable>
              <Pressable
                onPress={() => addEstimatedMealMutation.mutate()}
                disabled={addEstimatedMealMutation.isPending}
                style={({ pressed }) => ({
                  flex: 2,
                  backgroundColor: DotFuelColors.lime,
                  borderRadius: 14,
                  paddingVertical: 14,
                  alignItems: 'center',
                  opacity: pressed ? 0.8 : (addEstimatedMealMutation.isPending ? 0.6 : 1),
                })}
              >
                <Text style={{
                  fontFamily: 'Inter',
                  fontSize: 13,
                  fontWeight: '900',
                  color: DotFuelColors.black,
                  textTransform: 'uppercase',
                  letterSpacing: 0.5,
                }}>
                  {addEstimatedMealMutation.isPending ? 'Logging...' : 'Confirm & Log 🍽️'}
                </Text>
              </Pressable>
            </View>

          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
    </SafeAreaView>
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
