/**
 * Macro progress bars — Protein, Carbs, Fat.
 * Matches webapp: "Today's Macros" section label, full macro names (Protein/Carbs/Fat),
 * 10px label at 52px width.
 */
import { View } from 'react-native';
import { Text } from '@/components/ui/text';
import { DotFuelColors, Spacing, Radius } from '@/constants/colors';

interface MacroBarsProps {
  protein: { current: number; target: number };
  carbs: { current: number; target: number };
  fat: { current: number; target: number };
}

const MACROS = [
  { key: 'protein' as const, label: 'Protein', color: DotFuelColors.blue },
  { key: 'carbs' as const, label: 'Carbs', color: DotFuelColors.lime },
  { key: 'fat' as const, label: 'Fat', color: DotFuelColors.green },
];

export function MacroBars({ protein, carbs, fat }: MacroBarsProps) {
  const data = { protein, carbs, fat };

  return (
    <View style={{
      backgroundColor: DotFuelColors.card, borderRadius: Radius.xl,
      padding: Spacing.lg, marginHorizontal: Spacing['2xl'],
    }}>
      {/* "Today's Macros" section label — matches webapp .section-label */}
      <Text style={{
        fontSize: 10, fontWeight: '800', letterSpacing: 2,
        textTransform: 'uppercase', color: DotFuelColors.muted,
        marginBottom: 12,
      }}>
        Today's Macros
      </Text>

      {MACROS.map(({ key, label, color }) => {
        const { current, target } = data[key];
        const pct = target > 0 ? Math.min(100, (current / target) * 100) : 0;

        return (
          <View key={key} style={{
            flexDirection: 'row', alignItems: 'center', gap: 10,
            marginBottom: key !== 'fat' ? 9 : 0,
          }}>
            {/* Full macro name — matches webapp: 10px, width 52px, 0.3px letter-spacing */}
            <Text style={{
              fontSize: 10, fontWeight: '700',
              color, width: 52, letterSpacing: 0.3,
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
