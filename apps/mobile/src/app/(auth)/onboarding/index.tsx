/**
 * Onboarding flow — 6 steps:
 *   0: Welcome
 *   1: About You (name, age, sex)
 *   2: Body Metrics (weight, height) + live BMR preview with formula
 *   3: Activity Level (dedicated page with multiplier badges)
 *   4: Goal selection (fuel mode)
 *   5: Results — calculated target, macros, "How We Calculated This" breakdown, 2-week calibration tip
 */
import { useState, useCallback, useEffect } from 'react';
import { View, ScrollView, Pressable, Alert, KeyboardAvoidingView, Modal, Platform } from 'react-native';
import { Text } from '@/components/ui/text';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import Animated, { FadeIn, FadeInDown, FadeOut } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useMutation } from '@tanstack/react-query';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '@/contexts/auth-context';
import { supabase } from '@/lib/supabase';
import { DotFuelColors, Spacing, Radius } from '@/constants/colors';
import { ACTIVITY_LEVELS, FUEL_MODES, mapAppToUsersDbMode, mapAppToProfilesDbMode, mapUsersDbToAppMode, mapProfilesDbToAppMode } from '@/lib/types';
import type { FuelMode, UserProfile } from '@/lib/types';

import { useRouter } from 'expo-router';

const TOTAL_STEPS = 6; // 0..5

