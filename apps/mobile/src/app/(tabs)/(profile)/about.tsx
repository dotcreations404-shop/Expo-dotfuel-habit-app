/**
 * About DotFuel screen.
 */
import { View, ScrollView, Linking, Pressable } from 'react-native';
import { Text } from '@/components/ui/text';
import { SafeAreaView } from 'react-native-safe-area-context';
import Constants from 'expo-constants';
import { DotFuelColors, Spacing, Radius } from '@/constants/colors';

export default function AboutScreen() {
  const version = Constants.expoConfig?.version ?? '1.0.0';

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: DotFuelColors.black }} edges={['top', 'left', 'right']}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 100 }}
      >
        <View style={{ paddingTop: 8, paddingHorizontal: Spacing['2xl'], alignItems: 'center' }}>
          {/* Logo */}
          <View style={{
            width: 90, height: 90, borderRadius: 45,
            backgroundColor: DotFuelColors.lime, marginBottom: 16,
            alignItems: 'center', justifyContent: 'center',
          }}>
          <Text style={{
            fontFamily: 'Inter', fontSize: 28, fontWeight: '900', color: DotFuelColors.black,
          }}>
            DF
          </Text>
        </View>

        <Text style={{
          fontFamily: 'Inter', fontSize: 32, fontWeight: '900',
          color: DotFuelColors.white, textTransform: 'uppercase', letterSpacing: -1,
        }}>
          DotFuel
        </Text>
        <Text style={{
          fontSize: 12, color: DotFuelColors.muted, fontWeight: '600', marginTop: 4,
        }}>
          v{version}
        </Text>

        <Text style={{
          fontSize: 13, color: DotFuelColors.muted, fontWeight: '500',
          textAlign: 'center', marginTop: 16, maxWidth: 300, lineHeight: 20,
        }}>
          Your personal nutrition tracker built for Indian athletes. 
          Track calories, hit your macros, stay consistent.
        </Text>

        {/* Credits */}
        <View style={{
          marginTop: 28, width: '100%',
          backgroundColor: DotFuelColors.card, borderRadius: Radius.xl,
          padding: 20, borderWidth: 1, borderColor: DotFuelColors.cardBorder,
        }}>
          <Text style={{
            fontSize: 13, fontWeight: '800', color: DotFuelColors.white,
            textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12,
          }}>
            Built by
          </Text>
          <Text style={{ fontSize: 14, fontWeight: '700', color: DotFuelColors.lime }}>
            Dot Creations
          </Text>
          <Text style={{ fontSize: 12, color: DotFuelColors.muted, fontWeight: '500', marginTop: 4 }}>
            dotcreations404@gmail.com
          </Text>
        </View>

        <View style={{
          marginTop: 12, width: '100%',
          backgroundColor: DotFuelColors.card, borderRadius: Radius.xl,
          padding: 20, borderWidth: 1, borderColor: DotFuelColors.cardBorder,
        }}>
          <Text style={{
            fontSize: 13, fontWeight: '800', color: DotFuelColors.white,
            textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12,
          }}>
            Powered By
          </Text>
          {['Expo SDK 56', 'Supabase', 'Claude AI (Anthropic)', 'FatSecret', 'React Native'].map((tech) => (
            <Text key={tech} style={{
              fontSize: 13, color: DotFuelColors.muted, fontWeight: '600', marginBottom: 4,
            }}>
              • {tech}
            </Text>
          ))}
        </View>

        <Pressable
          onPress={() => Linking.openURL('https://github.com/dotcreations404-shop/app-dotfuel-shop')}
          style={({ pressed }) => ({
            marginTop: 20,
            opacity: pressed ? 0.7 : 1,
          })}
        >
          <Text style={{
            fontSize: 12, color: DotFuelColors.blue, fontWeight: '700',
            textDecorationLine: 'underline',
          }}>
            View on GitHub
          </Text>
        </Pressable>
      </View>
    </ScrollView>
    </SafeAreaView>
  );
}
