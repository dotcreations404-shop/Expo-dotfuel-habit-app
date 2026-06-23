/**
 * Splash / Welcome screen — matches webapp's splash with animated dot + 4 floating icons.
 * Emojis: 🥜 💪 ⚡ 🔥 floating around the pulsing lime dot.
 */
import { useEffect } from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { Text } from '@/components/ui/text';
import { useRouter } from 'expo-router';
import Svg, { Defs, RadialGradient, Stop, Rect } from 'react-native-svg';
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

  // outer ring removed

  return (
    <View style={{ flex: 1, backgroundColor: '#000000', alignItems: 'center', justifyContent: 'center' }}>
      {/* Background noise gradients (soft flares) — matches webapp splash-noise */}
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <Svg height="100%" width="100%" style={StyleSheet.absoluteFill}>
          <Defs>
            <RadialGradient id="flare1" cx="30%" cy="20%" r="50%">
              <Stop offset="0%" stopColor={DotFuelColors.lime} stopOpacity="0.15" />
              <Stop offset="100%" stopColor={DotFuelColors.lime} stopOpacity="0" />
            </RadialGradient>
            <RadialGradient id="flare2" cx="80%" cy="70%" r="60%">
              <Stop offset="0%" stopColor={DotFuelColors.blue} stopOpacity="0.12" />
              <Stop offset="100%" stopColor={DotFuelColors.blue} stopOpacity="0" />
            </RadialGradient>
          </Defs>
          <Rect x="0" y="0" width="100%" height="100%" fill="url(#flare1)" />
          <Rect x="0" y="0" width="100%" height="100%" fill="url(#flare2)" />
        </Svg>
      </View>

      {/* Animated Dot with floating emojis */}
      <Animated.View entering={FadeIn.duration(600)} style={{ alignItems: 'center', marginBottom: Spacing['3xl'] }}>
        <View style={{ position: 'relative', alignItems: 'center', justifyContent: 'center' }}>
          {/* outer ring removed */}

          {/* Main dot with glowing flare shadow */}
          <Animated.View style={[dotStyle, {
            width: 130, height: 130, borderRadius: 65,
            backgroundColor: DotFuelColors.lime,
            alignItems: 'center', justifyContent: 'center',
            shadowColor: DotFuelColors.lime,
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: 0.5,
            shadowRadius: 30,
            elevation: 15,
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
            fontFamily: 'Inter', fontSize: 48, fontWeight: '900',
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
            fontFamily: 'Inter', fontSize: 48, fontWeight: '900',
            color: DotFuelColors.white, textTransform: 'uppercase', letterSpacing: -2,
          }}>
            TFUEL
          </Text>
        </View>

        <Text style={{
          fontSize: 13, color: '#828282', textAlign: 'center',
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
            borderWidth: 1.5, borderColor: 'rgba(255, 255, 255, 0.15)',
            paddingVertical: 14, alignItems: 'center',
            opacity: pressed ? 0.7 : 1,
          })}
        >
          <Text style={{
            fontFamily: 'Inter', fontSize: 14, fontWeight: '700',
            color: '#FFFFFF',
          }}>
            I already have an account
          </Text>
        </Pressable>
      </Animated.View>
    </View>
  );
}