export default function Onboarding() {
  const [step, setStep] = useState(0);
  const { user, profile, needsOnboarding, setProfileDirect } = useAuth();
  const router = useRouter();

  // ── Collapsible state for info panels ─────────────────────────────────────
  const [showBmrPreview, setShowBmrPreview] = useState(true);
  const [showCalcBreakdown, setShowCalcBreakdown] = useState(true);
  const [showCalibrationTip, setShowCalibrationTip] = useState(true);

  // ── Form state ────────────────────────────────────────────────────────────
  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [sex, setSex] = useState<'male' | 'female'>('male');
  const [weight, setWeight] = useState('');
  const [height, setHeight] = useState('');
  const [goal, setGoal] = useState<'cut' | 'balance' | 'lean'>('balance');
  const [activity, setActivity] = useState<'sedentary' | 'light' | 'moderate' | 'active'>('moderate');

  const next = () => {
    if (process.env.EXPO_OS === 'ios') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (step < TOTAL_STEPS - 1) {
      setStep(step + 1);
    }
  };

  const back = () => {
    if (step > 0) {
      if (process.env.EXPO_OS === 'ios') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setStep(step - 1);
    }
  };

  // ── Calculated metrics ────────────────────────────────────────────────────
  const weightKg = parseFloat(weight) || 70;
  const heightCm = parseFloat(height) || 170;
  const ageNum = parseInt(age, 10) || 25;

  const heightM = heightCm / 100;
  const bmi = heightM > 0 ? weightKg / (heightM * heightM) : 0;

  // Mifflin-St Jeor BMR
  const bmr = sex === 'male'
    ? 10 * weightKg + 6.25 * heightCm - 5 * ageNum + 5
    : 10 * weightKg + 6.25 * heightCm - 5 * ageNum - 161;

  // Activity multiplier
  const actMult = activity === 'sedentary' ? 1.2
    : activity === 'light' ? 1.375
    : activity === 'moderate' ? 1.55
    : activity === 'active' ? 1.9
    : 1.55;

  const activityLabel = activity === 'sedentary' ? 'Sedentary'
    : activity === 'light' ? 'Light'
    : activity === 'moderate' ? 'Moderate'
    : activity === 'active' ? 'Hard'
    : 'Moderate';

  const activityDesc = activity === 'sedentary' ? 'Desk job, little or no exercise'
    : activity === 'light' ? '1–3 days exercise per week'
    : activity === 'moderate' ? '3–5 days exercise per week'
    : activity === 'active' ? '6–7 days intense training'
    : '3–5 days/week exercise';

  const tdee = Math.round(bmr * actMult);

  // Goal adjustment
  let calorieTarget = tdee;
  let goalAdjustment = 0;
  let goalAdjustmentLabel = 'No Adjustment';
  if (goal === 'cut') {
    calorieTarget = Math.round(tdee * 0.8);
    goalAdjustment = calorieTarget - tdee;
    goalAdjustmentLabel = '−20% Deficit';
  } else if (goal === 'lean') {
    calorieTarget = Math.round(tdee * 1.15);
    goalAdjustment = calorieTarget - tdee;
    goalAdjustmentLabel = '+15% Surplus';
  }

  // Macro targets
  const proteinTarget = Math.round(weightKg * (goal === 'cut' ? 2.2 : goal === 'lean' ? 2.0 : 1.6));
  const fatTarget = Math.round(calorieTarget * 0.25 / 9);
  const carbsTarget = Math.round((calorieTarget - proteinTarget * 4 - fatTarget * 9) / 4);

  // Macro percentages
  const totalMacroCals = proteinTarget * 4 + carbsTarget * 4 + fatTarget * 9;
  const proteinPct = totalMacroCals > 0 ? Math.round((proteinTarget * 4 / totalMacroCals) * 100) : 0;
  const carbsPct = totalMacroCals > 0 ? Math.round((carbsTarget * 4 / totalMacroCals) * 100) : 0;
  const fatPct = totalMacroCals > 0 ? Math.round((fatTarget * 9 / totalMacroCals) * 100) : 0;

  // Mode label
  const modeLabel = goal === 'cut' ? 'CUT MODE' : goal === 'lean' ? 'LEAN MODE' : 'BALANCE MODE';
  const modeDesc = goal === 'cut'
    ? "You're in a caloric deficit. You'll lose body fat while preserving muscle with high protein."
    : goal === 'lean'
    ? "You're in a caloric surplus. You'll build lean muscle with adequate protein and energy."
    : "You're eating at maintenance. Your weight should remain stable while you build healthy habits.";

  // BMR formula string
  const sexOffset = sex === 'male' ? '+5' : '−161';
  const bmrFormula = `(10×${weightKg}) + (6.25×${heightCm}) − (5×${ageNum}) ${sexOffset}`;

  // ── Save profile mutation ──────────────────────────────────────────────────
  const saveMutation = useMutation({
    mutationFn: async (payload: {
      id: string;
      email: string;
      name: string;
      age: number;
      sex: 'male' | 'female';
      weight_kg: number;
      height_cm: number;
      activity_level: 'sedentary' | 'light' | 'moderate' | 'active';
      fuel_mode: string;
      calorie_target: number;
      protein_target: number;
      carbs_target: number;
      fat_target: number;
      water_goal_l: number;
      water_goal_ml: number;
    }): Promise<UserProfile> => {
      console.log('[saveMutation] Initializing database write for payload:', payload);

      try {
        // 1. Write to profiles table: try UPDATE first, fallback to INSERT if row not found
        console.log('[saveMutation] Attempting UPDATE on profiles for id:', payload.id);
        let { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .update({
            name: payload.name,
            age: payload.age,
            sex: payload.sex,
            weight_kg: payload.weight_kg,
            height_cm: payload.height_cm,
            activity_level: payload.activity_level,
            fuel_mode: mapAppToProfilesDbMode(payload.fuel_mode),
            calorie_target: payload.calorie_target,
            water_goal_l: payload.water_goal_l,
          })
          .eq('id', payload.id)
          .select()
          .single();

        if (profileError && (profileError.code === 'PGRST116' || profileError.message?.includes('rows'))) {
          console.log('[saveMutation] Profile row not found, attempting INSERT on profiles...');
          const insertRes = await supabase
            .from('profiles')
            .insert({
              id: payload.id,
              name: payload.name,
              age: payload.age,
              sex: payload.sex,
              weight_kg: payload.weight_kg,
              height_cm: payload.height_cm,
              activity_level: payload.activity_level,
              fuel_mode: mapAppToProfilesDbMode(payload.fuel_mode),
              calorie_target: payload.calorie_target,
              water_goal_l: payload.water_goal_l,
            })
            .select()
            .single();
          profileData = insertRes.data;
          profileError = insertRes.error;
        }

        if (profileError) {
          console.error('[saveMutation] profiles write error:', profileError);
          throw profileError;
        }

        // 2. Write to users table: try UPDATE first, fallback to INSERT if row not found
        console.log('[saveMutation] Attempting UPDATE on users for id:', payload.id);
        let { data: userData, error: userError } = await supabase
          .from('users')
          .update({
            email: payload.email,
            name: payload.name,
            fuel_mode: mapAppToUsersDbMode(payload.fuel_mode),
            calorie_target: payload.calorie_target,
            protein_target: payload.protein_target,
            carbs_target: payload.carbs_target,
            fat_target: payload.fat_target,
            streak_days: 0,
          })
          .eq('id', payload.id)
          .select()
          .single();

        if (userError && (userError.code === 'PGRST116' || userError.message?.includes('rows'))) {
          console.log('[saveMutation] User row not found, attempting INSERT on users...');
          const insertRes = await supabase
            .from('users')
            .insert({
              id: payload.id,
              email: payload.email,
              name: payload.name,
              fuel_mode: mapAppToUsersDbMode(payload.fuel_mode),
              calorie_target: payload.calorie_target,
              protein_target: payload.protein_target,
              carbs_target: payload.carbs_target,
              fat_target: payload.fat_target,
              streak_days: 0,
            })
            .select()
            .single();
          userData = insertRes.data;
          userError = insertRes.error;
        }

        if (userError) {
          console.error('[saveMutation] users write error:', userError);
          throw userError;
        }

        const merged: UserProfile = {
          ...(userData || {}),
          ...(profileData || {}),
          id: payload.id,
        };

        // Map database fuel_mode back to application fuel_mode
        merged.fuel_mode = mapUsersDbToAppMode(userData?.fuel_mode) || mapProfilesDbToAppMode(profileData?.fuel_mode) || 'balance';

        if (profileData?.water_goal_l !== undefined && profileData?.water_goal_l !== null) {
          merged.water_goal_ml = Math.round(profileData.water_goal_l * 1000);
        }

        return merged;
      } catch (dbError: any) {
        console.error('[saveMutation] Robust try/catch surfaced DB transaction error:', dbError);
        throw new Error(dbError?.message || 'Database write transaction failed');
      }
    },
    onSuccess: async (savedProfile: UserProfile) => {
      console.log('[saveMutation] Database write successful, updating local React Context...');
      if (process.env.EXPO_OS === 'ios') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      
      // Explicitly update the local user/profile React Context state
      setProfileDirect(savedProfile);
      
      // Await context state update entirely before executing final routing switch (using safety fallback timer)
      await new Promise((resolve) => setTimeout(resolve, 150));
      router.replace('/(tabs)/(home)');
    },
    onError: (err: Error) => {
      console.error('[saveMutation] Onboarding mutation failed:', err);
      if (Platform.OS === 'web') {
        alert(`Error saving profile: ${err.message}`);
      } else {
        Alert.alert('Error saving profile', err.message);
      }
    },
  });

  // ── Navigation guard to prevent race conditions ───────────────────────────
  useEffect(() => {
    // Navigate only once context state has fully updated needsOnboarding to false and profile is hydrated
    if (saveMutation.isSuccess && !needsOnboarding && profile?.calorie_target) {
      console.log('[onboarding] Navigation guard: profile successfully hydrated, transitioning to home...');
      router.replace('/(tabs)/(home)');
    }
  }, [profile, needsOnboarding, saveMutation.isSuccess]);

  const handleCompleteOnboarding = () => {
    if (saveMutation.isPending) return;
    
    if (process.env.EXPO_OS === 'ios') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }

    if (!user) {
      console.error('[onboarding] User object is null in auth context');
      if (Platform.OS === 'web') {
        alert('Authentication error: No active user session found.');
      } else {
        Alert.alert('Authentication Error', 'No active user session found.');
      }
      return;
    }

    // Compile all fields into a structured payload object
    const payload = {
      id: user.id,
      email: user.email || '',
      name: name.trim() || 'Athlete',
      age: ageNum,
      sex,
      weight_kg: weightKg,
      height_cm: heightCm,
      activity_level: activity,
      fuel_mode: goal,
      calorie_target: calorieTarget,
      protein_target: proteinTarget,
      carbs_target: carbsTarget,
      fat_target: fatTarget,
      water_goal_l: 3.0,
      water_goal_ml: 3000,
    };

    saveMutation.mutate(payload);
  };

  // ══════════════════════════════════════════════════════════════════════════
  // ── Step renderers ────────────────────────────────────────────────────────
  // ══════════════════════════════════════════════════════════════════════════

  const renderStep = () => {
    switch (step) {
      // ── Step 0: Welcome ─────────────────────────────────────────────────
      case 0:
        return (
          <Animated.View entering={FadeIn.duration(400)} style={{ alignItems: 'center', paddingTop: 40 }}>
            <View style={{
              width: 100, height: 100, borderRadius: 50,
              backgroundColor: DotFuelColors.lime, marginBottom: 28,
              alignItems: 'center', justifyContent: 'center',
            }}>
              <Text style={{ fontSize: 40 }}>💪</Text>
            </View>
            <Text style={{
              fontFamily: 'Inter', fontSize: 28, fontWeight: '900',
              color: DotFuelColors.white, textAlign: 'center', marginBottom: 12,
            }}>
              Let's set up{'\n'}your fuel plan
            </Text>
            <Text style={{
              fontSize: 14, color: DotFuelColors.muted, fontWeight: '500',
              textAlign: 'center', lineHeight: 22, maxWidth: 280,
            }}>
              We'll calculate your daily calorie and macro targets using the Mifflin-St Jeor equation — the gold standard for metabolic estimation.
            </Text>
          </Animated.View>
        );

      // ── Step 1: About You ───────────────────────────────────────────────
      case 1:
        return (
          <Animated.View entering={FadeInDown.duration(400)} style={{ gap: 16 }}>
            <Text style={sectionTitle}>About You</Text>
            <Text style={{ fontSize: 13, color: DotFuelColors.muted, fontWeight: '500', lineHeight: 18, marginBottom: 4 }}>
              Your age and sex affect your Basal Metabolic Rate (BMR).
            </Text>
            <Field label="Your Name" value={name} onChange={setName} placeholder="What should we call you?" disabled={saveMutation.isPending} />
            <Field label="Age" value={age} onChange={setAge} keyboardType="numeric" placeholder="25" disabled={saveMutation.isPending} />
            <View style={{ gap: 8 }}>
              <Text style={fieldLabel}>Sex</Text>
              <View style={{ flexDirection: 'row', gap: 10 }}>
                {(['male', 'female'] as const).map((s) => {
                  const isSelected = sex === s;
                  return (
                    <Pressable
                      key={s}
                      onPress={() => {
                        if (saveMutation.isPending) return;
                        setSex(s);
                        if (process.env.EXPO_OS === 'ios') Haptics.selectionAsync();
                      }}
                      style={{
                        flex: 1, alignItems: 'center', paddingVertical: 14,
                        backgroundColor: isSelected ? 'rgba(30,73,207,0.15)' : DotFuelColors.card,
                        borderWidth: isSelected ? 1.5 : 1,
                        borderColor: isSelected ? '#1E49CF' : DotFuelColors.cardBorder,
                        borderRadius: 14,
                      }}
                    >
                      <Text style={{
                        fontSize: 32, marginBottom: 4,
                        color: isSelected ? '#1E49CF' : DotFuelColors.muted
                      }}>
                        {s === 'male' ? '♂' : '♀'}
                      </Text>
                      <Text style={{
                        fontSize: 13, fontWeight: '800',
                        color: isSelected ? '#1E49CF' : DotFuelColors.muted,
                        textTransform: 'capitalize',
                      }}>
                        {s === 'male' ? 'Male' : 'Female'}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          </Animated.View>
        );

      // ── Step 2: Body Metrics + BMR Preview ─────────────────────────────
      case 2:
        return (
          <Animated.View entering={FadeInDown.duration(400)} style={{ gap: 16 }}>
            <Text style={sectionTitle}>Your Body{'\n'}Metrics</Text>
            <Text style={{ fontSize: 13, color: DotFuelColors.muted, fontWeight: '500', lineHeight: 18, marginBottom: 4 }}>
              Used to calculate your Basal Metabolic Rate (BMR).
            </Text>

            {/* Weight and Height side by side */}
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <View style={{ flex: 1 }}>
                <Text style={fieldLabel}>Weight</Text>
                <View style={{
                  flexDirection: 'row', alignItems: 'center',
                  backgroundColor: DotFuelColors.card, borderRadius: 14,
                  borderWidth: 1, borderColor: DotFuelColors.cardBorder,
                  paddingHorizontal: 16, paddingVertical: 14,
                }}>
                  <Input
                    value={weight}
                    onChangeText={setWeight}
                    keyboardType="decimal-pad"
                    placeholder="70"
                    style={{
                      flex: 1, fontSize: 22, fontWeight: '900', fontFamily: 'Inter',
                      color: DotFuelColors.white, backgroundColor: 'transparent',
                      borderWidth: 0, padding: 0, margin: 0,
                    }}
                    editable={!saveMutation.isPending}
                  />
                  <Text style={{ fontSize: 14, fontWeight: '800', color: DotFuelColors.muted, letterSpacing: 1 }}>KG</Text>
                </View>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={fieldLabel}>Height</Text>
                <View style={{
                  flexDirection: 'row', alignItems: 'center',
                  backgroundColor: DotFuelColors.card, borderRadius: 14,
                  borderWidth: 1, borderColor: DotFuelColors.cardBorder,
                  paddingHorizontal: 16, paddingVertical: 14,
                }}>
                  <Input
                    value={height}
                    onChangeText={setHeight}
                    keyboardType="decimal-pad"
                    placeholder="169"
                    style={{
                      flex: 1, fontSize: 22, fontWeight: '900', fontFamily: 'Inter',
                      color: DotFuelColors.white, backgroundColor: 'transparent',
                      borderWidth: 0, padding: 0, margin: 0,
                    }}
                    editable={!saveMutation.isPending}
                  />
                  <Text style={{ fontSize: 14, fontWeight: '800', color: DotFuelColors.muted, letterSpacing: 1 }}>CM</Text>
                </View>
              </View>
            </View>

            {/* BMR Preview Card */}
            {weight && height && (
              <Animated.View entering={FadeIn.duration(300)}>
                <Pressable
                  onPress={() => setShowBmrPreview(!showBmrPreview)}
                  style={{
                    backgroundColor: DotFuelColors.card, borderRadius: 16,
                    borderWidth: 1, borderColor: DotFuelColors.cardBorder,
                    padding: 18, marginTop: 8,
                  }}
                >
                  {/* Header */}
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: showBmrPreview ? 12 : 0 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Text style={{ fontSize: 16 }}>🧬</Text>
                      <Text style={{ fontSize: 13, fontWeight: '900', color: DotFuelColors.white, letterSpacing: 0.5 }}>
                        BMR PREVIEW
                      </Text>
                    </View>
                    <Text style={{ fontSize: 14, color: DotFuelColors.muted }}>
                      {showBmrPreview ? '▲' : '▼'}
                    </Text>
                  </View>

                  {showBmrPreview && (
                    <View>
                      {/* Formula */}
                      <Text style={{ fontSize: 13, color: DotFuelColors.muted, fontWeight: '500', lineHeight: 20, marginBottom: 12 }}>
                        {bmrFormula} = {Math.round(bmr)}
                      </Text>

                      {/* Result */}
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                        <Text style={{ fontSize: 13, color: DotFuelColors.muted, fontWeight: '500' }}>
                          Your base calorie burn at rest
                        </Text>
                        <View style={{ alignItems: 'flex-end' }}>
                          <Text style={{
                            fontFamily: 'Inter', fontSize: 32, fontWeight: '900',
                            color: DotFuelColors.lime, letterSpacing: -1,
                          }}>
                            {Math.round(bmr).toLocaleString()}
                          </Text>
                          <Text style={{ fontSize: 10, fontWeight: '800', color: DotFuelColors.muted, letterSpacing: 1 }}>
                            KCAL/DAY
                          </Text>
                        </View>
                      </View>
                    </View>
                  )}
                </Pressable>
              </Animated.View>
            )}
          </Animated.View>
        );

      // ── Step 3: Activity Level (dedicated page) ────────────────────────
      case 3:
        return (
          <Animated.View entering={FadeInDown.duration(400)} style={{ gap: 16 }}>
            <Text style={sectionTitle}>Activity{'\n'}Level</Text>
            <Text style={{ fontSize: 13, color: DotFuelColors.muted, fontWeight: '500', lineHeight: 18, marginBottom: 8 }}>
              How active are you in a typical week?
            </Text>

            <View style={{ gap: 10 }}>
              {([
                { id: 'sedentary', label: 'SEDENTARY', emoji: '🪑', desc: 'Desk job, little or no exercise', mult: 1.2 },
                { id: 'light', label: 'LIGHT', emoji: '🏋️', desc: '1–3 days exercise per week', mult: 1.375 },
                { id: 'moderate', label: 'MODERATE', emoji: '🏃', desc: '3–5 days exercise per week', mult: 1.55 },
                { id: 'active', label: 'HARD', emoji: '🏋️‍♂️', desc: '6–7 days intense training', mult: 1.9 },
              ] as const).map((act) => {
                const isSelected = activity === act.id;
                return (
                  <Pressable
                    key={act.id}
                    onPress={() => {
                      if (saveMutation.isPending) return;
                      setActivity(act.id);
                      if (process.env.EXPO_OS === 'ios') Haptics.selectionAsync();
                    }}
                    style={{
                      flexDirection: 'row', alignItems: 'center',
                      backgroundColor: isSelected ? 'rgba(194,240,0,0.08)' : DotFuelColors.card,
                      borderWidth: isSelected ? 1.5 : 1,
                      borderColor: isSelected ? 'rgba(194,240,0,0.4)' : DotFuelColors.cardBorder,
                      borderRadius: 16, padding: 16,
                    }}
                  >
                    <Text style={{ fontSize: 28, marginRight: 14 }}>{act.emoji}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={{
                        fontSize: 16, fontWeight: '900', fontFamily: 'Inter',
                        color: DotFuelColors.white, letterSpacing: 0.5,
                      }}>
                        {act.label}
                      </Text>
                      <Text style={{ fontSize: 12, color: DotFuelColors.muted, fontWeight: '500', marginTop: 2 }}>
                        {act.desc}
                      </Text>
                    </View>
                    {/* Multiplier badge */}
                    <View style={{
                      backgroundColor: isSelected ? 'rgba(194,240,0,0.15)' : 'rgba(255,255,255,0.04)',
                      borderWidth: 1,
                      borderColor: isSelected ? 'rgba(194,240,0,0.3)' : 'rgba(255,255,255,0.08)',
                      borderRadius: 10,
                      paddingVertical: 6, paddingHorizontal: 10,
                    }}>
                      <Text style={{
                        fontSize: 14, fontWeight: '900', fontFamily: 'Inter',
                        color: isSelected ? DotFuelColors.lime : DotFuelColors.muted,
                      }}>
                        ×{act.mult}
                      </Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          </Animated.View>
        );

      // ── Step 4: Goal (Fuel Mode) ──────────────────────────────────────
      case 4:
        return (
          <Animated.View entering={FadeInDown.duration(400)} style={{ gap: 16 }}>
            <Text style={sectionTitle}>Your Goal</Text>
            <Text style={{ fontSize: 13, color: DotFuelColors.muted, fontWeight: '500', lineHeight: 18, marginBottom: 4 }}>
              This determines whether you eat at a deficit, maintenance, or surplus.
            </Text>

            <View style={{ gap: 10 }}>
              {([
                { id: 'cut', label: 'Fat Loss', emoji: '🔥', desc: 'Lose body fat while retaining lean mass', badge: '−20%' },
                { id: 'balance', label: 'Maintenance', emoji: '⚖️', desc: 'Maintain body composition and energy', badge: '0%' },
                { id: 'lean', label: 'Muscle Gain', emoji: '💪', desc: 'Build lean strength and muscle tissue', badge: '+15%' },
              ] as const).map((g) => {
                const isSelected = goal === g.id;
                return (
                  <Pressable
                    key={g.id}
                    onPress={() => {
                      if (saveMutation.isPending) return;
                      setGoal(g.id);
                      if (process.env.EXPO_OS === 'ios') Haptics.selectionAsync();
                    }}
                    style={{
                      flexDirection: 'row', alignItems: 'center',
                      backgroundColor: isSelected ? 'rgba(194,240,0,0.08)' : DotFuelColors.card,
                      borderWidth: isSelected ? 1.5 : 1,
                      borderColor: isSelected ? 'rgba(194,240,0,0.4)' : DotFuelColors.cardBorder,
                      borderRadius: 16, padding: 16,
                    }}
                  >
                    <Text style={{ fontSize: 28, marginRight: 14 }}>{g.emoji}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={{
                        fontSize: 16, fontWeight: '900', fontFamily: 'Inter',
                        color: DotFuelColors.white, letterSpacing: 0.5,
                      }}>
                        {g.label}
                      </Text>
                      <Text style={{ fontSize: 12, color: DotFuelColors.muted, fontWeight: '500', marginTop: 2 }}>
                        {g.desc}
                      </Text>
                    </View>
                    <View style={{
                      backgroundColor: isSelected ? 'rgba(194,240,0,0.15)' : 'rgba(255,255,255,0.04)',
                      borderWidth: 1,
                      borderColor: isSelected ? 'rgba(194,240,0,0.3)' : 'rgba(255,255,255,0.08)',
                      borderRadius: 10,
                      paddingVertical: 6, paddingHorizontal: 10,
                    }}>
                      <Text style={{
                        fontSize: 13, fontWeight: '900', fontFamily: 'Inter',
                        color: isSelected ? DotFuelColors.lime : DotFuelColors.muted,
                      }}>
                        {g.badge}
                      </Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          </Animated.View>
        );

      // ── Step 5: Results — Full Breakdown ──────────────────────────────
      case 5:
        return (
          <Animated.View entering={FadeIn.duration(400)} style={{ gap: 20 }}>
            {/* Mode Title */}
            <View style={{ alignItems: 'center' }}>
              <Text style={{
                fontFamily: 'Inter', fontSize: 28, fontWeight: '900',
                color: DotFuelColors.white, textAlign: 'center',
                textTransform: 'uppercase', letterSpacing: -1,
              }}>
                {modeLabel}
              </Text>
              <Text style={{
                fontSize: 13, color: DotFuelColors.muted, fontWeight: '500',
                textAlign: 'center', lineHeight: 20, marginTop: 8, maxWidth: 300,
              }}>
                {modeDesc}
              </Text>
            </View>

            {/* Target Card */}
            <View style={{
              backgroundColor: DotFuelColors.lime, borderRadius: 20,
              padding: 24, flexDirection: 'row', alignItems: 'center',
              justifyContent: 'space-between',
            }}>
              <View>
                <Text style={{
                  fontSize: 10, fontWeight: '900', color: 'rgba(0,0,0,0.5)',
                  letterSpacing: 2, textTransform: 'uppercase', marginBottom: 4,
                }}>
                  {modeLabel} TARGET
                </Text>
                <Text style={{
                  fontFamily: 'Inter', fontSize: 48, fontWeight: '900',
                  color: DotFuelColors.black, letterSpacing: -3,
                }}>
                  {calorieTarget.toLocaleString()}
                </Text>
              </View>
              <Text style={{
                fontSize: 14, fontWeight: '700', color: 'rgba(0,0,0,0.6)',
                maxWidth: 120, lineHeight: 20,
              }}>
                {goal === 'cut' ? "You're in a deficit." : goal === 'lean' ? "You're in a surplus." : "You're eating at maintenance."}
              </Text>
            </View>

            {/* Macro Breakdown */}
            <View style={{ flexDirection: 'row', gap: 10 }}>
              {[
                { label: 'PROTEIN', value: `${proteinTarget}g`, pct: `${proteinPct}%`, color: '#6fa3ff', borderColor: 'rgba(111,163,255,0.4)' },
                { label: 'CARBS', value: `${carbsTarget}g`, pct: `${carbsPct}%`, color: DotFuelColors.lime, borderColor: 'rgba(194,240,0,0.4)' },
                { label: 'FAT', value: `${fatTarget}g`, pct: `${fatPct}%`, color: '#00E8C6', borderColor: 'rgba(0,232,198,0.4)' },
              ].map(({ label, value, pct, color, borderColor }) => (
                <View key={label} style={{
                  flex: 1, backgroundColor: DotFuelColors.card, borderRadius: 14,
                  padding: 14, alignItems: 'center',
                  borderWidth: 1.5, borderColor: borderColor,
                }}>
                  <Text style={{
                    fontFamily: 'Inter', fontSize: 22, fontWeight: '900', color,
                  }}>
                    {pct}
                  </Text>
                  <Text style={{
                    fontSize: 9, fontWeight: '800', color: DotFuelColors.muted,
                    letterSpacing: 1, textTransform: 'uppercase', marginTop: 2,
                  }}>
                    {label}
                  </Text>
                  <Text style={{ fontSize: 14, fontWeight: '800', color, marginTop: 4 }}>
                    {value}
                  </Text>
                </View>
              ))}
            </View>

            {/* How We Calculated This — Collapsible */}
            <Pressable
              onPress={() => setShowCalcBreakdown(!showCalcBreakdown)}
              style={{
                backgroundColor: DotFuelColors.card, borderRadius: 16,
                borderWidth: 1, borderColor: DotFuelColors.cardBorder,
                padding: 18,
              }}
            >
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: showCalcBreakdown ? 16 : 0 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Text style={{ fontSize: 16 }}>🧬</Text>
                  <Text style={{ fontSize: 12, fontWeight: '900', color: DotFuelColors.white, letterSpacing: 0.5 }}>
                    HOW WE CALCULATED THIS
                  </Text>
                </View>
                <Text style={{ fontSize: 14, color: DotFuelColors.muted }}>
                  {showCalcBreakdown ? '▲' : '▼'}
                </Text>
              </View>

              {showCalcBreakdown && (
                <View style={{ gap: 16 }}>
                  {/* BMR Row */}
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Text style={{ fontSize: 20, marginRight: 12 }}>🧬</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 14, fontWeight: '800', color: DotFuelColors.white }}>
                        BMR (Mifflin-St Jeor)
                      </Text>
                      <Text style={{ fontSize: 11, color: DotFuelColors.muted, fontWeight: '500', marginTop: 1 }}>
                        {bmrFormula}
                      </Text>
                    </View>
                    <Text style={{
                      fontFamily: 'Inter', fontSize: 16, fontWeight: '900',
                      color: DotFuelColors.lime,
                    }}>
                      {Math.round(bmr).toLocaleString()} kcal
                    </Text>
                  </View>

                  {/* Arrow */}
                  <Text style={{ textAlign: 'center', fontSize: 16, color: DotFuelColors.muted }}>↓</Text>

                  {/* TDEE Row */}
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Text style={{ fontSize: 20, marginRight: 12 }}>🏃</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 14, fontWeight: '800', color: DotFuelColors.white }}>
                        Activity Multiplier
                      </Text>
                      <Text style={{ fontSize: 11, color: DotFuelColors.muted, fontWeight: '500', marginTop: 1 }}>
                        BMR × {actMult} ({activityLabel} · {activityDesc})
                      </Text>
                    </View>
                    <Text style={{
                      fontFamily: 'Inter', fontSize: 16, fontWeight: '900',
                      color: DotFuelColors.lime,
                    }}>
                      {tdee.toLocaleString()} kcal
                    </Text>
                  </View>

                  {/* Arrow */}
                  <Text style={{ textAlign: 'center', fontSize: 16, color: DotFuelColors.muted }}>↓</Text>

                  {/* Goal Adjustment Row */}
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Text style={{ fontSize: 20, marginRight: 12 }}>⚖️</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 14, fontWeight: '800', color: DotFuelColors.white }}>
                        Goal Adjustment
                      </Text>
                      <Text style={{ fontSize: 11, color: DotFuelColors.muted, fontWeight: '500', marginTop: 1 }}>
                        {goalAdjustmentLabel}
                      </Text>
                    </View>
                    <Text style={{
                      fontFamily: 'Inter', fontSize: 16, fontWeight: '900',
                      color: goalAdjustment === 0 ? DotFuelColors.muted : goalAdjustment < 0 ? DotFuelColors.orange : DotFuelColors.lime,
                    }}>
                      {goalAdjustment === 0 ? '0' : goalAdjustment > 0 ? `+${goalAdjustment}` : `${goalAdjustment}`} kcal
                    </Text>
                  </View>
                </View>
              )}
            </Pressable>

            {/* 2-Week Calibration Tip */}
            <Pressable
              onPress={() => setShowCalibrationTip(!showCalibrationTip)}
              style={{
                backgroundColor: DotFuelColors.card, borderRadius: 16,
                borderWidth: 1, borderColor: DotFuelColors.cardBorder,
                padding: 18,
              }}
            >
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: showCalibrationTip ? 10 : 0 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Text style={{ fontSize: 16 }}>📅</Text>
                  <Text style={{ fontSize: 12, fontWeight: '900', color: DotFuelColors.white, letterSpacing: 0.5 }}>
                    2-WEEK CALIBRATION TIP
                  </Text>
                </View>
                <Text style={{ fontSize: 14, color: DotFuelColors.muted }}>
                  {showCalibrationTip ? '▲' : '▼'}
                </Text>
              </View>

              {showCalibrationTip && (
                <Text style={{
                  fontSize: 14, color: DotFuelColors.text, fontWeight: '500',
                  lineHeight: 22,
                }}>
                  Eat at this target for 14 days and weigh yourself daily. If your weight stays stable, this is your true maintenance. We'll help you adjust if needed.
                </Text>
              )}
            </Pressable>
          </Animated.View>
        );
    }
  };

  const isLast = step === TOTAL_STEPS - 1;
  const canContinue = step === 0 || step === 3 || step === 4 || step === 5 ||
    (step === 1 && name.trim()) ||
    (step === 2 && weight && height);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: DotFuelColors.black }} edges={['top', 'left', 'right']}>
      <Animated.View style={{ flex: 1 }} exiting={FadeOut.duration(300)}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={process.env.EXPO_OS === 'ios' ? 'padding' : 'height'}>
          <ScrollView
            style={{ flex: 1, backgroundColor: DotFuelColors.black }}
            contentContainerStyle={{ paddingBottom: 120 }}
            keyboardShouldPersistTaps="handled"
          >
            {/* Back button + Step progress pills */}
            <View style={{
              flexDirection: 'row', alignItems: 'center',
              paddingTop: 16, paddingHorizontal: Spacing['2xl'], paddingBottom: 24,
              gap: 12,
            }}>
              {step > 0 && (
                <Pressable
                  onPress={back}
                  style={{
                    width: 40, height: 40, borderRadius: 20,
                    backgroundColor: DotFuelColors.card, alignItems: 'center', justifyContent: 'center',
                  }}
                >
                  <Text style={{ fontSize: 16, color: DotFuelColors.white, fontWeight: '800' }}>←</Text>
                </Pressable>
              )}
              <View style={{ flex: 1, flexDirection: 'row', gap: 5 }}>
                {Array.from({ length: TOTAL_STEPS }, (_, i) => (
                  <View key={i} style={{
                    flex: 1, height: 3, borderRadius: 2,
                    backgroundColor: i < step
                      ? DotFuelColors.lime
                      : i === step
                      ? 'rgba(194,240,0,0.4)'
                      : DotFuelColors.surface,
                  }} />
                ))}
              </View>
            </View>

            <View style={{ paddingHorizontal: Spacing['2xl'] }}>
              {renderStep()}
            </View>
          </ScrollView>

          {/* Bottom CTA */}
          <View style={{
            position: 'absolute', bottom: 0, left: 0, right: 0,
            paddingHorizontal: Spacing['2xl'], paddingBottom: 36, paddingTop: 12,
            backgroundColor: DotFuelColors.black,
          }}>
            <Button
              title={saveMutation.isPending ? 'Setting up your ecosystem...' : isLast ? "Let's Go! 🚀" : 'Continue'}
              loading={saveMutation.isPending}
              onPress={isLast ? handleCompleteOnboarding : next}
              disabled={!canContinue || saveMutation.isPending}
            />
          </View>

        </KeyboardAvoidingView>
      </Animated.View>
    </SafeAreaView>
  );
}

const sectionTitle = {
  fontSize: 30,
  fontWeight: '900' as const,
  textTransform: 'uppercase' as const,
  color: DotFuelColors.white,
  lineHeight: 32,
  letterSpacing: -1,
  marginBottom: 6,
};

const fieldLabel = {
  fontSize: 12,
  fontWeight: '700' as const,
  color: DotFuelColors.muted,
  textTransform: 'uppercase' as const,
  letterSpacing: 0.5,
  marginBottom: 4,
};

function Field({ label, value, onChange, keyboardType, placeholder, disabled }: {
  label: string; value: string; onChange: (v: string) => void; keyboardType?: any; placeholder?: string; disabled?: boolean;
}) {
  return (
    <Input
      label={label}
      value={value}
      onChangeText={onChange}
      keyboardType={keyboardType}
      placeholder={placeholder}
      editable={!disabled}
    />
  );
}
