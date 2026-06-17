/**
 * Onboarding flow — 5 steps: welcome → personal info → activity → fuel mode → results.
 * Dynamic route: /(auth)/onboarding/[step].tsx
 */
import { useState, useCallback } from 'react';
import { View, ScrollView, Pressable, Alert, KeyboardAvoidingView } from 'react-native';
import { Text } from '@/components/ui/text';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useMutation } from '@tanstack/react-query';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '@/contexts/auth-context';
import { supabase } from '@/lib/supabase';
import { DotFuelColors, Spacing, Radius } from '@/constants/colors';
import { ACTIVITY_LEVELS, FUEL_MODES } from '@/lib/types';
import type { FuelMode, UserProfile } from '@/lib/types';

export default function Onboarding() {
  const [step, setStep] = useState(0);
  const { user, setProfileDirect } = useAuth();

  // ── Form state (persisted across steps via useState) ───────────────────────
  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [sex, setSex] = useState<'male' | 'female'>('male');
  const [weight, setWeight] = useState('');
  const [height, setHeight] = useState('');
  const [activity, setActivity] = useState('moderate');
  const [mode, setMode] = useState<FuelMode>('balance');

  const next = () => {
    if (process.env.EXPO_OS === 'ios') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (step < 4) {
      setStep(step + 1);
    }
  };

  // ── Calculate & save ──────────────────────────────────────────────────────
  const saveMutation = useMutation({
    mutationFn: async (): Promise<UserProfile> => {
      const weightKg = parseFloat(weight) || 70;
      const heightCm = parseFloat(height) || 170;
      const ageNum = parseInt(age, 10) || 25;
      const actMult = ACTIVITY_LEVELS.find(a => a.id === activity)?.mult ?? 1.55;

      // Mifflin-St Jeor BMR
      const bmr = sex === 'male'
        ? 10 * weightKg + 6.25 * heightCm - 5 * ageNum + 5
        : 10 * weightKg + 6.25 * heightCm - 5 * ageNum - 161;

      const tdee = Math.round(bmr * actMult);
      let calorieTarget = tdee;
      if (mode === 'cut') calorieTarget = Math.round(tdee * 0.8);
      else if (mode === 'lean') calorieTarget = Math.round(tdee * 1.15);

      const proteinTarget = Math.round(weightKg * (mode === 'cut' ? 2.2 : mode === 'lean' ? 2 : 1.6));
      const fatTarget = Math.round(calorieTarget * 0.25 / 9);
      const carbsTarget = Math.round((calorieTarget - proteinTarget * 4 - fatTarget * 9) / 4);

      console.log('[saveMutation] Upserting profile for user:', user!.id, {
        email: user!.email,
        name,
        ageNum,
        sex,
        weightKg,
        heightCm,
        activity,
        mode,
        calorieTarget,
        proteinTarget,
        carbsTarget,
        fatTarget,
      });

      // Upsert and return the saved row so we can update context without
      // a second round-trip — eliminates the race condition entirely.
      const { data, error } = await supabase.from('users').upsert({
        id: user!.id,
        email: user!.email,
        name: name.trim() || 'Athlete',
        age: ageNum,
        sex,
        weight_kg: weightKg,
        height_cm: heightCm,
        activity_level: activity,
        fuel_mode: mode,
        calorie_target: calorieTarget,
        protein_target: proteinTarget,
        carbs_target: carbsTarget,
        fat_target: fatTarget,
        water_goal_ml: 3000,
        streak_days: 0,
        best_streak: 0,
        total_logged_days: 0,
      }, { onConflict: 'id' })
        .select()
        .single();

      if (error) {
        console.error('[saveMutation] Supabase upsert error:', error);
        throw error;
      }
      console.log('[saveMutation] Upsert successful, returned:', data);
      return data as UserProfile;
    },
    onSuccess: (savedProfile: UserProfile) => {
      console.log('[saveMutation] Success handler, profile:', savedProfile);
      if (process.env.EXPO_OS === 'ios') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      // Directly update profile state with the DB-confirmed row.
      // needsOnboarding becomes false → AuthGate navigates to /(tabs)/(home).
      // No second fetch needed — no race conditions.
      setProfileDirect(savedProfile);
    },
    onError: (err: Error) => {
      console.error('[saveMutation] Mutation failed:', err);
      Alert.alert('Error saving profile', err.message);
    },
  });

  // ── Step content ──────────────────────────────────────────────────────────
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
            <Field label="Your Name" value={name} onChange={setName} placeholder="What should we call you?" />
            <Field label="Age" value={age} onChange={setAge} keyboardType="numeric" placeholder="25" />
            <View style={{ gap: 8 }}>
              <Text style={fieldLabel}>Sex</Text>
              <View style={{ flexDirection: 'row', gap: 10 }}>
                {(['male', 'female'] as const).map((s) => (
                  <Pressable
                    key={s}
                    onPress={() => {
                      setSex(s);
                      if (process.env.EXPO_OS === 'ios') Haptics.selectionAsync();
                    }}
                    style={{
                      flex: 1, alignItems: 'center', paddingVertical: 14,
                      backgroundColor: sex === s ? DotFuelColors.limeLight : DotFuelColors.card,
                      borderWidth: sex === s ? 1.5 : 1,
                      borderColor: sex === s ? DotFuelColors.lime : DotFuelColors.cardBorder,
                      borderRadius: 14,
                    }}
                  >
                    <Text style={{ fontSize: 24, marginBottom: 4 }}>{s === 'male' ? '👨' : '👩'}</Text>
                    <Text style={{
                      fontSize: 13, fontWeight: '800',
                      color: sex === s ? DotFuelColors.lime : DotFuelColors.muted,
                      textTransform: 'capitalize',
                    }}>
                      {s}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
          </Animated.View>
        );

      case 2:
        return (
          <Animated.View entering={FadeInDown.duration(400)} style={{ gap: 16 }}>
            <Text style={sectionTitle}>Your Body</Text>
            <Field label="Weight (kg)" value={weight} onChange={setWeight} keyboardType="decimal-pad" placeholder="70" />
            <Field label="Height (cm)" value={height} onChange={setHeight} keyboardType="decimal-pad" placeholder="170" />
          </Animated.View>
        );

      case 3:
        return (
          <Animated.View entering={FadeInDown.duration(400)} style={{ gap: 12 }}>
            <Text style={sectionTitle}>Activity Level</Text>
            {ACTIVITY_LEVELS.map((lvl) => (
              <Pressable
                key={lvl.id}
                onPress={() => {
                  setActivity(lvl.id);
                  if (process.env.EXPO_OS === 'ios') Haptics.selectionAsync();
                }}
                style={{
                  flexDirection: 'row', alignItems: 'center', gap: 12,
                  backgroundColor: activity === lvl.id ? DotFuelColors.limeLight : DotFuelColors.card,
                  borderWidth: activity === lvl.id ? 1.5 : 1,
                  borderColor: activity === lvl.id ? DotFuelColors.lime : DotFuelColors.cardBorder,
                  borderRadius: 14, padding: 14,
                }}
              >
                <Text style={{ fontSize: 24 }}>{lvl.emoji}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 14, fontWeight: '800', color: DotFuelColors.white }}>{lvl.label}</Text>
                  <Text style={{ fontSize: 11, color: DotFuelColors.muted, fontWeight: '500' }}>{lvl.desc}</Text>
                </View>
              </Pressable>
            ))}

            <Text style={{ ...sectionTitle, marginTop: 20 }}>Fuel Mode</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {(Object.entries(FUEL_MODES) as [FuelMode, (typeof FUEL_MODES)[FuelMode]][]).map(([key, info]) => (
                <Pressable
                  key={key}
                  onPress={() => {
                    setMode(key);
                    if (process.env.EXPO_OS === 'ios') Haptics.selectionAsync();
                  }}
                  style={{
                    flexDirection: 'row', alignItems: 'center', gap: 6,
                    backgroundColor: mode === key ? `${info.color}20` : DotFuelColors.card,
                    borderWidth: mode === key ? 1.5 : 1,
                    borderColor: mode === key ? info.color : DotFuelColors.cardBorder,
                    borderRadius: 12, paddingVertical: 10, paddingHorizontal: 14,
                  }}
                >
                  <Text style={{ fontSize: 16 }}>{info.emoji}</Text>
                  <Text style={{
                    fontSize: 12, fontWeight: '800',
                    color: mode === key ? info.color : DotFuelColors.muted,
                  }}>
                    {info.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          </Animated.View>
        );

      case 4:
        // Calculate results preview
        const weightKg = parseFloat(weight) || 70;
        const heightCm = parseFloat(height) || 170;
        const ageNum = parseInt(age, 10) || 25;
        const actMult = ACTIVITY_LEVELS.find(a => a.id === activity)?.mult ?? 1.55;
        const bmr = sex === 'male'
          ? 10 * weightKg + 6.25 * heightCm - 5 * ageNum + 5
          : 10 * weightKg + 6.25 * heightCm - 5 * ageNum - 161;
        const tdee = Math.round(bmr * actMult);
        let calorieTarget = tdee;
        if (mode === 'cut') calorieTarget = Math.round(tdee * 0.8);
        else if (mode === 'lean') calorieTarget = Math.round(tdee * 1.15);
        const proteinTarget = Math.round(weightKg * (mode === 'cut' ? 2.2 : mode === 'lean' ? 2 : 1.6));
        const fatTarget = Math.round(calorieTarget * 0.25 / 9);
        const carbsTarget = Math.round((calorieTarget - proteinTarget * 4 - fatTarget * 9) / 4);

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

  const isLast = step === 4;
  const canContinue = step === 0 || step === 4 ||
    (step === 1 && name.trim()) ||
    (step === 2 && weight && height) ||
    step === 3;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: DotFuelColors.black }} edges={['top', 'left', 'right']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={process.env.EXPO_OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView
          style={{ flex: 1, backgroundColor: DotFuelColors.black }}
          contentContainerStyle={{ paddingBottom: 120 }}
          keyboardShouldPersistTaps="handled"
        >
          {/* Step pills — matches webapp .step-pills: 3px thin horizontal bars */}
          <View style={{
            flexDirection: 'row', gap: 5, justifyContent: 'center',
            paddingTop: 16, paddingHorizontal: Spacing['2xl'], paddingBottom: 24,
          }}>
          {[0, 1, 2, 3, 4].map((i) => (
            <View key={i} style={{
              flex: 1, height: 3, borderRadius: 2,
              backgroundColor: i < step
                ? DotFuelColors.lime              // .step-pill.done
                : i === step
                ? 'rgba(194,240,0,0.4)'           // .step-pill.active
                : DotFuelColors.surface,          // inactive
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
          title={saveMutation.isPending ? 'Setting up…' : isLast ? "Let's Go! 🚀" : 'Continue'}
          onPress={isLast ? () => saveMutation.mutate() : next}
          disabled={!canContinue || saveMutation.isPending}
        />
      </View>
      </KeyboardAvoidingView>
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

function Field({ label, value, onChange, keyboardType, placeholder }: {
  label: string; value: string; onChange: (v: string) => void; keyboardType?: any; placeholder?: string;
}) {
  return (
    <Input
      label={label}
      value={value}
      onChangeText={onChange}
      keyboardType={keyboardType}
      placeholder={placeholder}
    />
  );
}
