/**
 * Fuel Dot — animated circular score indicator.
 * The pulsing lime dot is the core branding element of DotFuel.
 */
import { useEffect } from 'react';
import { View } from 'react-native';
import { Text } from '@/components/ui/text';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { DotFuelColors } from '@/constants/colors';

interface FuelDotProps {
  score: number;
  size?: number;
}

export function FuelDot({ score, size = 150 }: FuelDotProps) {
  const scale = useSharedValue(1);

  useEffect(() => {
    scale.value = withRepeat(
      withSequence(
        withTiming(1.05, { duration: 1250, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 1250, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      true,
    );
  }, []);

  const dotStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const ringStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value * 1.08 }],
    opacity: 2 - scale.value,
  }));

  const ringSize = size * 1.16;

  return (
    <View style={{ alignItems: 'center', justifyContent: 'center' }}>
      <Animated.View style={[ringStyle, {
        position: 'absolute',
        width: ringSize, height: ringSize,
        borderRadius: ringSize / 2,
        borderWidth: 2,
        borderColor: DotFuelColors.limeMuted,
      }]} />
      <Animated.View style={[dotStyle, {
        width: size, height: size,
        borderRadius: size / 2,
        backgroundColor: DotFuelColors.lime,
        alignItems: 'center', justifyContent: 'center',
      }]}>
        <Text style={{
          fontFamily: 'Inter',
          fontSize: size * 0.37,
          fontWeight: '900',
          color: DotFuelColors.black,
          lineHeight: size * 0.37,
          letterSpacing: -2,
        }}>
          {score}
        </Text>
        <Text style={{
          fontFamily: 'Inter',
          fontSize: 9,
          fontWeight: '800',
          letterSpacing: 2,
          color: 'rgba(0,0,0,0.5)',
          textTransform: 'uppercase',
        }}>
          FUEL SCORE
        </Text>
      </Animated.View>
    </View>
  );
}
