/**
 * Login screen — matches webapp's login screen exactly.
 * Pulsing lime dot + Google OAuth, Apple Sign In (iOS), Email OTP.
 */
import { useEffect, useState } from 'react';
import { View, Pressable, Alert, ScrollView, KeyboardAvoidingView, StyleSheet, Platform } from 'react-native';
import { Text } from '@/components/ui/text';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import Svg, { Path, Defs, RadialGradient, Stop, Rect } from 'react-native-svg';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
  FadeIn,
  FadeInDown,
  FadeInUp,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/contexts/auth-context';
import { DotFuelColors, Spacing } from '@/constants/colors';

export default function LoginScreen() {
  const { signInWithGoogle, signInWithApple, sendOtp, verifyOtp } = useAuth();
  const [showOtp, setShowOtp] = useState(false);
  const [email, setEmail] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [loading, setLoading] = useState(false);

  // Dot pulse
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

  const handleSendOtp = async () => {
    if (!email.includes('@')) {
      Alert.alert('Invalid Email', 'Please enter a valid email address.');
      return;
    }
    setLoading(true);
    try {
      await sendOtp(email);
      setOtpSent(true);
      if (process.env.EXPO_OS === 'ios') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (otpCode.length < 6) return;
    setLoading(true);
    try {
      await verifyOtp(email, otpCode);
      if (process.env.EXPO_OS === 'ios') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Invalid code');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: DotFuelColors.black, width: '100%', height: '100%' }} edges={['top', 'left', 'right']}>
      <KeyboardAvoidingView style={{ flex: 1, width: '100%', height: '100%' }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          style={{ flex: 1, width: '100%', height: '100%', backgroundColor: DotFuelColors.black }}
          contentContainerStyle={{ flexGrow: 1, paddingTop: 16 }}
          keyboardShouldPersistTaps="handled"
        >
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
          <Svg height="100%" width="100%" style={StyleSheet.absoluteFill}>
            <Defs>
              <RadialGradient id="loginFlare" cx="50%" cy="0%" r="50%">
                <Stop offset="0%" stopColor={DotFuelColors.lime} stopOpacity="0.15" />
                <Stop offset="100%" stopColor={DotFuelColors.lime} stopOpacity="0" />
              </RadialGradient>
            </Defs>
            <Rect x="0" y="0" width="100%" height="100%" fill="url(#loginFlare)" />
          </Svg>
        </View>

        {/* Header with pulsing dot */}
        <Animated.View entering={FadeInDown.duration(400)} style={{ alignItems: 'center', paddingHorizontal: 28, paddingBottom: 28 }}>
          <Animated.View style={[dotStyle, {
            width: 60, height: 60, borderRadius: 30,
            backgroundColor: DotFuelColors.lime, marginBottom: 20,
            shadowColor: DotFuelColors.lime,
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: 0.6,
            shadowRadius: 20,
            elevation: 10,
          }]} />

          <Text style={{
            fontSize: 36, fontWeight: '900',
            color: DotFuelColors.white, textTransform: 'uppercase',
            letterSpacing: -1, marginBottom: 8,
          }}>
            Welcome Back
          </Text>
          <Text style={{
            fontSize: 13, color: DotFuelColors.muted, fontWeight: '500',
            lineHeight: 20, textAlign: 'center',
          }}>
            Sign in to track your fuel{'\n'}and own your dot today.
          </Text>
        </Animated.View>

        {/* Auth Methods */}
        <Animated.View entering={FadeInDown.delay(150).duration(400)} style={{
          paddingHorizontal: Spacing['2xl'], gap: 10,
        }}>
          {/* Google */}
          <Pressable
            onPress={signInWithGoogle}
            style={({ pressed }) => ({
              flexDirection: 'row', alignItems: 'center', gap: 14,
              backgroundColor: DotFuelColors.card, borderRadius: 14,
              borderWidth: 1.5, borderColor: DotFuelColors.surfaceBorder,
              paddingVertical: 15, paddingHorizontal: 18,
              opacity: pressed ? 0.85 : 1,
              transform: [{ scale: pressed ? 0.98 : 1 }],
            })}
          >
            <View style={{ width: 22, alignItems: 'center' }}>
              <Svg width={20} height={20} viewBox="0 0 48 48">
                <Path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                <Path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                <Path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                <Path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.31-8.16 2.31-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
                <Path fill="none" d="M0 0h48v48H0z"/>
              </Svg>
            </View>
            <Text style={{ flex: 1, fontSize: 14, fontWeight: '700', color: DotFuelColors.white }}>
              Continue with Google
            </Text>
            <Text style={{ color: DotFuelColors.muted, fontSize: 16 }}>›</Text>
          </Pressable>

          {/* Apple (iOS only) */}
          {process.env.EXPO_OS === 'ios' && (
            <Pressable
              onPress={signInWithApple}
              style={({ pressed }) => ({
                flexDirection: 'row', alignItems: 'center', gap: 14,
                backgroundColor: DotFuelColors.card, borderRadius: 14,
                borderWidth: 1.5, borderColor: DotFuelColors.surfaceBorder,
                paddingVertical: 15, paddingHorizontal: 18,
                opacity: pressed ? 0.85 : 1,
                transform: [{ scale: pressed ? 0.98 : 1 }],
              })}
            >
              <Text style={{ fontSize: 18, width: 22, textAlign: 'center' }}>🍎</Text>
              <Text style={{ flex: 1, fontSize: 14, fontWeight: '700', color: DotFuelColors.white }}>
                Continue with Apple
              </Text>
              <Text style={{ color: DotFuelColors.muted, fontSize: 16 }}>›</Text>
            </Pressable>
          )}

          {/* Divider */}
          <View style={{
            flexDirection: 'row', alignItems: 'center', gap: 12,
            marginVertical: 2,
          }}>
            <View style={{ flex: 1, height: 1, backgroundColor: 'rgba(255,255,255,0.07)' }} />
            <Text style={{ fontSize: 11, color: DotFuelColors.muted, fontWeight: '600' }}>OR</Text>
            <View style={{ flex: 1, height: 1, backgroundColor: 'rgba(255,255,255,0.07)' }} />
          </View>

          {/* Email */}
          <Pressable
            onPress={() => setShowOtp(true)}
            style={({ pressed }) => ({
              flexDirection: 'row', alignItems: 'center', gap: 14,
              backgroundColor: DotFuelColors.card, borderRadius: 14,
              borderWidth: 1.5, borderColor: DotFuelColors.surfaceBorder,
              paddingVertical: 15, paddingHorizontal: 18,
              opacity: pressed ? 0.85 : 1,
              transform: [{ scale: pressed ? 0.98 : 1 }],
            })}
          >
            <View style={{ width: 22, alignItems: 'center' }}>
              <Svg width={20} height={20} viewBox="0 0 24 24" fill="#D4D4D4">
                <Path d="M20 4H4C2.9 4 2.01 4.9 2.01 6L2 18C2 19.1 2.9 20 4 20H20C21.1 20 22 19.1 22 18V6C22 4.9 21.1 4 20 4ZM20 8L12 13L4 8V6L12 11L20 6V8Z"/>
              </Svg>
            </View>
            <Text style={{ flex: 1, fontSize: 14, fontWeight: '700', color: DotFuelColors.white }}>
              Continue with Email
            </Text>
            <Text style={{ color: DotFuelColors.muted, fontSize: 16 }}>›</Text>
          </Pressable>
        </Animated.View>

        {/* OTP Panel */}
        {showOtp && (
          <Animated.View entering={FadeInUp.duration(300)} style={{
            paddingHorizontal: Spacing['2xl'], gap: Spacing.md, marginTop: 12, paddingBottom: 60,
          }}>
            {!otpSent ? (
              <>
                <Input
                  label="Email Address"
                  value={email}
                  onChangeText={setEmail}
                  placeholder="you@example.com"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoComplete="email"
                />

                <Button
                  title={loading ? 'Sending…' : 'SEND MAGIC LINK →'}
                  onPress={handleSendOtp}
                  disabled={loading || !email}
                />

                <Text style={{
                  fontSize: 11, color: DotFuelColors.muted, fontWeight: '500',
                  textAlign: 'center', lineHeight: 17,
                }}>
                  We'll email you a magic link to sign in instantly.{'\n'}
                  Or enter the 6-digit code below if you get one.
                </Text>
              </>
            ) : (
              <>
                <Text style={{ fontSize: 12, color: DotFuelColors.muted, fontWeight: '600' }}>
                  Enter the 6-digit code sent to {email}
                </Text>
                <Input
                  value={otpCode}
                  onChangeText={setOtpCode}
                  placeholder="000000"
                  keyboardType="number-pad"
                  maxLength={6}
                  style={{
                    color: DotFuelColors.lime, fontSize: 26,
                    fontWeight: '900', textAlign: 'center', letterSpacing: 8,
                  }}
                />
                
                <Button
                  title={loading ? 'Verifying…' : 'VERIFY →'}
                  onPress={handleVerifyOtp}
                  disabled={loading || otpCode.length < 6}
                />
              </>
            )}
          </Animated.View>
        )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
