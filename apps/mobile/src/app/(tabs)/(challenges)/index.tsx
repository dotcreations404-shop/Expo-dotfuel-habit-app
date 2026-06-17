/**
 * Challenges screen — DotBoy AI trainer, challenges dashboard.
 */
import { View, ScrollView, Pressable } from 'react-native';
import { Text } from '@/components/ui/text';
import { useRouter } from 'expo-router';
import Animated, { FadeInDown } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/contexts/auth-context';
import { DotFuelColors, Spacing, Radius } from '@/constants/colors';

export default function ChallengesScreen() {
  const { profile } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: DotFuelColors.black }} edges={['top', 'left', 'right']}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header — matches webapp .challenges-header */}
        <View style={{
          paddingTop: 16, paddingHorizontal: Spacing['2xl'],
          paddingBottom: Spacing.xl,
          flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end',
        }}>
        <View>
          <Text style={{
            fontFamily: 'Inter', fontSize: 28, fontWeight: '900',
            color: DotFuelColors.white, letterSpacing: -0.5,
          }}>
            Challenges
          </Text>
          <Text style={{
            fontSize: 13, color: DotFuelColors.muted, fontWeight: '500', marginTop: 4,
          }}>
            Push your limits. Compete with friends.
          </Text>
        </View>

        {/* .join-chip — matches webapp */}
        <Pressable
          onPress={() => {
            if (process.env.EXPO_OS === 'ios') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            router.push('/(tabs)/(challenges)/vol3');
          }}
          style={({ pressed }) => ({
            backgroundColor: DotFuelColors.card, borderRadius: 10,
            paddingVertical: 6, paddingHorizontal: 14,
            borderWidth: 1, borderColor: 'rgba(194,240,0,0.2)',
            opacity: pressed ? 0.88 : 1,
          })}>
          <Text style={{
            fontFamily: 'Inter', fontSize: 13, fontWeight: '800',
            color: DotFuelColors.lime, letterSpacing: 0.5, textTransform: 'uppercase',
          }}>
            Join
          </Text>
        </Pressable>
      </View>

      {/* DotBoy Card — .challenge-card.blue with 4px left blue strip */}
      <Animated.View entering={FadeInDown.delay(100).duration(400)}>
        <Pressable
          onPress={() => {
            if (process.env.EXPO_OS === 'ios') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            router.push('/(tabs)/(challenges)/dotboy');
          }}
          style={({ pressed }) => ({
            marginHorizontal: Spacing['2xl'], marginBottom: Spacing.md,
            backgroundColor: DotFuelColors.card, borderRadius: Radius['2xl'],
            borderWidth: 1, borderColor: DotFuelColors.cardBorder,
            padding: 22, overflow: 'hidden',
            opacity: pressed ? 0.9 : 1,
            transform: [{ scale: pressed ? 0.98 : 1 }],
          })}
        >
          {/* 4px left blue strip — matches webapp .challenge-card.blue::before */}
          <View style={{
            position: 'absolute', top: 0, left: 0, bottom: 0, width: 4,
            backgroundColor: DotFuelColors.blue, borderRadius: 2,
          }} />
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16, paddingLeft: 8 }}>
            <View style={{
              width: 56, height: 56, borderRadius: 28,
              backgroundColor: DotFuelColors.blueLight,
              alignItems: 'center', justifyContent: 'center',
            }}>
              <Text style={{ fontSize: 28 }}>🤖</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{
                fontFamily: 'Inter', fontSize: 15, fontWeight: '800',
                color: DotFuelColors.white, textTransform: 'uppercase', letterSpacing: 0.5,
              }}>
                Dot Boy
              </Text>
              <Text style={{ fontSize: 11, color: DotFuelColors.muted, fontWeight: '600', marginTop: 2 }}>
                Your AI personal trainer. Ask anything about fitness, nutrition, or workout plans.
              </Text>
            </View>
            <Text style={{ fontSize: 20, color: DotFuelColors.muted }}>›</Text>
          </View>
        </Pressable>
      </Animated.View>

      {/* Dot Duo Card — .challenge-card with 4px left green strip */}
      <Animated.View entering={FadeInDown.delay(150).duration(400)}>
        <Pressable
          onPress={() => {
            if (process.env.EXPO_OS === 'ios') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            router.push('/(tabs)/(challenges)/dot-duo');
          }}
          style={({ pressed }) => ({
            marginHorizontal: Spacing['2xl'], marginBottom: Spacing.md,
            backgroundColor: DotFuelColors.card, borderRadius: Radius['2xl'],
            borderWidth: 1, borderColor: DotFuelColors.cardBorder,
            padding: 22, overflow: 'hidden',
            opacity: pressed ? 0.9 : 1,
            transform: [{ scale: pressed ? 0.98 : 1 }],
          })}
        >
          {/* 4px left green strip — matches webapp .challenge-card.green-stripe::before */}
          <View style={{
            position: 'absolute', top: 0, left: 0, bottom: 0, width: 4,
            backgroundColor: DotFuelColors.green, borderRadius: 2,
          }} />
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16, paddingLeft: 8 }}>
            <View style={{
              width: 56, height: 56, borderRadius: 28,
              backgroundColor: 'rgba(255,100,150,0.15)',
              alignItems: 'center', justifyContent: 'center',
            }}>
              <Text style={{ fontSize: 28 }}>🤝</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{
                fontFamily: 'Inter', fontSize: 15, fontWeight: '800',
                color: DotFuelColors.white, textTransform: 'uppercase', letterSpacing: 0.5,
              }}>
                Dot Duo
              </Text>
              <Text style={{ fontSize: 11, color: DotFuelColors.muted, fontWeight: '600', marginTop: 2 }}>
                Find an accountability partner. Chat and share your daily macros to stay on track.
              </Text>
            </View>
            <Text style={{ fontSize: 20, color: DotFuelColors.muted }}>›</Text>
          </View>
        </Pressable>
      </Animated.View>

      {/* Active Challenge — Vol 3 */}
      <Animated.View entering={FadeInDown.delay(200).duration(400)}>
        <View style={{
          marginHorizontal: Spacing['2xl'], marginBottom: Spacing.md,
          backgroundColor: DotFuelColors.card, borderRadius: Radius['2xl'],
          borderWidth: 1, borderColor: DotFuelColors.cardBorder,
          padding: 22,
        }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 }}>
            <Text style={{ fontSize: 26 }}>🔥</Text>
            <View style={{ flex: 1 }}>
              <Text style={{
                fontFamily: 'Inter', fontSize: 16, fontWeight: '900',
                color: DotFuelColors.lime, textTransform: 'uppercase', letterSpacing: 0.5,
              }}>
                Volume 3 Challenge
              </Text>
              <Text style={{ fontSize: 11, color: DotFuelColors.muted, fontWeight: '600', marginTop: 2 }}>
                21-day transformation journey
              </Text>
            </View>
          </View>

          <View style={{ gap: 8 }}>
            {['Log all meals daily', 'Hit protein target', 'Drink 3L water', 'Exercise 30 min'].map((task, i) => (
              <View key={i} style={{
                flexDirection: 'row', alignItems: 'center', gap: 10,
                backgroundColor: DotFuelColors.surface, borderRadius: 10, padding: 12,
              }}>
                <View style={{
                  width: 22, height: 22, borderRadius: 6,
                  borderWidth: 2, borderColor: DotFuelColors.surface,
                  backgroundColor: 'transparent',
                }} />
                <Text style={{ flex: 1, fontSize: 13, color: DotFuelColors.text, fontWeight: '600' }}>
                  {task}
                </Text>
              </View>
            ))}
          </View>

          <Pressable
            onPress={() => {
              if (process.env.EXPO_OS === 'ios') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              router.push('/(tabs)/(challenges)/vol3');
            }}
            style={({ pressed }) => ({
              marginTop: 14, backgroundColor: DotFuelColors.limeLight,
              borderWidth: 1, borderColor: 'rgba(194,240,0,0.2)',
              borderRadius: 12, paddingVertical: 12, alignItems: 'center',
              opacity: pressed ? 0.88 : 1,
            })}
          >
            <Text style={{
              fontFamily: 'Inter', fontSize: 12, fontWeight: '800',
              color: DotFuelColors.lime, textTransform: 'uppercase', letterSpacing: 0.5,
            }}>
              Join Challenge
            </Text>
          </Pressable>
        </View>
      </Animated.View>

      {/* Leaderboard placeholder */}
      <Animated.View entering={FadeInDown.delay(300).duration(400)}>
        <View style={{
          marginHorizontal: Spacing['2xl'],
          backgroundColor: DotFuelColors.card, borderRadius: Radius['2xl'],
          borderWidth: 1, borderColor: DotFuelColors.cardBorder,
          padding: 22, alignItems: 'center',
        }}>
          <Text style={{ fontSize: 38, marginBottom: 8 }}>🏆</Text>
          <Text style={{
            fontFamily: 'Inter', fontSize: 15, fontWeight: '800',
            color: DotFuelColors.white,
          }}>
            Leaderboard
          </Text>
          <Text style={{
            fontSize: 12, color: DotFuelColors.muted, fontWeight: '500',
            textAlign: 'center', marginTop: 4,
          }}>
            Join a challenge to see rankings and compete with other athletes.
          </Text>
        </View>
      </Animated.View>
    </ScrollView>
    </SafeAreaView>
  );
}
