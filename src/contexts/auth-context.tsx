/**
 * Auth context — wraps Supabase auth state for the entire app.
 * Provides user session, profile data, and auth actions.
 */
import React, { createContext, useCallback, useEffect, useMemo, useState } from 'react';
import { Alert } from 'react-native';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import type { UserProfile } from '@/lib/types';

interface AuthContextValue {
  /** Current Supabase session (null if signed out). */
  session: Session | null;
  /** Current Supabase user (shorthand for session.user). */
  user: User | null;
  /** Full user profile from the `users` table. */
  profile: UserProfile | null;
  /** True while initial session is being restored. */
  loading: boolean;
  /** True if onboarding is required (user exists but has no calorie target). */
  needsOnboarding: boolean;
  /** Sign in with Google OAuth. */
  signInWithGoogle: () => Promise<void>;
  /** Sign in with Apple (iOS only). */
  signInWithApple: () => Promise<void>;
  /** Send OTP to email. */
  sendOtp: (email: string) => Promise<void>;
  /** Verify OTP code. */
  verifyOtp: (email: string, token: string) => Promise<void>;
  /** Sign out. */
  signOut: () => Promise<void>;
  /** Refresh profile from DB. */
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

import { savePushToken } from '@/lib/notifications';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // ── Fetch profile ──────────────────────────────────────────────────────────
  const fetchProfile = useCallback(async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .maybeSingle();
      if (error) console.warn('Profile fetch error:', error.message);
      setProfile(data ?? null);
      
      // Attempt to save push token on login/fetch
      savePushToken(userId).catch(console.warn);
    } catch (err) {
      console.warn('Profile fetch failed:', err);
    }
  }, []);

  const refreshProfile = useCallback(async () => {
    if (session?.user?.id) await fetchProfile(session.user.id);
  }, [session?.user?.id, fetchProfile]);

  // ── Auth state listener ────────────────────────────────────────────────────
  useEffect(() => {
    // Restore session on mount
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      if (s?.user?.id) fetchProfile(s.user.id);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, s) => {
        setSession(s);
        if (s?.user?.id && (event === 'SIGNED_IN' || event === 'INITIAL_SESSION' || event === 'TOKEN_REFRESHED')) {
          await fetchProfile(s.user.id);
        }
        if (event === 'SIGNED_OUT') {
          setProfile(null);
        }
        setLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, [fetchProfile]);

  // ── Auth actions ───────────────────────────────────────────────────────────
  const signInWithGoogle = useCallback(async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: process.env.EXPO_OS === 'web'
          ? window.location.origin
          : 'appdotfuelshop://auth/callback',
      },
    });
    if (error) Alert.alert('Sign In Error', error.message);
  }, []);

  const signInWithApple = useCallback(async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'apple',
      options: {
        redirectTo: process.env.EXPO_OS === 'web'
          ? window.location.origin
          : 'appdotfuelshop://auth/callback',
      },
    });
    if (error) Alert.alert('Sign In Error', error.message);
  }, []);

  const sendOtp = useCallback(async (email: string) => {
    const { error } = await supabase.auth.signInWithOtp({ email });
    if (error) throw error;
  }, []);

  const verifyOtp = useCallback(async (email: string, token: string) => {
    const { error } = await supabase.auth.verifyOtp({ email, token, type: 'email' });
    if (error) throw error;
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setSession(null);
    setProfile(null);
  }, []);

  // ── Context value ──────────────────────────────────────────────────────────
  const needsOnboarding = !!session && (!profile || !profile.calorie_target);

  const value = useMemo<AuthContextValue>(() => ({
    session,
    user: session?.user ?? null,
    profile,
    loading,
    needsOnboarding,
    signInWithGoogle,
    signInWithApple,
    sendOtp,
    verifyOtp,
    signOut,
    refreshProfile,
  }), [session, profile, loading, needsOnboarding, signInWithGoogle, signInWithApple, sendOtp, verifyOtp, signOut, refreshProfile]);

  return <AuthContext value={value}>{children}</AuthContext>;
}

/**
 * Hook to access auth context. Must be used within AuthProvider.
 */
export function useAuth(): AuthContextValue {
  const ctx = React.use(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
