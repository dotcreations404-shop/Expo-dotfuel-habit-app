/**
 * Auth context — wraps Supabase auth state for the entire app.
 *
 * Follows the official Supabase recommendation: use ONLY onAuthStateChange
 * as the single source of truth for session state. Do NOT use getSession()
 * alongside the listener — it causes double-fetching and race conditions.
 *
 * Profile loading is tied directly to auth events so `needsOnboarding` is
 * only evaluated once both session AND profile are definitively known.
 *
 * IMPORTANT: To prevent the "redirect loop" on magic-link / PKCE flows,
 * we track whether a deep-link URL with auth params is being processed.
 * `loading` stays `true` until BOTH the initial session restore AND any
 * pending URL-based auth are complete. This prevents the AuthGate from
 * prematurely routing to the login page while a code exchange is in-flight.
 */
import React, { createContext, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Platform } from 'react-native';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { mapUsersDbToAppMode, mapProfilesDbToAppMode } from '@/lib/types';
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

/** Check whether a URL contains Supabase auth params (code, access_token, etc.). */
function urlHasAuthParams(url: string): boolean {
  try {
    const parsed = Linking.parse(url);
    const qp = parsed.queryParams || {};
    if (qp.code || qp.access_token) return true;

    // Fallback: manually scan for params in query string or hash fragment
    const hashIdx = url.indexOf('#');
    const queryIdx = url.indexOf('?');
    const searchPart = hashIdx !== -1
      ? url.substring(hashIdx + 1)
      : queryIdx !== -1
        ? url.substring(queryIdx + 1)
        : '';
    if (searchPart) {
      const p = new URLSearchParams(searchPart.split('#')[0].split('?')[0]);
      return p.has('code') || p.has('access_token');
    }
  } catch {
    // ignore
  }
  return false;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  /**
   * Tracks whether we are still processing a URL-based auth flow
   * (e.g. PKCE code exchange from a magic link). When true, the
   * INITIAL_SESSION handler won't flip `loading` to false.
   */
  const pendingUrlAuth = useRef(false);
  /** Whether INITIAL_SESSION has already resolved. */
  const initialSessionDone = useRef(false);

  // ── Fetch profile from DB ─────────────────────────────────────────────────
  const fetchProfile = useCallback(async (userId: string): Promise<void> => {
    try {
      const [userResult, profileResult] = await Promise.all([
        supabase.from('users').select('*').eq('id', userId).maybeSingle(),
        supabase.from('profiles').select('*').eq('id', userId).maybeSingle(),
      ]);

      if (userResult.error) {
        console.warn('[auth] Users fetch error:', userResult.error.message);
      }
      if (profileResult.error) {
        console.warn('[auth] Profiles fetch error:', profileResult.error.message);
      }

      const userData = userResult.data;
      const profileData = profileResult.data;

      if (userData || profileData) {
        const merged: UserProfile = {
          ...(userData || {}),
          ...(profileData || {}),
          id: userId,
        };

        // Map database fuel_mode to application fuel_mode
        merged.fuel_mode = mapUsersDbToAppMode(userData?.fuel_mode) || mapProfilesDbToAppMode(profileData?.fuel_mode) || 'balance';

        // If water_goal_l is in profiles table, convert Liters to mL
        if (profileData?.water_goal_l !== undefined && profileData?.water_goal_l !== null) {
          merged.water_goal_ml = Math.round(profileData.water_goal_l * 1000);
        }

        setProfile(merged);
        savePushToken(userId).catch(console.warn);
      } else {
        setProfile(null);
      }
    } catch (err) {
      console.warn('[auth] Profile fetch failed:', err);
      setProfile(null);
    }
  }, []);

  // ── Helper: resolve loading only when ALL pending work is done ─────────
  const maybeFinishLoading = useCallback(() => {
    if (initialSessionDone.current && !pendingUrlAuth.current) {
      setLoading(false);
    }
  }, []);

  // ── Deep-Linking & PKCE Authorization handling ─────────────────────────────
  const handleAuthUrl = useCallback(async (url: string) => {
    try {
      console.log('[auth] handleAuthUrl:', url);

      if (!urlHasAuthParams(url)) {
        console.log('[auth] URL has no auth params, skipping.');
        pendingUrlAuth.current = false;
        maybeFinishLoading();
        return;
      }

      // Mark that we are processing a URL auth flow — keep loading = true
      pendingUrlAuth.current = true;

      const parsed = Linking.parse(url);
      const { code, access_token, refresh_token } = parsed.queryParams || {};

      let token = access_token as string;
      let refresh = refresh_token as string;
      let pkceCode = code as string;

      // Clean and manual parse fallback for query/hash parameters
      let cleanSearch = '';
      const hashIndex = url.indexOf('#');
      const queryIndex = url.indexOf('?');
      if (hashIndex !== -1) {
        cleanSearch = url.substring(hashIndex + 1);
      } else if (queryIndex !== -1) {
        cleanSearch = url.substring(queryIndex + 1);
      }
      if (cleanSearch) {
        const innerHashIndex = cleanSearch.indexOf('#');
        if (innerHashIndex !== -1) {
          cleanSearch = cleanSearch.substring(0, innerHashIndex);
        }
        const innerQueryIndex = cleanSearch.indexOf('?');
        if (innerQueryIndex !== -1) {
          cleanSearch = cleanSearch.substring(0, innerQueryIndex);
        }
        
        const params = new URLSearchParams(cleanSearch);
        if (params.has('access_token')) token = params.get('access_token')!;
        if (params.has('refresh_token')) refresh = params.get('refresh_token')!;
        if (params.has('code')) pkceCode = params.get('code')!;
      }

      if (pkceCode) {
        console.log('[auth] PKCE code detected, exchanging for session...');
        const { error } = await supabase.auth.exchangeCodeForSession(pkceCode);
        if (error) {
          console.warn('[auth] PKCE exchange error:', error.message);
          // Code may already have been consumed by detectSessionInUrl on web.
          // If so, onAuthStateChange will handle the session — not an error.
          if (!error.message?.includes('code')) {
            throw error;
          }
        }
      } else if (token && refresh) {
        console.log('[auth] Session tokens detected, setting session...');
        const { error } = await supabase.auth.setSession({
          access_token: token,
          refresh_token: refresh,
        });
        if (error) throw error;
      }

      // The SIGNED_IN event from onAuthStateChange will set loading=false.
      // Mark URL processing as done so the auth listener can resolve.
      pendingUrlAuth.current = false;
      maybeFinishLoading();
    } catch (err: any) {
      console.warn('[auth] Redirect URL handling failed:', err.message || err);
      pendingUrlAuth.current = false;
      maybeFinishLoading();
    }
  }, [maybeFinishLoading]);

  // ── Check for auth URL at startup (BEFORE onAuthStateChange can route) ──
  useEffect(() => {
    let cancelled = false;

    // 1) Check initial URL synchronously-ish — if it has auth params,
    //    mark as pending so INITIAL_SESSION won't prematurely resolve.
    Linking.getInitialURL().then((url) => {
      if (cancelled) return;
      if (url && urlHasAuthParams(url)) {
        console.log('[auth] Initial URL has auth params — holding loading=true');
        pendingUrlAuth.current = true;
        handleAuthUrl(url);
      } else {
        // No auth URL — if INITIAL_SESSION already fired, we can unlock.
        pendingUrlAuth.current = false;
        maybeFinishLoading();
      }
    });

    // 2) Listen for runtime deep links (e.g. app already open, link tapped)
    const subscription = Linking.addEventListener('url', (event) => {
      handleAuthUrl(event.url);
    });

    // 3) Safety timeout — never stay stuck in loading for more than 10s.
    //    This handles edge cases where the URL processing silently fails
    //    or the deep-link callback never fires.
    const timeout = setTimeout(() => {
      if (!cancelled) {
        console.warn('[auth] Safety timeout — forcing loading=false');
        pendingUrlAuth.current = false;
        initialSessionDone.current = true;
        setLoading(false);
      }
    }, 10_000);

    return () => {
      cancelled = true;
      clearTimeout(timeout);
      subscription.remove();
    };
  }, [handleAuthUrl, maybeFinishLoading]);

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
          // On web with detectSessionInUrl=true, this may already include
          // the session from a PKCE code exchange.
          setSession(s);
          if (s?.user?.id) {
            await fetchProfile(s.user.id);
          }
          // Mark INITIAL_SESSION as done — but only resolve loading if
          // there's no pending URL auth in progress.
          initialSessionDone.current = true;
          if (mounted) maybeFinishLoading();

        } else if (event === 'SIGNED_IN') {
          // Fired after a successful sign-in (including PKCE exchange).
          setSession(s);
          if (s?.user?.id) {
            await fetchProfile(s.user.id);
          }
          // SIGNED_IN always resolves loading regardless of other state.
          initialSessionDone.current = true;
          pendingUrlAuth.current = false;
          if (mounted) setLoading(false);

        } else if (event === 'SIGNED_OUT') {
          setSession(null);
          setProfile(null);
          initialSessionDone.current = true;
          pendingUrlAuth.current = false;
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
  }, [fetchProfile, maybeFinishLoading]);

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
