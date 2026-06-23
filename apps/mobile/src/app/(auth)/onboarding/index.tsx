/**
 * Onboarding flow — 5 steps: welcome → personal info → activity → fuel mode → results.
 * Dynamic route: /(auth)/onboarding/[step].tsx
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

export default function Onboarding() {
  const [step, setStep] = useState(0);
  const { user, profile, needsOnboarding, setProfileDirect } = useAuth();
  const router = useRouter();

  // ── Form state (persisted across steps via useState) ───────────────────────
  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [sex, setSex] = useState<'male' | 'female'>('male');
  const [weight, setWeight] = useState('');
  const [height, setHeight] = useState('');
  const [goal, setGoal] = useState<'cut' | 'balance' | 'lean'>('balance');
  const [activity, setActivity] = useState<'sedentary' | 'light' | 'moderate' | 'active'>('moderate');

  const next = () => {
    if (process.env.EXPO_OS === 'ios') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (step < 5) {
      setStep(step + 1);
    }
  };

  // ── Calculate metrics ──────────────────────────────────────────────────────
  const weightKg = parseFloat(weight) || 70;
  const heightCm = parseFloat(height) || 170;
  const ageNum = parseInt(age, 10) || 25;

  // Real-time BMI
  const heightM = heightCm / 100;
  const bmi = heightM > 0 ? weightKg / (heightM * heightM) : 0;

  // Mifflin-St Jeor BMR
  const bmr = sex === 'male'
    ? 10 * weightKg + 6.25 * heightCm - 5 * ageNum + 5
    : 10 * weightKg + 6.25 * heightCm - 5 * ageNum - 161;

  // Activity level multipliers
  const actMult = activity === 'sedentary' ? 1.2
                : activity === 'light' ? 1.375
                : activity === 'moderate' ? 1.55
                : activity === 'active' ? 1.725
                : 1.55;

  const tdee = Math.round(bmr * actMult);
  let calorieTarget = tdee;
  if (goal === 'cut') calorieTarget = Math.round(tdee * 0.8);
  else if (goal === 'lean') calorieTarget = Math.round(tdee * 1.15);

  const proteinTarget = Math.round(weightKg * (goal === 'cut' ? 2.2 : goal === 'lean' ? 2.0 : 1.6));
  const fatTarget = Math.round(calorieTarget * 0.25 / 9);
  const carbsTarget = Math.round((calorieTarget - proteinTarget * 4 - fatTarget * 9) / 4);

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

  const renderStep = () => {
    switch (step) {
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
              We'll calculate your daily calorie and macro targets based on your body and goals.
            </Text>
          </Animated.View>
        );

      case 1:
        return (
          <Animated.View entering={FadeInDown.duration(400)} style={{ gap: 16 }}>
            <Text style={sectionTitle}>About You</Text>
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

      case 2:
        return (
          <Animated.View entering={FadeInDown.duration(400)} style={{ gap: 16 }}>
            <Text style={sectionTitle}>Your Body</Text>
            <Field label="Weight (kg)" value={weight} onChange={setWeight} keyboardType="decimal-pad" placeholder="70" disabled={saveMutation.isPending} />
            <Field label="Height (cm)" value={height} onChange={setHeight} keyboardType="decimal-pad" placeholder="170" disabled={saveMutation.isPending} />

            {/* BMR & BMI Badge Panel */}
            {weight && height && (
              <Animated.View entering={FadeIn.duration(300)} style={{
                flexDirection: 'row', gap: 12, marginTop: 12,
                backgroundColor: DotFuelColors.card, borderRadius: 16,
                padding: 16, borderWidth: 1, borderColor: DotFuelColors.cardBorder,
              }}>
                <View style={{ flex: 1, alignItems: 'center' }}>
                  <Text style={{ fontSize: 9, fontWeight: '800', color: DotFuelColors.muted, textTransform: 'uppercase', letterSpacing: 1 }}>BMI</Text>
                  <Text style={{ fontSize: 24, fontWeight: '900', color: DotFuelColors.white, marginTop: 2 }}>
                    {bmi > 0 ? bmi.toFixed(1) : '—'}
                  </Text>
                  <Text style={{
                    fontSize: 10,
                    color: bmi < 18.5 ? '#6fa3ff' : bmi < 25 ? DotFuelColors.lime : bmi < 30 ? '#FF8C00' : '#FF3B3B',
                    fontWeight: '800', marginTop: 2
                  }}>
                    {bmi < 18.5 ? 'Underweight' : bmi < 25 ? 'Normal' : bmi < 30 ? 'Overweight' : 'Obese'}
                  </Text>
                </View>

                <View style={{ width: 1, height: '80%', backgroundColor: 'rgba(255,255,255,0.06)', alignSelf: 'center' }} />

                <View style={{ flex: 1, alignItems: 'center' }}>
                  <Text style={{ fontSize: 9, fontWeight: '800', color: DotFuelColors.muted, textTransform: 'uppercase', letterSpacing: 1 }}>BMR</Text>
                  <Text style={{ fontSize: 24, fontWeight: '900', color: DotFuelColors.white, marginTop: 2 }}>
                    {bmr > 0 ? Math.round(bmr) : '—'}
                  </Text>
                  <Text style={{ fontSize: 10, color: DotFuelColors.muted, fontWeight: '800', marginTop: 2 }}>kcal/day</Text>
                </View>
              </Animated.View>
            )}
          </Animated.View>
        );

      case 3:
        return (
          <Animated.View entering={FadeInDown.duration(400)} style={{ gap: 16 }}>
            <Text style={sectionTitle}>Before You Fuel</Text>
            <Text style={{ fontSize: 13, color: DotFuelColors.muted, fontWeight: '500', lineHeight: 18 }}>
              Understand the visual language of the application's central fuel metrics.
            </Text>

            <View style={{ gap: 12, marginTop: 8 }}>
              {/* Blue */}
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: DotFuelColors.card, borderWidth: 1, borderColor: DotFuelColors.cardBorder, borderLeftWidth: 3, borderLeftColor: DotFuelColors.blue, borderRadius: 14, padding: 16 }}>
                <Text style={{ fontSize: 24 }}>🔵</Text>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 14, fontWeight: '800', color: DotFuelColors.white }}>Blue State (80% Fueled)</Text>
                  <Text style={{ fontSize: 12, color: DotFuelColors.muted, marginTop: 2, lineHeight: 16 }}>
                    Within striking distance of optimal execution.
                  </Text>
                </View>
              </View>

              {/* Red */}
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: DotFuelColors.card, borderWidth: 1, borderColor: DotFuelColors.cardBorder, borderLeftWidth: 3, borderLeftColor: DotFuelColors.red, borderRadius: 14, padding: 16 }}>
                <Text style={{ fontSize: 24 }}>🔴</Text>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 14, fontWeight: '800', color: DotFuelColors.red }}>Glowing Red State (&lt;30% Fueled)</Text>
                  <Text style={{ fontSize: 12, color: DotFuelColors.muted, marginTop: 2, lineHeight: 16 }}>
                    Fueling is insufficient or poor; an urgent trigger to step up intake.
                  </Text>
                </View>
              </View>

              {/* Green */}
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: DotFuelColors.card, borderWidth: 1, borderColor: DotFuelColors.cardBorder, borderLeftWidth: 3, borderLeftColor: DotFuelColors.lime, borderRadius: 14, padding: 16 }}>
                <View style={{
                  width: 20, height: 20, borderRadius: 10,
                  backgroundColor: DotFuelColors.lime,
                  shadowColor: DotFuelColors.lime,
                  shadowOffset: { width: 0, height: 0 },
                  shadowOpacity: 0.6,
                  shadowRadius: 6,
                  elevation: 4,
                  alignItems: 'center', justifyContent: 'center'
                }} />
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 14, fontWeight: '800', color: DotFuelColors.lime }}>Neon Green State (100% Fully Fueled)</Text>
                  <Text style={{ fontSize: 12, color: DotFuelColors.muted, marginTop: 2, lineHeight: 16 }}>
                    Perfect synchronization of targeted performance nutrition.
                  </Text>
                </View>
              </View>
            </View>
          </Animated.View>
        );

      case 4:
        return (
          <Animated.View entering={FadeInDown.duration(400)} style={{ gap: 16 }}>
            <Text style={sectionTitle}>Goal & Activity</Text>

            {/* Goal Selector */}
            <View style={{ gap: 8 }}>
              <Text style={fieldLabel}>Primary Goal</Text>
              <View style={{ gap: 8 }}>
                {([
                  { id: 'cut', label: 'Fat Loss', emoji: '🔥', desc: 'Lose body fat while retaining lean mass' },
                  { id: 'balance', label: 'Maintenance', emoji: '⚖️', desc: 'Maintain body composition and energy' },
                  { id: 'lean', label: 'Muscle Gain', emoji: '💪', desc: 'Build lean strength and muscle tissue' }
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
                        flexDirection: 'row', alignItems: 'center', gap: 12,
                        backgroundColor: isSelected ? 'rgba(30,73,207,0.12)' : DotFuelColors.card,
                        borderWidth: isSelected ? 1.5 : 1,
                        borderColor: isSelected ? '#1E49CF' : DotFuelColors.cardBorder,
                        borderRadius: 14, padding: 14,
                      }}
                    >
                      <Text style={{ fontSize: 24 }}>{g.emoji}</Text>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 14, fontWeight: '800', color: DotFuelColors.white }}>{g.label}</Text>
                        <Text style={{ fontSize: 11, color: DotFuelColors.muted, fontWeight: '500', marginTop: 2 }}>{g.desc}</Text>
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            {/* Activity Level Selector */}
            <View style={{ gap: 8, marginTop: 12 }}>
              <Text style={fieldLabel}>Exercise Activity Multiplier</Text>
              <View style={{ gap: 8 }}>
                {([
                  { id: 'sedentary', label: 'Sedentary', emoji: '🪑', desc: 'Little to no exercise' },
                  { id: 'light', label: 'Lightly Active', emoji: '🚶', desc: '1-3 days/week exercise' },
                  { id: 'moderate', label: 'Moderately Active', emoji: '🏃', desc: '3-5 days/week exercise' },
                  { id: 'active', label: 'Highly Active', emoji: '🏋️', desc: '6-7 days intense training/week' }
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
                        flexDirection: 'row', alignItems: 'center', gap: 12,
                        backgroundColor: isSelected ? 'rgba(30,73,207,0.12)' : DotFuelColors.card,
                        borderWidth: isSelected ? 1.5 : 1,
                        borderColor: isSelected ? '#1E49CF' : DotFuelColors.cardBorder,
                        borderRadius: 14, padding: 14,
                      }}
                    >
                      <Text style={{ fontSize: 24 }}>{act.emoji}</Text>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 14, fontWeight: '800', color: DotFuelColors.white }}>{act.label}</Text>
                        <Text style={{ fontSize: 11, color: DotFuelColors.muted, fontWeight: '500', marginTop: 2 }}>{act.desc}</Text>
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          </Animated.View>
        );

      case 5:
        return (
          <Animated.View entering={FadeIn.duration(400)} style={{ alignItems: 'center' }}>
            <View style={{
              width: 120, height: 120, borderRadius: 60,
              backgroundColor: DotFuelColors.lime, marginBottom: 20,
              alignItems: 'center', justifyContent: 'center',
            }}>
              <Text style={{
                fontFamily: 'Inter', fontSize: 36, fontWeight: '900',
                color: DotFuelColors.black, letterSpacing: -2,
              }}>
                {calorieTarget}
              </Text>
              <Text style={{ fontSize: 8, fontWeight: '800', color: 'rgba(0,0,0,0.5)', letterSpacing: 2 }}>
                KCAL/DAY
              </Text>
            </View>

            <Text style={{
              fontFamily: 'Inter', fontSize: 22, fontWeight: '900',
              color: DotFuelColors.white, textAlign: 'center', marginBottom: 20,
            }}>
              Your fuel plan is ready! 🚀
            </Text>

            <View style={{
              flexDirection: 'row', gap: 12, marginBottom: 20, width: '100%',
            }}>
              {[
                { label: 'Protein', value: `${proteinTarget}g`, color: DotFuelColors.blue },
                { label: 'Carbs', value: `${carbsTarget}g`, color: DotFuelColors.lime },
                { label: 'Fat', value: `${fatTarget}g`, color: DotFuelColors.green },
              ].map(({ label, value, color }) => (
                <View key={label} style={{
                  flex: 1, backgroundColor: DotFuelColors.card, borderRadius: 16,
                  padding: 14, alignItems: 'center',
                }}>
                  <Text style={{
                    fontFamily: 'Inter', fontSize: 22, fontWeight: '900', color,
                  }}>
                    {value}
                  </Text>
                  <Text style={{ fontSize: 10, fontWeight: '700', color: DotFuelColors.muted, marginTop: 2 }}>
                    {label}
                  </Text>
                </View>
              ))}
            </View>
          </Animated.View>
        );
    }
  };

  const isLast = step === 5;
  const canContinue = step === 0 || step === 3 || step === 5 ||
    (step === 1 && name.trim()) ||
    (step === 2 && weight && height) ||
    step === 4;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: DotFuelColors.black }} edges={['top', 'left', 'right']}>
      <Animated.View style={{ flex: 1 }} exiting={FadeOut.duration(300)}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={process.env.EXPO_OS === 'ios' ? 'padding' : 'height'}>
          <ScrollView
            style={{ flex: 1, backgroundColor: DotFuelColors.black }}
            contentContainerStyle={{ paddingBottom: 120 }}
            keyboardShouldPersistTaps="handled"
          >
            {/* Step pills */}
            <View style={{
              flexDirection: 'row', gap: 5, justifyContent: 'center',
              paddingTop: 16, paddingHorizontal: Spacing['2xl'], paddingBottom: 24,
            }}>
              {[0, 1, 2, 3, 4, 5].map((i) => (
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

