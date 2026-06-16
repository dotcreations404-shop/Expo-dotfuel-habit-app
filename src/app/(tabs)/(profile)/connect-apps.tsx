/**
 * Connect Apps screen — Strava, Apple Health, Google Fit stubs.
 */
import { View, Text, ScrollView, Pressable, Alert } from 'react-native';
import { DotFuelColors, Spacing, Radius } from '@/constants/colors';

const CONNECTIONS = [
  { name: 'Apple Health', emoji: '❤️', desc: 'Sync workouts and activity', color: '#FF3B3B', available: true },
  { name: 'Google Fit', emoji: '💚', desc: 'Sync steps and calories', color: '#00E87A', available: true },
  { name: 'Strava', emoji: '🏃', desc: 'Sync runs, rides & swims', color: '#FC4C02', available: false },
];

export default function ConnectAppsScreen() {
  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: DotFuelColors.black }}
      contentContainerStyle={{ paddingBottom: 100 }}
    >
      <View style={{ paddingTop: 60, paddingHorizontal: Spacing['2xl'] }}>
        <Text style={{
          fontFamily: 'Inter', fontSize: 28, fontWeight: '900',
          color: DotFuelColors.white, letterSpacing: -0.5, marginBottom: 8,
        }}>
          Connect Apps
        </Text>
        <Text style={{
          fontSize: 13, color: DotFuelColors.muted, fontWeight: '500', marginBottom: Spacing.xl,
        }}>
          Sync your fitness data across platforms.
        </Text>

        <View style={{ gap: 10 }}>
          {CONNECTIONS.map(({ name, emoji, desc, color, available }) => (
            <Pressable
              key={name}
              onPress={() => Alert.alert('Coming Soon', `${name} integration is coming soon!`)}
              style={({ pressed }) => ({
                flexDirection: 'row', alignItems: 'center', gap: 14,
                backgroundColor: DotFuelColors.card, borderRadius: Radius.xl,
                padding: 16, borderWidth: 1, borderColor: DotFuelColors.cardBorder,
                opacity: pressed ? 0.88 : 1,
              })}
            >
              <View style={{
                width: 44, height: 44, borderRadius: 22,
                backgroundColor: `${color}20`,
                alignItems: 'center', justifyContent: 'center',
              }}>
                <Text style={{ fontSize: 22 }}>{emoji}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 14, fontWeight: '800', color: DotFuelColors.white }}>
                  {name}
                </Text>
                <Text style={{ fontSize: 11, color: DotFuelColors.muted, fontWeight: '500', marginTop: 2 }}>
                  {desc}
                </Text>
              </View>
              <View style={{
                backgroundColor: available ? DotFuelColors.limeLight : DotFuelColors.surface,
                paddingVertical: 4, paddingHorizontal: 10, borderRadius: 8,
              }}>
                <Text style={{
                  fontSize: 10, fontWeight: '800',
                  color: available ? DotFuelColors.lime : DotFuelColors.muted,
                  textTransform: 'uppercase', letterSpacing: 0.5,
                }}>
                  {available ? 'Connect' : 'Soon'}
                </Text>
              </View>
            </Pressable>
          ))}
        </View>
      </View>
    </ScrollView>
  );
}
