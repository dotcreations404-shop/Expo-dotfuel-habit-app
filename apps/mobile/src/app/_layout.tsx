/**
 * Root layout — providers + conditional auth routing.
 */
import { useEffect } from 'react';
import { useColorScheme, Platform, View } from 'react-native';
import { Slot, useRouter, useSegments } from 'expo-router';
import { DarkTheme, ThemeProvider } from 'expo-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts } from 'expo-font';
import { Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold, Inter_800ExtraBold, Inter_900Black } from '@expo-google-fonts/inter';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AuthProvider, useAuth } from '@/contexts/auth-context';

// Prevent splash screen from auto-hiding
SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 min
      retry: 2,
    },
  },
});

/**
 * DotFuel dark theme — matches the webapp's dark-only design.
 */
const DotFuelTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    primary: '#C2F000',
    background: '#0A0A0A',
    card: '#161616',
    text: '#F0F0F0',
    border: 'rgba(255,255,255,0.05)',
    notification: '#FF3B3B',
  },
};

/** Handles auth-based routing. */
function AuthGate() {
  const { session, loading, needsOnboarding } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    // Wait for both session AND profile to resolve before routing.
    if (loading) return;

    const inAuthGroup = segments[0] === '(auth)';
    const inOnboarding = inAuthGroup && segments[1] === 'onboarding';

    if (!session) {
      // ① Signed out — always go to auth splash, from anywhere
      if (!inAuthGroup) {
        router.replace('/(auth)');
      }
    } else if (needsOnboarding) {
      // ② Profile incomplete — always force onboarding, from anywhere
      if (!inOnboarding) {
        router.replace('/(auth)/onboarding');
      }
    } else {
      // ③ Complete profile — leave auth screens immediately
      if (inAuthGroup) {
        router.replace('/(tabs)/(home)' as any);
      }
    }
  // NOTE: router is intentionally excluded — it's stable and including it
  // causes an extra render that can produce redirect loops on web.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, loading, needsOnboarding, segments]);

  useEffect(() => {
    if (!loading) {
      SplashScreen.hideAsync();
    }
  }, [loading]);

  return (
    <View style={{ flex: 1, backgroundColor: DotFuelTheme.colors.background }}>
      <View style={{
        flex: 1,
        maxWidth: Platform.OS === 'web' ? 480 : '100%',
        width: '100%',
        marginHorizontal: 'auto',
        backgroundColor: DotFuelTheme.colors.background,
        overflow: (Platform.OS === 'web'
          ? (typeof navigator !== 'undefined' && /Mobi|Android/i.test(navigator.userAgent) ? 'visible' : 'auto')
          : 'visible') as any,
      }}>
        <Slot />
      </View>
    </View>
  );
}


export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    Inter_800ExtraBold,
    Inter_900Black,
    'Inter': Inter_400Regular,
  });

  if (!fontsLoaded) {
    return null;
  }

  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider value={DotFuelTheme}>
          <StatusBar style="light" />
          <AuthProvider>
            <AuthGate />
          </AuthProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
