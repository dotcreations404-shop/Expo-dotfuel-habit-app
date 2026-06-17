/**
 * Meal item card — shows a logged meal with emoji, name, time, and calories.
 */
import { useState } from 'react';
import { View, Pressable, Alert } from 'react-native';
import { Text } from '@/components/ui/text';
import * as Haptics from 'expo-haptics';
import Animated, { FadeIn, FadeOut, LinearTransition } from 'react-native-reanimated';
import { DotFuelColors, Spacing, Radius } from '@/constants/colors';
import type { Meal } from '@/lib/types';

interface MealItemProps {
  meal: Meal;
  onEdit?: (meal: Meal) => void;
  onDelete?: (mealId: string) => void;
}

export function MealItem({ meal, onEdit, onDelete }: MealItemProps) {
  const [expanded, setExpanded] = useState(false);

  const handleToggle = () => {
    setExpanded(prev => !prev);
    if (process.env.EXPO_OS === 'ios') Haptics.selectionAsync();
  };

  const handleDelete = () => {
    Alert.alert('Delete Meal', `Remove "${meal.name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: () => onDelete?.(meal.id),
      },
    ]);
  };

  const timeStr = meal.created_at
    ? new Date(meal.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
    : '';

  return (
    <Animated.View layout={LinearTransition.springify()}>
      <Pressable
        onPress={handleToggle}
        style={({ pressed }) => ({
          flexDirection: 'row', alignItems: 'center', gap: 12,
          backgroundColor: DotFuelColors.card, borderRadius: Radius.lg,
          padding: 13, paddingHorizontal: 15,
          borderWidth: 1, borderColor: DotFuelColors.cardBorder,
          opacity: pressed ? 0.9 : 1,
          transform: [{ scale: pressed ? 0.98 : 1 }],
        })}
      >
        <Text style={{ fontSize: 22, width: 34, textAlign: 'center' }}>
          {meal.emoji || '🍽️'}
        </Text>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 14, fontWeight: '700', color: DotFuelColors.white }}>
            {meal.name}
          </Text>
          {timeStr ? (
            <Text style={{ fontSize: 11, color: DotFuelColors.muted, marginTop: 2 }}>
              {timeStr}
            </Text>
          ) : null}
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={{
            fontFamily: 'Inter', fontSize: 20, fontWeight: '900',
            color: DotFuelColors.lime, letterSpacing: -0.5,
            fontVariant: ['tabular-nums'],
          }}>
            {meal.calories}
          </Text>
          <Text style={{ fontSize: 10, color: DotFuelColors.muted, fontWeight: '700' }}>
            kcal
          </Text>
        </View>
        <Text style={{
          fontSize: 11, color: DotFuelColors.muted,
          marginLeft: 6,
          transform: [{ rotate: expanded ? '180deg' : '0deg' }],
        }}>
          ▼
        </Text>
      </Pressable>

      {/* Expanded actions */}
      {expanded && (
        <Animated.View
          entering={FadeIn.duration(200)}
          exiting={FadeOut.duration(150)}
          style={{
            flexDirection: 'row', gap: 6, marginTop: 6, paddingHorizontal: 4,
          }}
        >
          <Pressable
            onPress={() => onEdit?.(meal)}
            style={{
              flex: 1, backgroundColor: DotFuelColors.blueLight,
              borderRadius: 10, padding: 8, alignItems: 'center',
            }}
          >
            <Text style={{
              fontFamily: 'Inter', fontSize: 11, fontWeight: '800',
              color: '#6fa3ff', textTransform: 'uppercase', letterSpacing: 0.5,
            }}>
              Edit
            </Text>
          </Pressable>
          <Pressable
            onPress={handleDelete}
            style={{
              flex: 1, backgroundColor: DotFuelColors.redLight,
              borderRadius: 10, padding: 8, alignItems: 'center',
            }}
          >
            <Text style={{
              fontFamily: 'Inter', fontSize: 11, fontWeight: '800',
              color: DotFuelColors.red, textTransform: 'uppercase', letterSpacing: 0.5,
            }}>
              Delete
            </Text>
          </Pressable>
        </Animated.View>
      )}
    </Animated.View>
  );
}
