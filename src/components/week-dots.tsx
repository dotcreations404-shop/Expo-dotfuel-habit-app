/**
 * Week dots — 7-day streak visualization.
 */
import { View, Text } from 'react-native';
import { DotFuelColors, Spacing } from '@/constants/colors';
import { fuelScoreColor } from '@/constants/colors';

interface WeekDotsProps {
  /** Array of 7 days with score percentage (0-100) and isToday flag. */
  days: Array<{
    label: string;
    scorePct: number;
    isToday: boolean;
  }>;
}

export function WeekDots({ days }: WeekDotsProps) {
  return (
    <View style={{ paddingHorizontal: Spacing['2xl'], paddingBottom: Spacing.lg }}>
      <View style={{ flexDirection: 'row', gap: 6 }}>
        {days.map((day, i) => {
          const color = fuelScoreColor(day.scorePct);
          return (
            <View key={i} style={{ flex: 1, alignItems: 'center', gap: 5 }}>
              <Text style={{
                fontSize: 9, color: DotFuelColors.muted, fontWeight: '800',
                letterSpacing: 0.5, textTransform: 'uppercase',
              }}>
                {day.label}
              </Text>
              <View style={{
                width: 36, height: 36, borderRadius: 18,
                backgroundColor: color,
                ...(day.isToday ? {
                  boxShadow: `0 0 0 2.5px ${DotFuelColors.black}, 0 0 0 4.5px rgba(194,240,0,0.6)`,
                } : {}),
              }} />
            </View>
          );
        })}
      </View>
    </View>
  );
}
