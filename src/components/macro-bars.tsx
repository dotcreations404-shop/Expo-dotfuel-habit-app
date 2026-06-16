/**
 * Macro progress bars — Protein, Carbs, Fat.
 */
import { View, Text } from 'react-native';
import { DotFuelColors, Spacing, Radius } from '@/constants/colors';

interface MacroBarsProps {
  protein: { current: number; target: number };
  carbs: { current: number; target: number };
  fat: { current: number; target: number };
}

const MACROS = [
  { key: 'protein' as const, label: 'P', color: DotFuelColors.blue },
  { key: 'carbs' as const, label: 'C', color: DotFuelColors.lime },
  { key: 'fat' as const, label: 'F', color: DotFuelColors.green },
];

export function MacroBars({ protein, carbs, fat }: MacroBarsProps) {
  const data = { protein, carbs, fat };

  return (
    <View style={{
      backgroundColor: DotFuelColors.card, borderRadius: Radius.xl,
      padding: Spacing.lg, marginHorizontal: Spacing['2xl'],
    }}>
      {MACROS.map(({ key, label, color }) => {
        const { current, target } = data[key];
        const pct = target > 0 ? Math.min(100, (current / target) * 100) : 0;

        return (
          <View key={key} style={{
            flexDirection: 'row', alignItems: 'center', gap: 10,
            marginBottom: key !== 'fat' ? 9 : 0,
          }}>
            <Text style={{
              fontFamily: 'Inter', fontSize: 13, fontWeight: '900',
              color, width: 20, textAlign: 'center',
            }}>
              {label}
            </Text>
            <View style={{
              flex: 1, height: 8, backgroundColor: 'rgba(255,255,255,0.06)',
              borderRadius: 6, overflow: 'hidden',
            }}>
              <View style={{
                height: '100%', borderRadius: 4,
                width: `${pct}%`,
                backgroundColor: color,
              }} />
            </View>
            <Text style={{
              fontSize: 11, color: DotFuelColors.muted, fontWeight: '700',
              width: 58, textAlign: 'right', fontVariant: ['tabular-nums'],
            }}>
              {current}/{target}g
            </Text>
          </View>
        );
      })}
    </View>
  );
}
