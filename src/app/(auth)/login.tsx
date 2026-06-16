/**
 * Login screen — matches webapp's login screen exactly.
 * Pulsing lime dot + Google OAuth, Apple Sign In (iOS), Email OTP.
 */
import { useEffect, useState } from 'react';
import { View, Text, Pressable, TextInput, Alert, ScrollView, KeyboardAvoidingView } from 'react-native';
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
import { useAuth } from '@/contexts/auth-context';
import { DotFuelColors, Spacing } from '@/constants/colors';

export default function LoginScreen() {
  const { signInWithGoogle, signInWithApple, sendOtp, verifyOtp } = useAuth();
  const [showOtp, setShowOtp] = useState(false);
  const [email, setEmail] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [loading, setLoading] = useState(false);

  // Dot pulse — matches webapp CSS: dot-pulse 2.5s ease-in-out infinite
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
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={process.env.EXPO_OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView
        style={{ flex: 1, backgroundColor: DotFuelColors.black }}
        contentContainerStyle={{ flexGrow: 1, paddingTop: 48 }}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header with pulsing dot — matches webapp .login-top */}
        <Animated.View entering={FadeInDown.duration(400)} style={{ alignItems: 'center', paddingHorizontal: 28, paddingBottom: 28 }}>
          {/* Pulsing login dot — 60x60 like webapp */}
          <Animated.View style={[dotStyle, {
            width: 60, height: 60, borderRadius: 30,
            backgroundColor: DotFuelColors.lime, marginBottom: 20,
          }]} />

          <Text style={{
            fontFamily: 'Inter', fontSize: 36, fontWeight: '900',
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

        {/* Auth Methods — matches webapp .login-methods */}
        <Animated.View entering={FadeInDown.delay(150).duration(400)} style={{
          paddingHorizontal: Spacing['2xl'], gap: 10,
        }}>
          {/* Google — with colored SVG icon in webapp, we use emoji here */}
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
            <Text style={{ fontSize: 18, width: 22, textAlign: 'center' }}>🔵</Text>
            <Text style={{ flex: 1, fontFamily: 'Inter', fontSize: 14, fontWeight: '700', color: DotFuelColors.white }}>
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
              <Text style={{ flex: 1, fontFamily: 'Inter', fontSize: 14, fontWeight: '700', color: DotFuelColors.white }}>
                Continue with Apple
              </Text>
              <Text style={{ color: DotFuelColors.muted, fontSize: 16 }}>›</Text>
            </Pressable>
          )}

          {/* Divider — matches webapp .divider */}
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
            <Text style={{ fontSize: 18, width: 22, textAlign: 'center' }}>✉️</Text>
            <Text style={{ flex: 1, fontFamily: 'Inter', fontSize: 14, fontWeight: '700', color: DotFuelColors.white }}>
              Continue with Email
            </Text>
            <Text style={{ color: DotFuelColors.muted, fontSize: 16 }}>›</Text>
          </Pressable>
        </Animated.View>

        {/* OTP Panel — matches webapp .otp-panel */}
        {showOtp && (
          <Animated.View entering={FadeInUp.duration(300)} style={{
            paddingHorizontal: Spacing['2xl'], gap: Spacing.md, marginTop: 12,
          }}>
            {/* Email label */}
            <Text style={{
              fontSize: 11, color: DotFuelColors.muted, fontWeight: '700',
              textTransform: 'uppercase', letterSpacing: 1.5,
            }}>
              Email Address
            </Text>

            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="you@example.com"
              placeholderTextColor={DotFuelColors.muted}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              style={{
                backgroundColor: DotFuelColors.card,
                borderWidth: 1.5, borderColor: DotFuelColors.surfaceBorder,
                borderRadius: 12, paddingVertical: 13, paddingHorizontal: 16,
                color: DotFuelColors.white, fontFamily: 'Inter', fontSize: 14,
              }}
            />

            {!otpSent ? (
              <>
                <Pressable
                  onPress={handleSendOtp}
                  disabled={loading || !email}
                  style={({ pressed }) => ({
                    backgroundColor: DotFuelColors.lime, borderRadius: 14,
                    paddingVertical: 14, alignItems: 'center',
                    opacity: loading || !email ? 0.3 : pressed ? 0.88 : 1,
                  })}
                >
                  <Text style={{
                    fontFamily: 'Inter', fontSize: 14, fontWeight: '800',
                    color: DotFuelColors.black, textTransform: 'uppercase', letterSpacing: 0.5,
                  }}>
                    {loading ? 'Sending…' : 'SEND MAGIC LINK →'}
                  </Text>
                </Pressable>

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
                <TextInput
                  value={otpCode}
                  onChangeText={setOtpCode}
                  placeholder="000000"
                  placeholderTextColor={DotFuelColors.muted}
                  keyboardType="number-pad"
                  maxLength={6}
                  style={{
                    backgroundColor: DotFuelColors.card,
                    borderWidth: 1.5, borderColor: DotFuelColors.surfaceBorder,
                    borderRadius: 12, paddingVertical: 13, paddingHorizontal: 16,
                    color: DotFuelColors.lime, fontFamily: 'Inter', fontSize: 26,
                    fontWeight: '900', textAlign: 'center', letterSpacing: 8,
                  }}
                />
                <Pressable
                  onPress={handleVerifyOtp}
                  disabled={loading || otpCode.length < 6}
                  style={({ pressed }) => ({
                    backgroundColor: DotFuelColors.lime, borderRadius: 14,
                    paddingVertical: 14, alignItems: 'center',
                    opacity: loading || otpCode.length < 6 ? 0.3 : pressed ? 0.88 : 1,
                  })}
                >
                  <Text style={{
                    fontFamily: 'Inter', fontSize: 14, fontWeight: '800',
                    color: DotFuelColors.black, textTransform: 'uppercase', letterSpacing: 0.5,
                  }}>
                    {loading ? 'Verifying…' : 'VERIFY →'}
                  </Text>
                </Pressable>
              </>
            )}
          </Animated.View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
