/**
 * Support & FAQ screen.
 */
import { View, Text, ScrollView, Pressable, Linking } from 'react-native';
import { DotFuelColors, Spacing, Radius } from '@/constants/colors';

const FAQS = [
  { q: 'How does Fuel Score work?', a: 'Your Fuel Score (0–100) measures how well you hit your calorie and macro targets. Hit all three macros within range and you score 90+.' },
  { q: 'How are calories calculated?', a: 'We use the Mifflin-St Jeor equation adjusted for your activity level and fuel mode to estimate your daily calorie needs.' },
  { q: 'What is a Fuel Mode?', a: 'Fuel Modes adjust your calorie target: Cut (–20%), Balance (maintain), Lean Bulk (+15%), Clean (whole foods focus), Perform (athlete surplus).' },
  { q: 'How does the streak work?', a: 'Log at least one meal every day to keep your streak alive. You get a grace period until midnight.' },
  { q: 'Is my data private?', a: 'Yes. Your data is stored securely in Supabase with row-level security. Only you can access your data.' },
];

export default function SupportScreen() {
  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: DotFuelColors.black }}
      contentContainerStyle={{ paddingBottom: 100 }}
    >
      <View style={{ paddingTop: 60, paddingHorizontal: Spacing['2xl'] }}>
        <Text style={{
          fontFamily: 'Inter', fontSize: 28, fontWeight: '900',
          color: DotFuelColors.white, letterSpacing: -0.5, marginBottom: Spacing.xl,
        }}>
          Support & FAQ
        </Text>

        {FAQS.map(({ q, a }, i) => (
          <View key={i} style={{
            backgroundColor: DotFuelColors.card, borderRadius: Radius.xl,
            padding: 16, marginBottom: 10,
            borderWidth: 1, borderColor: DotFuelColors.cardBorder,
          }}>
            <Text style={{ fontSize: 14, fontWeight: '800', color: DotFuelColors.white, marginBottom: 6 }}>
              {q}
            </Text>
            <Text selectable style={{ fontSize: 13, color: DotFuelColors.muted, fontWeight: '500', lineHeight: 20 }}>
              {a}
            </Text>
          </View>
        ))}

        <Pressable
          onPress={() => Linking.openURL('mailto:dotcreations404@gmail.com')}
          style={({ pressed }) => ({
            marginTop: Spacing.lg,
            backgroundColor: DotFuelColors.limeLight,
            borderWidth: 1, borderColor: 'rgba(194,240,0,0.2)',
            borderRadius: Radius.lg, paddingVertical: 14, alignItems: 'center',
            opacity: pressed ? 0.88 : 1,
          })}
        >
          <Text style={{
            fontFamily: 'Inter', fontSize: 13, fontWeight: '800',
            color: DotFuelColors.lime, textTransform: 'uppercase', letterSpacing: 0.5,
          }}>
            ✉️ Contact Support
          </Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}
