/**
 * Calorie summary card — shows eaten, target, and remaining with progress bar.
 */
import { View, Text } from 'react-native';
import { DotFuelColors, Spacing, Radius } from '@/constants/colors';

interface CalorieSummaryProps {
  eaten: number;
  target: number;
  burned: number;
}

export function CalorieSummary({ eaten, target, burned }: CalorieSummaryProps) {
  const remaining = Math.max(0, target - eaten + burned);
  const pct = target > 0 ? Math.min(100, (eaten / target) * 100) : 0;

  return (
    <View style={{
      backgroundColor: DotFuelColors.card, borderRadius: Radius['2xl'],
      padding: Spacing.lg, marginHorizontal: Spacing['2xl'],
      borderWidth: 1, borderColor: DotFuelColors.cardBorder,
    }}>
      {/* Numbers row */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <CalItem label="EATEN" value={eaten} color={DotFuelColors.lime} />
        <View style={{ width: 1, height: 34, backgroundColor: DotFuelColors.surface }} />
        <CalItem label="TARGET" value={target} color={DotFuelColors.white} />
        <View style={{ width: 1, height: 34, backgroundColor: DotFuelColors.surface }} />
        <CalItem label="REMAINING" value={remaining} color={DotFuelColors.green} />
      </View>

      {/* Progress bar */}
      <View style={{
        height: 9, backgroundColor: 'rgba(255,255,255,0.06)',
        borderRadius: 6, overflow: 'hidden', marginTop: 4,
      }}>
        <View style={{
          height: '100%', borderRadius: 4,
          width: `${pct}%`,
          backgroundColor: DotFuelColors.lime,
        }} />
      </View>
    </View>
  );
}

function CalItem({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <View style={{ flex: 1, alignItems: 'center' }}>
      <Text style={{
        fontFamily: 'Inter', fontSize: 26, fontWeight: '900',
        color, lineHeight: 26, letterSpacing: -1,
        fontVariant: ['tabular-nums'],
      }}>
        {value}
      </Text>
      <Text style={{
        fontSize: 9, color: DotFuelColors.muted, fontWeight: '700',
        letterSpacing: 1.5, textTransform: 'uppercase', marginTop: 2,
      }}>
        {label}
      </Text>
    </View>
  );
}
