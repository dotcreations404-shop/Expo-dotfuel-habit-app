/**
 * Water tracking card — shows intake vs goal with quick-add buttons.
 */
import { View, Text, Pressable } from 'react-native';
import * as Haptics from 'expo-haptics';
import { DotFuelColors, Spacing, Radius } from '@/constants/colors';

interface WaterCardProps {
  currentMl: number;
  goalMl: number;
  onAdd: (ml: number) => void;
}

const QUICK_AMOUNTS = [
  { label: '+250ml', ml: 250 },
  { label: '+500ml', ml: 500 },
  { label: '+1L', ml: 1000 },
];

export function WaterCard({ currentMl, goalMl, onAdd }: WaterCardProps) {
  const pct = goalMl > 0 ? Math.min(100, (currentMl / goalMl) * 100) : 0;
  const glasses = Math.round(currentMl / 250);
  const goalGlasses = Math.round(goalMl / 250);

  const handleAdd = (ml: number) => {
    if (process.env.EXPO_OS === 'ios') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onAdd(ml);
  };

  return (
    <View style={{
      backgroundColor: DotFuelColors.card, borderRadius: Radius.xl,
      padding: Spacing.lg, marginHorizontal: Spacing['2xl'],
    }}>
      {/* Header */}
      <View style={{
        flexDirection: 'row', alignItems: 'center',
        justifyContent: 'space-between', marginBottom: 12,
      }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Text style={{ fontSize: 22 }}>💧</Text>
          <View>
            <Text style={{
              fontSize: 13, fontWeight: '800', color: DotFuelColors.white,
              textTransform: 'uppercase', letterSpacing: 0.5,
            }}>
              Water
            </Text>
            <Text style={{ fontSize: 11, color: DotFuelColors.muted, marginTop: 1, fontWeight: '500' }}>
              {glasses}/{goalGlasses} glasses
            </Text>
          </View>
        </View>
        <View>
          <Text style={{
            fontFamily: 'Inter', fontSize: 22, fontWeight: '900',
            letterSpacing: -1, color: DotFuelColors.water,
            fontVariant: ['tabular-nums'],
          }}>
            {currentMl}
            <Text style={{ fontSize: 11, fontWeight: '700', color: DotFuelColors.muted }}>
              {' '}ml
            </Text>
          </Text>
        </View>
      </View>

      {/* Progress bar */}
      <View style={{
        height: 8, backgroundColor: DotFuelColors.surface,
        borderRadius: 4, overflow: 'hidden', marginBottom: 10,
      }}>
        <View style={{
          height: '100%', borderRadius: 4,
          width: `${pct}%`,
          backgroundColor: DotFuelColors.water,
        }} />
      </View>

      {/* Quick-add buttons */}
      <View style={{ flexDirection: 'row', gap: 8 }}>
        {QUICK_AMOUNTS.map(({ label, ml }) => (
          <Pressable
            key={ml}
            onPress={() => handleAdd(ml)}
            style={({ pressed }) => ({
              flex: 1, backgroundColor: DotFuelColors.waterLight,
              borderWidth: 1, borderColor: 'rgba(79,195,247,0.2)',
              borderRadius: 10, paddingVertical: 8, alignItems: 'center',
              transform: [{ scale: pressed ? 0.97 : 1 }],
            })}
          >
            <Text style={{
              fontFamily: 'Inter', fontSize: 12, fontWeight: '800',
              color: DotFuelColors.water, textTransform: 'uppercase', letterSpacing: 0.5,
            }}>
              {label}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}
