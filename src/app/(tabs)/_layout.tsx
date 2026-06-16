/**
 * Tabs layout — native bottom tab bar.
 * Home, Log, Challenges, Profile.
 */
import { Redirect } from 'expo-router';
import { Tabs } from 'expo-router/tabs';
import { Image } from 'expo-image';
import { useAuth } from '@/contexts/auth-context';
import { DotFuelColors } from '@/constants/colors';

export default function TabsLayout() {
  const { session, needsOnboarding } = useAuth();

  // Guard: redirect if not authenticated
  if (!session) return <Redirect href="/(auth)" />;
  if (needsOnboarding) return <Redirect href="/(auth)/onboarding/0" />;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: DotFuelColors.card,
          borderTopColor: DotFuelColors.cardBorder,
          borderTopWidth: 1,
        },
        tabBarActiveTintColor: DotFuelColors.lime,
        tabBarInactiveTintColor: DotFuelColors.muted,
        tabBarLabelStyle: {
          fontFamily: 'Inter',
          fontSize: 9,
          fontWeight: '700',
          letterSpacing: 1,
          textTransform: 'uppercase',
        },
      }}
    >
      <Tabs.Screen
        name="(home)"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => (
            <Image
              source="sf:house.fill"
              style={{ width: size, height: size }}
              tintColor={color as string}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="(log)"
        options={{
          title: 'Log',
          tabBarIcon: ({ color, size }) => (
            <Image
              source="sf:plus.circle.fill"
              style={{ width: size, height: size }}
              tintColor={color as string}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="(challenges)"
        options={{
          title: 'Challenges',
          tabBarIcon: ({ color, size }) => (
            <Image
              source="sf:trophy.fill"
              style={{ width: size, height: size }}
              tintColor={color as string}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="(profile)"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size }) => (
            <Image
              source="sf:person.fill"
              style={{ width: size, height: size }}
              tintColor={color as string}
            />
          ),
        }}
      />
    </Tabs>
  );
}
