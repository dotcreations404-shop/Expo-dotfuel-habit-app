/**
 * Week dots — 7-day streak visualization.
 * Matches webapp: "This Week" section label above dots row.
 */
import { View } from 'react-native';
import { Text } from '@/components/ui/text';
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
      {/* "This Week" section label — matches webapp .section-label */}
      <Text style={{
        fontSize: 10, fontWeight: '800', letterSpacing: 2,
        textTransform: 'uppercase', color: DotFuelColors.muted,
        marginBottom: 10,
      }}>
        This Week
      </Text>

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
                  // Matches webapp .day-dot.today
                  shadowColor: DotFuelColors.lime,
                  shadowOffset: { width: 0, height: 0 },
                  shadowOpacity: 0.6,
                  shadowRadius: 4,
                  borderWidth: 2.5,
                  borderColor: 'rgba(194,240,0,0.6)',
                } : {}),
              }} />
            </View>
          );
        })}
      </View>
    </View>
  );
}
