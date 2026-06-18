/**
 * Auth context — wraps Supabase auth state for the entire app.
 *
 * Follows the official Supabase recommendation: use ONLY onAuthStateChange
 * as the single source of truth for session state. Do NOT use getSession()
 * alongside the listener — it causes double-fetching and race conditions.
 *
 * Profile loading is tied directly to auth events so `needsOnboarding` is
 * only evaluated once both session AND profile are definitively known.
 */
import React, { createContext, useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Platform } from 'react-native';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import type { UserProfile } from '@/lib/types';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { savePushToken } from '@/lib/notifications';

WebBrowser.maybeCompleteAuthSession();

interface AuthContextValue {
  /** Current Supabase session (null if signed out). */
  session: Session | null;
  /** Current Supabase user (shorthand for session.user). */
  user: User | null;
  /** Full user profile from the `users` table. */
  profile: UserProfile | null;
  /**
   * True while initial session + profile are being resolved.
   * The AuthGate waits for this before making any routing decisions.
   */
  loading: boolean;
  /**
   * True when the user is signed in but hasn't completed their profile.
   * Only meaningful when loading === false.
   */
  needsOnboarding: boolean;
  /** Sign in with Google OAuth. */
  signInWithGoogle: () => Promise<void>;
  /** Sign in with Apple (iOS only). */
  signInWithApple: () => Promise<void>;
  /** Send magic link / OTP to email. */
  sendOtp: (email: string) => Promise<void>;
  /** Verify OTP code. */
  verifyOtp: (email: string, token: string) => Promise<void>;
  /** Sign out. */
  signOut: () => Promise<void>;
  /**
   * Directly set profile state — call this after saving onboarding data
   * to avoid a second DB round-trip and race conditions.
   */
  setProfileDirect: (profile: UserProfile) => void;
  /** Re-fetch profile from DB (use sparingly). */
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // ── Fetch profile from DB ─────────────────────────────────────────────────
  const fetchProfile = useCallback(async (userId: string): Promise<void> => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (error) {
        console.warn('[auth] Profile fetch error:', error.message);
      }
      setProfile(data ?? null);
      if (data) {
        savePushToken(userId).catch(console.warn);
      }
    } catch (err) {
      console.warn('[auth] Profile fetch failed:', err);
      setProfile(null);
    }
  }, []);

  // ── Single source of truth: onAuthStateChange ─────────────────────────────
  // Per Supabase docs: use onAuthStateChange exclusively — not alongside
  // getSession(). The INITIAL_SESSION event fires immediately on mount with
  // the restored session (or null if signed out), replacing the need for
  // a separate getSession() call.
  useEffect(() => {
    let mounted = true;

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, s) => {
        if (!mounted) return;

        console.log('[auth] event:', event, 'userId:', s?.user?.id ?? 'none');

        if (event === 'INITIAL_SESSION') {
          // Fired once on mount with the restored session (or null).
          setSession(s);
          if (s?.user?.id) {
            await fetchProfile(s.user.id);
          }
          // Loading is resolved — we now know session + profile state.
          if (mounted) setLoading(false);

        } else if (event === 'SIGNED_IN') {
          // Fired after a successful sign-in. Profile row may not exist yet
          // for brand-new users — that's fine, needsOnboarding handles it.
          setSession(s);
          if (s?.user?.id) {
            await fetchProfile(s.user.id);
          }
          if (mounted) setLoading(false);

        } else if (event === 'SIGNED_OUT') {
          setSession(null);
          setProfile(null);
          if (mounted) setLoading(false);

        } else if (event === 'TOKEN_REFRESHED') {
          // Just update the session — no need to re-fetch profile.
          setSession(s);
        }
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [fetchProfile]);

  // ── Auth actions ──────────────────────────────────────────────────────────
  const signInWithGoogle = useCallback(async () => {
    try {
      const redirectTo = Linking.createURL('/');
      if (Platform.OS === 'web') {
        const { error } = await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: { redirectTo },
        });
        if (error) throw error;
      } else {
        const { data, error } = await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: {
            redirectTo,
            skipBrowserRedirect: true,
          },
        });
        if (error) throw error;

        if (data?.url) {
          const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
          if (result.type === 'success') {
            const { url } = result;
            const params = Linking.parse(url);
            const { access_token, refresh_token } = params.queryParams || {};
            if (access_token && refresh_token) {
              const { error: setSessionError } = await supabase.auth.setSession({
                access_token: access_token as string,
                refresh_token: refresh_token as string,
              });
              if (setSessionError) throw setSessionError;
            }
          }
        }
      }
    } catch (err: any) {
      Alert.alert('Sign In Error', err.message || 'Failed to sign in with Google');
    }
  }, []);

  const signInWithApple = useCallback(async () => {
    try {
      const redirectTo = Linking.createURL('/');
      if (Platform.OS === 'web') {
        const { error } = await supabase.auth.signInWithOAuth({
          provider: 'apple',
          options: { redirectTo },
        });
        if (error) throw error;
      } else {
        const { data, error } = await supabase.auth.signInWithOAuth({
          provider: 'apple',
          options: {
            redirectTo,
            skipBrowserRedirect: true,
          },
        });
        if (error) throw error;

        if (data?.url) {
          const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
          if (result.type === 'success') {
            const { url } = result;
            const params = Linking.parse(url);
            const { access_token, refresh_token } = params.queryParams || {};
            if (access_token && refresh_token) {
              const { error: setSessionError } = await supabase.auth.setSession({
                access_token: access_token as string,
                refresh_token: refresh_token as string,
              });
              if (setSessionError) throw setSessionError;
            }
          }
        }
      }
    } catch (err: any) {
      Alert.alert('Sign In Error', err.message || 'Failed to sign in with Apple');
    }
  }, []);

  const sendOtp = useCallback(async (email: string) => {
    const emailRedirectTo = Linking.createURL('/');
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo },
    });
    if (error) throw error;
  }, []);

  const verifyOtp = useCallback(async (email: string, token: string) => {
    const { error } = await supabase.auth.verifyOtp({ email, token, type: 'email' });
    if (error) throw error;
  }, []);

  const signOut = useCallback(async () => {
    setLoading(true);
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.warn('[auth] signOut error:', err);
    }
    // onAuthStateChange SIGNED_OUT will handle state cleanup, but we also
    // set state here immediately so the AuthGate responds without waiting.
    setSession(null);
    setProfile(null);
    setLoading(false);
  }, []);

  /**
   * Directly update profile state in-memory (no DB fetch).
   * Call this after a successful upsert to make needsOnboarding flip
   * synchronously without a second round-trip to Supabase.
   */
  const setProfileDirect = useCallback((data: UserProfile) => {
    setProfile(data);
  }, []);

  /** Re-fetch profile from DB. Use after settings updates. */
  const refreshProfile = useCallback(async () => {
    const userId = session?.user?.id;
    if (userId) await fetchProfile(userId);
  }, [session?.user?.id, fetchProfile]);

  // ── Derived state ─────────────────────────────────────────────────────────
  const needsOnboarding = !loading && !!session && (!profile || !profile.calorie_target);

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
    setProfileDirect,
    refreshProfile,
  }), [
    session, profile, loading, needsOnboarding,
    signInWithGoogle, signInWithApple, sendOtp, verifyOtp,
    signOut, setProfileDirect, refreshProfile,
  ]);

  return <AuthContext value={value}>{children}</AuthContext>;
}

/** Hook to access auth context. Must be used within AuthProvider. */
export function useAuth(): AuthContextValue {
  const ctx = React.use(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
