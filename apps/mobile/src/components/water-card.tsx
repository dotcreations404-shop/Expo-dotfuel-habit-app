/**
 * Water tracking card — matches webapp .water-card exactly.
 * Shows liters (not ml), "Water Intake" title, subtitle "X.XL of X.XL goal",
 * gradient blue bar, quick-add buttons: +250ml / +500ml / +750ml / Goal ⚙️.
 */
import React, { useState } from 'react';
import { View, TextInput } from 'react-native';
import { Text } from '@/components/ui/text';
import * as Haptics from 'expo-haptics';
import { DotFuelColors, Spacing, Radius } from '@/constants/colors';
import { SpringPressable } from '@/components/ui/spring-pressable';
import Animated, { LinearTransition } from 'react-native-reanimated';

interface WaterCardProps {
  currentMl: number;
  goalMl: number;
  onAdd: (ml: number) => void;
  onUpdateGoalLiters?: (liters: number) => void;
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

export function WaterCard({ currentMl, goalMl, onAdd, onUpdateGoalLiters }: WaterCardProps) {
  const pct = goalMl > 0 ? Math.min(100, (currentMl / goalMl) * 100) : 0;
  const [isEditing, setIsEditing] = useState(false);
  const [tempGoal, setTempGoal] = useState((goalMl / 1000).toFixed(1));

  const handleAdd = (ml: number) => {
    onAdd(ml);
  };

  const handleSaveGoal = () => {
    const parsed = parseFloat(tempGoal);
    if (!isNaN(parsed) && parsed > 0) {
      if (onUpdateGoalLiters) {
        onUpdateGoalLiters(parsed);
      }
      setIsEditing(false);
    } else {
      if (process.env.EXPO_OS === 'ios') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      alert('Please enter a valid positive number for water goal.');
    }
  };

  return (
    <Animated.View 
      layout={LinearTransition}
      style={{
        backgroundColor: DotFuelColors.card, borderRadius: Radius.xl,
        padding: Spacing.lg, marginHorizontal: Spacing['2xl'],
        shadowColor: '#1E49CF',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.12,
        shadowRadius: 16,
        elevation: 4,
      }}
    >
      {/* Header — matches webapp .water-card-top */}
      <View style={{
        flexDirection: 'row', alignItems: 'center',
        justifyContent: 'space-between', marginBottom: 12,
      }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
          <Text style={{ fontSize: 22 }}>💧</Text>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={{
                fontSize: 13, fontWeight: '800', color: DotFuelColors.white,
                textTransform: 'uppercase', letterSpacing: 0.5,
              }}>
                Water Intake
              </Text>
              <SpringPressable
                haptic="selection"
                onPress={() => {
                  setTempGoal((goalMl / 1000).toFixed(1));
                  setIsEditing(!isEditing);
                }}
                style={{ padding: 2 }}
              >
                <Text style={{ fontSize: 11, color: DotFuelColors.water }}>✏️</Text>
              </SpringPressable>
            </View>

            {isEditing ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}>
                <TextInput
                  value={tempGoal}
                  onChangeText={setTempGoal}
                  keyboardType="decimal-pad"
                  placeholder="3.0"
                  placeholderTextColor={DotFuelColors.muted}
                  style={{
                    backgroundColor: DotFuelColors.surface,
                    color: DotFuelColors.white,
                    borderRadius: 6,
                    paddingHorizontal: 8,
                    paddingVertical: 2,
                    fontSize: 12,
                    fontWeight: '700',
                    borderWidth: 1,
                    borderColor: 'rgba(255,255,255,0.1)',
                    width: 50,
                  }}
                />
                <Text style={{ fontSize: 12, color: DotFuelColors.muted, fontWeight: '700' }}>L</Text>
                
                <SpringPressable
                  haptic="success"
                  onPress={handleSaveGoal}
                  style={{
                    backgroundColor: DotFuelColors.water,
                    paddingHorizontal: 8,
                    paddingVertical: 3,
                    borderRadius: 6,
                  }}
                >
                  <Text style={{ fontSize: 10, fontWeight: '800', color: DotFuelColors.black }}>Save</Text>
                </SpringPressable>

                <SpringPressable
                  haptic="selection"
                  onPress={() => setIsEditing(false)}
                  style={{
                    backgroundColor: DotFuelColors.surface,
                    paddingHorizontal: 8,
                    paddingVertical: 3,
                    borderRadius: 6,
                    borderWidth: 1,
                    borderColor: DotFuelColors.cardBorder,
                  }}
                >
                  <Text style={{ fontSize: 10, fontWeight: '800', color: DotFuelColors.muted }}>Cancel</Text>
                </SpringPressable>
              </View>
            ) : (
              <Text style={{ fontSize: 11, color: DotFuelColors.muted, marginTop: 1, fontWeight: '500' }}>
                {toL(currentMl)} of {toL(goalMl)} goal
              </Text>
            )}
          </View>
        </View>

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
          <SpringPressable
            key={ml}
            haptic="light"
            onPress={() => handleAdd(ml)}
            style={{
              flex: 1, backgroundColor: DotFuelColors.waterLight,
              borderWidth: 1, borderColor: 'rgba(79,195,247,0.2)',
              borderRadius: 10, paddingVertical: 8, alignItems: 'center',
            }}
          >
            <Text style={{
              fontFamily: 'Inter', fontSize: 12, fontWeight: '800',
              color: DotFuelColors.water, textTransform: 'uppercase', letterSpacing: 0.5,
            }}>
              {label}
            </Text>
          </SpringPressable>
        ))}
      </View>
    </Animated.View>
  );
}
