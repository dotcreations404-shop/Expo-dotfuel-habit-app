/**
 * Profile screen — user stats, badges, mode selector, settings links.
 */
import { View, Text, ScrollView, Pressable, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

import { useAuth } from '@/contexts/auth-context';
import { DotFuelColors, Spacing, Radius } from '@/constants/colors';
import { FUEL_MODES } from '@/lib/types';
import type { FuelMode } from '@/lib/types';

export default function ProfileScreen() {
  const { profile, signOut } = useAuth();
  const router = useRouter();

  const mode = (profile?.fuel_mode || 'balance') as FuelMode;
  const modeInfo = FUEL_MODES[mode] ?? FUEL_MODES.balance;

  const handleSignOut = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: signOut },
    ]);
  };

  const stats = [
    { label: 'Streak', value: `${profile?.streak_days ?? 0}`, emoji: '🔥' },
    { label: 'Best', value: `${profile?.best_streak ?? 0}`, emoji: '⭐' },
    { label: 'Logged', value: `${profile?.total_logged_days ?? 0}`, emoji: '📊' },
  ];

  const settingsLinks = [
    { label: 'Edit Profile', emoji: '✏️', route: '/(tabs)/(profile)/edit-profile' },
    { label: 'Connect Apps', emoji: '🔗', route: '/(tabs)/(profile)/connect-apps' },
    { label: 'Support & FAQ', emoji: '💬', route: '/(tabs)/(profile)/support' },
    { label: 'About DotFuel', emoji: 'ℹ️', route: '/(tabs)/(profile)/about' },
  ];

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: DotFuelColors.black }}
      contentContainerStyle={{ paddingBottom: 100 }}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <Animated.View entering={FadeIn.duration(400)} style={{
        paddingTop: 60, paddingHorizontal: Spacing['2xl'],
        alignItems: 'center', paddingBottom: Spacing.xl,
      }}>
        {/* Avatar */}
        <View style={{
          width: 80, height: 80, borderRadius: 40,
          backgroundColor: DotFuelColors.lime,
          alignItems: 'center', justifyContent: 'center',
          marginBottom: 14,
        }}>
          <Text style={{
            fontFamily: 'Inter', fontSize: 30, fontWeight: '900',
            color: DotFuelColors.black,
          }}>
            {(profile?.name ?? 'U').charAt(0).toUpperCase()}
          </Text>
        </View>

        <Text style={{
          fontFamily: 'Inter', fontSize: 24, fontWeight: '900',
          color: DotFuelColors.white, letterSpacing: -0.5,
        }}>
          {profile?.name || 'Athlete'}
        </Text>

        {/* Mode badge */}
        <View style={{
          flexDirection: 'row', alignItems: 'center', gap: 6,
          marginTop: 8, backgroundColor: DotFuelColors.card,
          paddingVertical: 5, paddingHorizontal: 14, borderRadius: 20,
        }}>
          <Text style={{ fontSize: 14 }}>{modeInfo.emoji}</Text>
          <Text style={{
            fontSize: 12, fontWeight: '800', color: modeInfo.color,
            textTransform: 'uppercase', letterSpacing: 0.5,
          }}>
            {modeInfo.label} Mode
          </Text>
        </View>
      </Animated.View>

      {/* Stats row */}
      <Animated.View entering={FadeInDown.delay(100).duration(400)} style={{
        flexDirection: 'row', marginHorizontal: Spacing['2xl'],
        marginBottom: Spacing.xl, gap: 10,
      }}>
        {stats.map(({ label, value, emoji }) => (
          <View key={label} style={{
            flex: 1, backgroundColor: DotFuelColors.card,
            borderRadius: Radius.xl, padding: 16, alignItems: 'center',
            borderWidth: 1, borderColor: DotFuelColors.cardBorder,
          }}>
            <Text style={{ fontSize: 20, marginBottom: 4 }}>{emoji}</Text>
            <Text style={{
              fontFamily: 'Inter', fontSize: 24, fontWeight: '900',
              color: DotFuelColors.white, fontVariant: ['tabular-nums'],
            }}>
              {value}
            </Text>
            <Text style={{
              fontSize: 9, color: DotFuelColors.muted, fontWeight: '700',
              textTransform: 'uppercase', letterSpacing: 1.5, marginTop: 2,
            }}>
              {label}
            </Text>
          </View>
        ))}
      </Animated.View>

      {/* Fuel Mode Selector */}
      <Animated.View entering={FadeInDown.delay(150).duration(400)} style={{
        marginHorizontal: Spacing['2xl'], marginBottom: Spacing.xl,
      }}>
        <Text style={{
          fontSize: 13, fontWeight: '800', color: DotFuelColors.white,
          textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10,
        }}>
          Fuel Mode
        </Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {(Object.entries(FUEL_MODES) as [FuelMode, typeof modeInfo][]).map(([key, info]) => (
            <Pressable
              key={key}
              onPress={() => {
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
      </Animated.View>

      {/* Settings links */}
      <Animated.View entering={FadeInDown.delay(200).duration(400)} style={{
        marginHorizontal: Spacing['2xl'], gap: 6, marginBottom: Spacing.xl,
      }}>
        {settingsLinks.map(({ label, emoji, route }) => (
          <Pressable
            key={label}
            onPress={() => router.push(route as any)}
            style={({ pressed }) => ({
              flexDirection: 'row', alignItems: 'center', gap: 14,
              backgroundColor: DotFuelColors.card, borderRadius: Radius.lg,
              padding: 15, borderWidth: 1, borderColor: DotFuelColors.cardBorder,
              opacity: pressed ? 0.88 : 1,
            })}
          >
            <Text style={{ fontSize: 18, width: 26, textAlign: 'center' }}>{emoji}</Text>
            <Text style={{ flex: 1, fontSize: 14, fontWeight: '700', color: DotFuelColors.white }}>
              {label}
            </Text>
            <Text style={{ fontSize: 16, color: DotFuelColors.muted }}>›</Text>
          </Pressable>
        ))}
      </Animated.View>

      {/* Sign out */}
      <View style={{ marginHorizontal: Spacing['2xl'], gap: 10, marginBottom: Spacing['3xl'] }}>
        <Pressable
          onPress={handleSignOut}
          style={({ pressed }) => ({
            backgroundColor: DotFuelColors.redLight,
            borderRadius: Radius.lg, paddingVertical: 14, alignItems: 'center',
            opacity: pressed ? 0.88 : 1,
          })}
        >
          <Text style={{
            fontFamily: 'Inter', fontSize: 13, fontWeight: '800',
            color: DotFuelColors.red, textTransform: 'uppercase', letterSpacing: 0.5,
          }}>
            Sign Out
          </Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}
