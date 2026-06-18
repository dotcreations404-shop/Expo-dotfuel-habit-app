import React, { useState, useEffect } from 'react';
import { View, Pressable, StyleSheet, Platform } from 'react-native';
import { Text } from '@/components/ui/text';
import Animated, { FadeInRight, FadeOutRight, Layout } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { DotFuelColors } from '@/constants/colors';

const TIPS = [
  "🤖 Fuel is focus. Keep hitting those targets!",
  "💧 Don't forget your water! Hydration keeps the engine clean.",
  "🥩 Protein is key for muscle recovery. Did you hit your target yet?",
  "🔥 Consistency is the only secret. Show up again tomorrow!",
  "跑 Any movement counts. Even a 10-minute walk sparks the metabolic fire.",
  "🥑 Don't fear fats—they keep your hormone levels optimal.",
  "🛌 Rest is when the magic happens. Prioritize 7-8 hours of sleep tonight!",
  "⚡️ Progress, not perfection. Keep the streak alive!"
];

export function FloatingDotBoy() {
  const insets = useSafeAreaInsets();
  const [visible, setVisible] = useState(false);
  const [tipIndex, setTipIndex] = useState(0);

  // Auto-close after 8 seconds of inactivity
  useEffect(() => {
    if (!visible) return;
    const timer = setTimeout(() => {
      setVisible(false);
    }, 8000);
    return () => clearTimeout(timer);
  }, [visible, tipIndex]);

  const handleMascotPress = () => {
    if (Platform.OS === 'ios') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    if (!visible) {
      // Pick a random tip to start, then they can cycle
      const randomIndex = Math.floor(Math.random() * TIPS.length);
      setTipIndex(randomIndex);
      setVisible(true);
    } else {
      // Cycle to next tip
      setTipIndex((prev) => (prev + 1) % TIPS.length);
    }
  };

  const handleBubblePress = () => {
    if (Platform.OS === 'ios') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setVisible(false);
  };

  // Tab bar height is ~56 on Android/web, 56 + safe bottom on iOS.
  // Pinned above tab bar.
  const bottomOffset = Math.max(insets.bottom, 16) + 64;

  return (
    <View style={[styles.container, { bottom: bottomOffset }]} pointerEvents="box-none">
      {visible && (
        <Animated.View 
          entering={FadeInRight.duration(250)} 
          exiting={FadeOutRight.duration(200)}
          layout={Layout.springify()}
          style={styles.speechBubbleContainer}
        >
          <Pressable onPress={handleBubblePress} style={styles.speechBubble}>
            <Text style={styles.tipText}>
              {TIPS[tipIndex]}
            </Text>
            <Text style={styles.dismissText}>
              (tap message to close)
            </Text>
          </Pressable>
        </Animated.View>
      )}

      <Pressable 
        onPress={handleMascotPress}
        style={({ pressed }) => [
          styles.mascotButton,
          pressed && styles.mascotButtonPressed
        ]}
      >
        <Text style={styles.emoji}>🤖</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    zIndex: 9999,
  },
  mascotButton: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: DotFuelColors.card,
    borderWidth: 2,
    borderColor: DotFuelColors.blue,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 6,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  mascotButtonPressed: {
    transform: [{ scale: 0.92 }],
    opacity: 0.9,
  },
  emoji: {
    fontSize: 26,
  },
  speechBubbleContainer: {
    marginRight: 12,
    maxWidth: 220,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  speechBubble: {
    backgroundColor: DotFuelColors.card,
    borderWidth: 1,
    borderColor: DotFuelColors.cardBorder,
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  tipText: {
    fontFamily: 'Inter',
    fontSize: 12,
    fontWeight: '600',
    color: DotFuelColors.text,
    lineHeight: 17,
  },
  dismissText: {
    fontFamily: 'Inter',
    fontSize: 9,
    color: DotFuelColors.muted,
    marginTop: 4,
    textAlign: 'right',
  },
});
