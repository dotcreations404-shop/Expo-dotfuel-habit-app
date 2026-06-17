/**
 * Water tracking card — matches webapp .water-card exactly.
 * Shows liters (not ml), "Water Intake" title, subtitle "X.XL of X.XL goal",
 * gradient blue bar, quick-add buttons: +250ml / +500ml / +750ml / Goal ⚙️.
 */
import { View, Pressable } from 'react-native';
import { Text } from '@/components/ui/text';
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
  { label: '+750ml', ml: 750 },
];

/** Formats ml as liters string: 1250 → "1.2L" */
function toL(ml: number): string {
  return `${(ml / 1000).toFixed(1)}L`;
}

export function WaterCard({ currentMl, goalMl, onAdd }: WaterCardProps) {
  const pct = goalMl > 0 ? Math.min(100, (currentMl / goalMl) * 100) : 0;

  const handleAdd = (ml: number) => {
    if (process.env.EXPO_OS === 'ios') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onAdd(ml);
  };

  return (
    <View style={{
      backgroundColor: DotFuelColors.card, borderRadius: Radius.xl,
      padding: Spacing.lg, marginHorizontal: Spacing['2xl'],
    }}>
      {/* Header — matches webapp .water-card-top */}
      <View style={{
        flexDirection: 'row', alignItems: 'center',
        justifyContent: 'space-between', marginBottom: 12,
      }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          {/* .water-icon */}
          <Text style={{ fontSize: 22 }}>💧</Text>
          <View>
            {/* .water-title — uppercase, 13px, 800 */}
            <Text style={{
              fontSize: 13, fontWeight: '800', color: DotFuelColors.white,
              textTransform: 'uppercase', letterSpacing: 0.5,
            }}>
              Water Intake
            </Text>
            {/* .water-subtitle — "X.XL of X.XL goal" */}
            <Text style={{ fontSize: 11, color: DotFuelColors.muted, marginTop: 1, fontWeight: '500' }}>
              {toL(currentMl)} of {toL(goalMl)} goal
            </Text>
          </View>
        </View>
        {/* .water-val — liters in blue, matching webapp */}
        <View>
          <Text style={{
            fontFamily: 'Inter', fontSize: 22, fontWeight: '900',
            letterSpacing: -1, color: DotFuelColors.water,
            fontVariant: ['tabular-nums'],
          }}>
            {toL(currentMl)}
          </Text>
        </View>
      </View>

      {/* Progress bar — matches webapp: linear-gradient(90deg, #29B6F6, #4FC3F7) */}
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

      {/* Quick-add buttons — matches webapp .water-quick-btns */}
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
