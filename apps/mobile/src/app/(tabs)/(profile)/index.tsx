/**
 * Profile screen — user stats, badges, mode selector, settings links.
 */
import { View, ScrollView, Pressable, Alert, Platform } from 'react-native';
import { Text } from '@/components/ui/text';
import { useRouter } from 'expo-router';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuth } from '@/contexts/auth-context';
import { DotFuelColors, Spacing, Radius } from '@/constants/colors';
import { FUEL_MODES } from '@/lib/types';
import type { FuelMode } from '@/lib/types';

export default function ProfileScreen() {
  const { profile, signOut } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const mode = (profile?.fuel_mode || 'balance') as FuelMode;
  const modeInfo = FUEL_MODES[mode] ?? FUEL_MODES.balance;

  const handleSignOut = () => {
    if (Platform.OS === 'web') {
      const confirmSignOut = window.confirm('Are you sure you want to sign out?');
      if (confirmSignOut) {
        signOut();
      }
    } else {
      Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Sign Out', style: 'destructive', onPress: signOut },
      ]);
    }
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
    <SafeAreaView style={{ flex: 1, backgroundColor: DotFuelColors.black }} edges={['top', 'left', 'right']}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header — matches webapp .profile-header */}
        <Animated.View entering={FadeIn.duration(400)} style={{
          paddingTop: 16, paddingHorizontal: Spacing['2xl'],
          alignItems: 'center', paddingBottom: Spacing.xl,
        }}>
        {/* .profile-avatar — 80px lime bg, 3px lime border, glow shadow */}
        <View style={{
          width: 80, height: 80, borderRadius: 40,
          backgroundColor: DotFuelColors.lime,
          alignItems: 'center', justifyContent: 'center',
          marginBottom: 10,
          borderWidth: 3,
          borderColor: DotFuelColors.lime,
          shadowColor: DotFuelColors.lime,
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.2,
          shadowRadius: 12,
          elevation: 8,
        }}>
          <Text style={{
            fontFamily: 'Inter', fontSize: 32, fontWeight: '900',
            color: DotFuelColors.black,
          }}>
            {(profile?.name ?? 'U').charAt(0).toUpperCase()}
          </Text>
        </View>

        {/* .profile-name — 26px 900 uppercase -1px letter-spacing */}
        <Text style={{
          fontFamily: 'Inter', fontSize: 26, fontWeight: '900',
          color: DotFuelColors.white, textTransform: 'uppercase', letterSpacing: -1,
        }}>
          {profile?.name || 'Athlete'}
        </Text>

        {/* .profile-mode — lime, uppercase, letter-spacing 2px */}
        <Text style={{
          fontSize: 11, fontWeight: '800', letterSpacing: 2,
          textTransform: 'uppercase', color: DotFuelColors.lime, marginTop: 3,
        }}>
          {modeInfo.emoji} {modeInfo.label} Mode
        </Text>
      </Animated.View>

      {/* Stats row — matches webapp .stats-grid .stat-num (lime, 28px) */}
      <Animated.View entering={FadeInDown.delay(100).duration(400)} style={{
        flexDirection: 'row', marginHorizontal: Spacing['2xl'],
        marginBottom: Spacing.xl, gap: 8,
      }}>
        {stats.map(({ label, value, emoji }) => (
          <View key={label} style={{
            flex: 1, backgroundColor: DotFuelColors.card,
            borderRadius: Radius.xl, paddingVertical: 14, paddingHorizontal: 10,
            alignItems: 'center',
          }}>
            {/* .stat-num — lime, 28px, 900, -1px letter-spacing */}
            <Text style={{
              fontFamily: 'Inter', fontSize: 28, fontWeight: '900',
              color: DotFuelColors.lime, lineHeight: 28, letterSpacing: -1,
              fontVariant: ['tabular-nums'],
            }}>
              {value}
            </Text>
            {/* .stat-label — 9px muted uppercase 1px letter-spacing */}
            <Text style={{
              fontSize: 9, color: DotFuelColors.muted, fontWeight: '700',
              textTransform: 'uppercase', letterSpacing: 1, marginTop: 4,
            }}>
              {emoji} {label}
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
    </SafeAreaView>
  );
}
