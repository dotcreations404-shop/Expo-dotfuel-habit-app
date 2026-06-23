/**
 * Legal & Privacy Screen — Terms of Service and Privacy Policy.
 */
import React from 'react';
import { View, ScrollView } from 'react-native';
import { Text } from '@/components/ui/text';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { DotFuelColors, Spacing, Radius } from '@/constants/colors';
import { SpringPressable } from '@/components/ui/spring-pressable';

export default function LegalScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: DotFuelColors.black }} edges={['top', 'left', 'right']}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ paddingTop: 8, paddingHorizontal: Spacing['2xl'] }}>
          {/* Back nav */}
          <SpringPressable haptic="selection" onPress={() => router.back()} style={{ marginBottom: 16, alignSelf: 'flex-start' }}>
            <Text style={{ fontSize: 22, color: DotFuelColors.muted }}>‹</Text>
          </SpringPressable>

          <Text style={{
            fontFamily: 'Inter', fontSize: 28, fontWeight: '900',
            color: DotFuelColors.white, textTransform: 'uppercase',
            letterSpacing: -0.5, marginBottom: Spacing.xl,
          }}>
            Legal & Privacy
          </Text>

          {/* Terms of Service Section */}
          <View style={{
            backgroundColor: DotFuelColors.card, borderRadius: Radius.xl,
            padding: 20, borderWidth: 1, borderColor: DotFuelColors.cardBorder,
            marginBottom: Spacing.xl,
            shadowColor: '#1E49CF',
            shadowOffset: { width: 0, height: 6 },
            shadowOpacity: 0.05,
            shadowRadius: 16,
            elevation: 4,
          }}>
            <Text style={{
              fontSize: 15, fontWeight: '900', color: DotFuelColors.lime,
              textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12,
            }}>
              Terms of Service
            </Text>

            <Text style={paragraph}>
              Welcome to DotFuel. By utilizing our mobile application and related web properties, you unconditionally agree to these terms.
            </Text>

            <Text style={subheading}>1. Use of Service</Text>
            <Text style={paragraph}>
              DotFuel is a tool designed to assist with personal performance tracking, calorie/macro calculation, and hydration logs. We do not guarantee health outcomes, and the calculations (such as TDEE, BMI, and calorie splits) should not replace professional medical or nutritional advice.
            </Text>

            <Text style={subheading}>2. Account Security</Text>
            <Text style={paragraph}>
              You are responsible for maintaining the confidentiality of your credentials. Any relational table writes, challenge enrollments, or meal logs performed under your secure authentication tracking ID are your responsibility.
            </Text>

            <Text style={subheading}>3. Relational Table & Data Wipes</Text>
            <Text style={paragraph}>
              In compliance with app publication guidelines, you can request an absolute and permanent account deletion from the profile page. Upon final confirmation, your relational tables (including meal logs, workouts, water target states, and authentication accounts) will be wiped cleanly.
            </Text>
          </View>

          {/* Privacy Policy Section */}
          <View style={{
            backgroundColor: DotFuelColors.card, borderRadius: Radius.xl,
            padding: 20, borderWidth: 1, borderColor: DotFuelColors.cardBorder,
            shadowColor: '#1E49CF',
            shadowOffset: { width: 0, height: 6 },
            shadowOpacity: 0.05,
            shadowRadius: 16,
            elevation: 4,
          }}>
            <Text style={{
              fontSize: 15, fontWeight: '900', color: DotFuelColors.lime,
              textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12,
            }}>
              Privacy Policy
            </Text>

            <Text style={paragraph}>
              Your privacy is paramount to our platform ecosystem. We collect only the data necessary to provide and optimize DotFuel.
            </Text>

            <Text style={subheading}>1. Data Collection</Text>
            <Text style={paragraph}>
              To compile your personalized fuel plan, we gather physiological metrics such as Name, Age, Sex, Weight, Height, and Activity Multipliers. These metrics are stored in our secure `public.profiles` database. Goal target metrics and streaks are stored in the matching `public.users` relational table.
            </Text>

            <Text style={subheading}>2. Secure Third-Party APIs</Text>
            <Text style={paragraph}>
              If you authenticate with third-party providers (such as Google OAuth, Apple Sign-In, or sync activities with Strava), we only request access tokens necessary to retrieve relevant information. We do not store credentials locally or share access with external marketing vendors.
            </Text>

            <Text style={subheading}>3. Your Rights</Text>
            <Text style={paragraph}>
              You have the right to request access to, correction of, or permanent deletion of your profile data. Wiping account details from the settings screen initiates an immediate, permanent purge of your relational metrics.
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const subheading = {
  fontSize: 13,
  fontWeight: '800' as const,
  color: DotFuelColors.white,
  marginTop: 14,
  marginBottom: 6,
};

const paragraph = {
  fontSize: 12,
  color: DotFuelColors.muted,
  fontWeight: '500' as const,
  lineHeight: 18,
  marginBottom: 4,
};
