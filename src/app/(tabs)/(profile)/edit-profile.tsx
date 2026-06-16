/**
 * Edit profile screen — name, age, weight, height, activity level, fuel mode.
 */
import { useState } from 'react';
import { View, Text, ScrollView, TextInput, Pressable, Alert, KeyboardAvoidingView } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { useAuth } from '@/contexts/auth-context';
import { supabase } from '@/lib/supabase';
import { DotFuelColors, Spacing, Radius } from '@/constants/colors';
import { ACTIVITY_LEVELS, FUEL_MODES } from '@/lib/types';
import type { FuelMode } from '@/lib/types';

export default function EditProfileScreen() {
  const { profile, user, refreshProfile } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();

  const [name, setName] = useState(profile?.name ?? '');
  const [age, setAge] = useState(profile?.age?.toString() ?? '');
  const [weight, setWeight] = useState(profile?.weight_kg?.toString() ?? '');
  const [height, setHeight] = useState(profile?.height_cm?.toString() ?? '');
  const [activity, setActivity] = useState(profile?.activity_level ?? 'moderate');
  const [mode, setMode] = useState<FuelMode>((profile?.fuel_mode ?? 'balance') as FuelMode);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const weightKg = parseFloat(weight) || 70;
      const heightCm = parseFloat(height) || 170;
      const ageNum = parseInt(age, 10) || 25;
      const sex = profile?.sex ?? 'male';
      const actMult = ACTIVITY_LEVELS.find(a => a.id === activity)?.mult ?? 1.55;

      // Mifflin-St Jeor
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

      const { error } = await supabase
        .from('users')
        .update({
          name: name.trim() || 'Athlete',
          age: ageNum,
          weight_kg: weightKg,
          height_cm: heightCm,
          activity_level: activity,
          fuel_mode: mode,
          calorie_target: calorieTarget,
          protein_target: proteinTarget,
          carbs_target: carbsTarget,
          fat_target: fatTarget,
        })
        .eq('id', user!.id);

      if (error) throw error;
    },
    onSuccess: async () => {
      if (process.env.EXPO_OS === 'ios') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      await refreshProfile();
      queryClient.invalidateQueries({ queryKey: ['daily-log'] });
      router.back();
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
        keyboardShouldPersistTaps="handled"
      >
        <View style={{ paddingTop: 60, paddingHorizontal: Spacing['2xl'] }}>
          <Text style={{
            fontFamily: 'Inter', fontSize: 28, fontWeight: '900',
            color: DotFuelColors.white, letterSpacing: -0.5, marginBottom: Spacing.xl,
          }}>
            Edit Profile
          </Text>

          {/* Form fields */}
          <View style={{ gap: 14 }}>
            <Field label="Name" value={name} onChange={setName} />
            <Field label="Age" value={age} onChange={setAge} keyboardType="numeric" />
            <Field label="Weight (kg)" value={weight} onChange={setWeight} keyboardType="decimal-pad" />
            <Field label="Height (cm)" value={height} onChange={setHeight} keyboardType="decimal-pad" />
          </View>

          {/* Activity Level */}
          <Text style={{
            fontSize: 13, fontWeight: '800', color: DotFuelColors.white,
            textTransform: 'uppercase', letterSpacing: 1, marginTop: 24, marginBottom: 10,
          }}>
            Activity Level
          </Text>
          <View style={{ gap: 6 }}>
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
                  borderRadius: 12, padding: 12,
                }}
              >
                <Text style={{ fontSize: 20 }}>{lvl.emoji}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 13, fontWeight: '800', color: DotFuelColors.white }}>
                    {lvl.label}
                  </Text>
                  <Text style={{ fontSize: 11, color: DotFuelColors.muted, fontWeight: '500' }}>
                    {lvl.desc}
                  </Text>
                </View>
              </Pressable>
            ))}
          </View>

          {/* Fuel Mode */}
          <Text style={{
            fontSize: 13, fontWeight: '800', color: DotFuelColors.white,
            textTransform: 'uppercase', letterSpacing: 1, marginTop: 24, marginBottom: 10,
          }}>
            Fuel Mode
          </Text>
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
                  borderRadius: 12, paddingVertical: 8, paddingHorizontal: 14,
                }}
              >
                <Text style={{ fontSize: 14 }}>{info.emoji}</Text>
                <Text style={{
                  fontSize: 12, fontWeight: '800',
                  color: mode === key ? info.color : DotFuelColors.muted,
                }}>
                  {info.label}
                </Text>
              </Pressable>
            ))}
          </View>

          {/* Save */}
          <Pressable
            onPress={() => saveMutation.mutate()}
            disabled={saveMutation.isPending}
            style={({ pressed }) => ({
              marginTop: 28, backgroundColor: DotFuelColors.lime,
              borderRadius: Radius.lg, paddingVertical: 16, alignItems: 'center',
              opacity: saveMutation.isPending ? 0.4 : pressed ? 0.88 : 1,
            })}
          >
            <Text style={{
              fontFamily: 'Inter', fontSize: 14, fontWeight: '800',
              color: DotFuelColors.black, textTransform: 'uppercase', letterSpacing: 0.5,
            }}>
              {saveMutation.isPending ? 'Saving…' : 'Save Profile'}
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Field({ label, value, onChange, keyboardType }: {
  label: string; value: string; onChange: (v: string) => void; keyboardType?: any;
}) {
  return (
    <View>
      <Text style={{
        fontSize: 11, fontWeight: '700', color: DotFuelColors.muted,
        textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6,
      }}>
        {label}
      </Text>
      <TextInput
        value={value}
        onChangeText={onChange}
        keyboardType={keyboardType}
        style={{
          backgroundColor: DotFuelColors.card,
          borderWidth: 1, borderColor: DotFuelColors.surfaceBorder,
          borderRadius: 12, paddingVertical: 12, paddingHorizontal: 14,
          color: DotFuelColors.white, fontSize: 15, fontWeight: '600',
        }}
      />
    </View>
  );
}
