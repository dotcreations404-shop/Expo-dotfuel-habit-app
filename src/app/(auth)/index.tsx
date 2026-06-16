/**
 * Splash / Welcome screen — matches webapp's splash with animated dot + 4 floating icons.
 * Emojis: 🥜 💪 ⚡ 🔥 floating around the pulsing lime dot.
 */
import { useEffect } from 'react';
import { View, Text, Pressable, useWindowDimensions } from 'react-native';
import { useRouter } from 'expo-router';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  withDelay,
  Easing,
  FadeIn,
  FadeInDown,
} from 'react-native-reanimated';
import { DotFuelColors, Spacing } from '@/constants/colors';

/** The 4 floating emojis that orbit the dot — matches webapp exactly. */
const FOOD_FLOATS = [
  { emoji: '🥜', top: -28, left: 8, delay: 0 },
  { emoji: '💪', top: -14, right: 2, delay: 600 },
  { emoji: '⚡', bottom: -24, left: 4, delay: 1200 },
  { emoji: '🔥', bottom: -10, right: 8, delay: 1800 },
] as const;

function FloatingEmoji({ emoji, delay, ...position }: typeof FOOD_FLOATS[number]) {
  const translateY = useSharedValue(0);
  const rotate = useSharedValue(0);

  useEffect(() => {
    translateY.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(-10, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
          withTiming(0, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
        ),
        -1,
        true,
      ),
    );
    rotate.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(8, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
          withTiming(0, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
        ),
        -1,
        true,
      ),
    );
  }, []);

  const style = useAnimatedStyle(() => ({
    transform: [
      { translateY: translateY.value },
      { rotate: `${rotate.value}deg` },
    ],
  }));

  const posStyle: any = { position: 'absolute', fontSize: 22 };
  if ('top' in position) posStyle.top = position.top;
  if ('bottom' in position) posStyle.bottom = position.bottom;
  if ('left' in position) posStyle.left = position.left;
  if ('right' in position) posStyle.right = position.right;

  return (
    <Animated.Text style={[posStyle, style]}>
      {emoji}
    </Animated.Text>
  );
}

export default function WelcomeScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();

  // Dot pulse animation — matches CSS: scale(1) → scale(1.05) over 2.5s
  const dotScale = useSharedValue(1);
  useEffect(() => {
    dotScale.value = withRepeat(
      withSequence(
        withTiming(1.05, { duration: 1250, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 1250, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      true,
    );
  }, []);

  const dotStyle = useAnimatedStyle(() => ({
    transform: [{ scale: dotScale.value }],
  }));

  const dotRingStyle = useAnimatedStyle(() => ({
    transform: [{ scale: dotScale.value * 1.08 }],
    opacity: 2 - dotScale.value,
  }));

  return (
    <View style={{ flex: 1, backgroundColor: DotFuelColors.black, alignItems: 'center', justifyContent: 'center' }}>
      {/* Background noise gradients — matches webapp splash-noise */}
      <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, overflow: 'hidden' }}>
        <View style={{
          position: 'absolute', width: 400, height: 400, top: '10%', left: '10%',
          borderRadius: 200, opacity: 0.08,
          backgroundColor: DotFuelColors.lime,
        }} />
        <View style={{
          position: 'absolute', width: 500, height: 400, bottom: '10%', right: '10%',
          borderRadius: 250, opacity: 0.07,
          backgroundColor: DotFuelColors.blue,
        }} />
      </View>

      {/* Animated Dot with floating emojis */}
      <Animated.View entering={FadeIn.duration(600)} style={{ alignItems: 'center', marginBottom: Spacing['3xl'] }}>
        <View style={{ position: 'relative', alignItems: 'center', justifyContent: 'center' }}>
          {/* Pulsing ring */}
          <Animated.View style={[dotRingStyle, {
            position: 'absolute',
            width: 152, height: 152, borderRadius: 76,
            borderWidth: 2, borderColor: DotFuelColors.limeMuted,
          }]} />

          {/* Main dot */}
          <Animated.View style={[dotStyle, {
            width: 130, height: 130, borderRadius: 65,
            backgroundColor: DotFuelColors.lime,
            alignItems: 'center', justifyContent: 'center',
          }]}>
            {/* 4 floating food emojis — same as webapp */}
            {FOOD_FLOATS.map((float) => (
              <FloatingEmoji key={float.emoji} {...float} />
            ))}
          </Animated.View>
        </View>
      </Animated.View>

      {/* Wordmark — D[dot]TFUEL */}
      <Animated.View entering={FadeInDown.delay(200).duration(500)} style={{ alignItems: 'center' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Text style={{
            fontFamily: 'Inter', fontSize: Math.min(54, width * 0.13), fontWeight: '900',
            color: DotFuelColors.white, textTransform: 'uppercase', letterSpacing: -2,
          }}>
            D
          </Text>
          <View style={{
            width: 34, height: 34, borderRadius: 17,
            backgroundColor: DotFuelColors.lime, marginHorizontal: 2,
            marginBottom: 4,
          }} />
          <Text style={{
            fontFamily: 'Inter', fontSize: Math.min(54, width * 0.13), fontWeight: '900',
            color: DotFuelColors.white, textTransform: 'uppercase', letterSpacing: -2,
          }}>
            TFUEL
          </Text>
        </View>

        <Text style={{
          fontSize: 13, color: DotFuelColors.muted, textAlign: 'center',
          lineHeight: 21, marginTop: Spacing.sm, maxWidth: 280, fontWeight: '500',
        }}>
          Trackable results.{'\n'}Own your dot every single day.
        </Text>
      </Animated.View>

      {/* CTAs */}
      <Animated.View entering={FadeInDown.delay(400).duration(500)} style={{
        position: 'absolute', bottom: 60, left: Spacing['2xl'], right: Spacing['2xl'],
        gap: Spacing.md,
      }}>
        <Pressable
          onPress={() => router.push('/(auth)/login')}
          style={({ pressed }) => ({
            backgroundColor: DotFuelColors.lime, borderRadius: 14,
            paddingVertical: 16, alignItems: 'center',
            opacity: pressed ? 0.88 : 1,
            transform: [{ scale: pressed ? 0.96 : 1 }],
          })}
        >
          <Text style={{
            fontFamily: 'Inter', fontSize: 15, fontWeight: '800',
            color: DotFuelColors.black, textTransform: 'uppercase', letterSpacing: 0.5,
          }}>
            GET STARTED →
          </Text>
        </Pressable>

        <Pressable
          onPress={() => router.push('/(auth)/login')}
          style={({ pressed }) => ({
            backgroundColor: 'transparent', borderRadius: 14,
            borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.15)',
            paddingVertical: 14, alignItems: 'center',
            opacity: pressed ? 0.7 : 1,
          })}
        >
          <Text style={{
            fontFamily: 'Inter', fontSize: 14, fontWeight: '700',
            color: DotFuelColors.text,
          }}>
            I already have an account
          </Text>
        </Pressable>
      </Animated.View>
    </View>
  );
}
