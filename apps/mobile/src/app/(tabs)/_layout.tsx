/**
 * Tabs layout — native bottom tab bar.
 * Home, Log, Challenges, Profile.
 */
import { Redirect } from 'expo-router';
import { Tabs } from 'expo-router/tabs';
import Feather from '@expo/vector-icons/Feather';
import { Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/contexts/auth-context';
import { DotFuelColors } from '@/constants/colors';
import { FloatingDotBoy } from '@/components/floating-dotboy';

export default function TabsLayout() {
  const { session, needsOnboarding } = useAuth();
  const insets = useSafeAreaInsets();

  // Guard: redirect if not authenticated
  if (!session) return <Redirect href="/(auth)" />;
  if (needsOnboarding) return <Redirect href="/(auth)/onboarding" />;

  // Bottom padding: use safe area on iOS/native & mobile Safari/web, fixed on desktop web/Android
  const tabBarBottomPad = (Platform.OS === 'ios' || Platform.OS === 'web') ? Math.max(insets.bottom, 10) : 10;
  const tabBarHeight = 56 + tabBarBottomPad;

  return (
    <>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarStyle: {
            backgroundColor: DotFuelColors.card,
            borderTopColor: DotFuelColors.cardBorder,
            borderTopWidth: 1,
            height: tabBarHeight,
            paddingTop: 10,
            paddingBottom: tabBarBottomPad,
          },
          tabBarActiveTintColor: DotFuelColors.lime,
          tabBarInactiveTintColor: DotFuelColors.muted,
          tabBarLabelStyle: {
            fontFamily: 'Inter',
            fontSize: 9,
            fontWeight: '700',
            letterSpacing: 1,
            textTransform: 'uppercase',
            marginTop: 4,
          },
        }}
      >
        <Tabs.Screen
          name="(home)"
          options={{
            title: 'Home',
            href: '/(tabs)/(home)',
            tabBarIcon: ({ color }) => <Feather name="home" size={20} color={color} />,
          }}
        />
        <Tabs.Screen
          name="(log)"
          options={{
            title: 'Log',
            href: '/(tabs)/(log)',
            tabBarIcon: ({ color }) => <Feather name="plus-circle" size={20} color={color} />,
          }}
        />
        <Tabs.Screen
          name="(challenges)"
          options={{
            title: 'Challenges',
            href: '/(tabs)/(challenges)',
            tabBarIcon: ({ color }) => <Feather name="star" size={20} color={color} />,
          }}
        />
        <Tabs.Screen
          name="(profile)"
          options={{
            title: 'Profile',
            href: '/(tabs)/(profile)',
            tabBarIcon: ({ color }) => <Feather name="user" size={20} color={color} />,
          }}
        />
      </Tabs>
      <FloatingDotBoy />
    </>
  );
}

