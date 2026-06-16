/**
 * Root layout — providers + conditional auth routing.
 */
import { useEffect } from 'react';
import { useColorScheme } from 'react-native';
import { Slot, useRouter, useSegments } from 'expo-router';
import { DarkTheme, ThemeProvider } from 'expo-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';

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
    if (loading) return;

    const inAuthGroup = segments[0] === '(auth)';

    if (!session && !inAuthGroup) {
      // Not signed in → redirect to auth
      router.replace('/(auth)');
    } else if (session && inAuthGroup) {
      if (needsOnboarding) {
        router.replace('/(auth)/onboarding/0');
      } else {
        router.replace('/(tabs)/(home)' as any);
      }
    }
  }, [session, loading, needsOnboarding, segments]);

  useEffect(() => {
    if (!loading) {
      SplashScreen.hideAsync();
    }
  }, [loading]);

  return <Slot />;
}

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider value={DotFuelTheme}>
        <StatusBar style="light" />
        <AuthProvider>
          <AuthGate />
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
