/**
 * Supabase client — initialised with expo-secure-store for token persistence
 * on native, falling back to localStorage on web.
 * Handles SSR (Node.js) by using a no-op storage adapter.
 */
import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://xljamnukzgystdthzgud.supabase.co';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key';

/** True when running in a browser (not Node SSR). */
const isBrowser = typeof window !== 'undefined';

/**
 * Custom storage adapter that uses expo-secure-store on native,
 * localStorage on web, and a no-op store during SSR.
 */
const ExpoSecureStoreAdapter = {
  getItem: async (key: string): Promise<string | null> => {
    if (process.env.EXPO_OS !== 'web') {
      return SecureStore.getItemAsync(key);
    }
    if (isBrowser) {
      return localStorage.getItem(key);
    }
    return null; // SSR — no storage available
  },
  setItem: async (key: string, value: string): Promise<void> => {
    if (process.env.EXPO_OS !== 'web') {
      await SecureStore.setItemAsync(key, value);
      return;
    }
    if (isBrowser) {
      localStorage.setItem(key, value);
    }
  },
  removeItem: async (key: string): Promise<void> => {
    if (process.env.EXPO_OS !== 'web') {
      await SecureStore.deleteItemAsync(key);
      return;
    }
    if (isBrowser) {
      localStorage.removeItem(key);
    }
  },
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: ExpoSecureStoreAdapter,
    autoRefreshToken: isBrowser,
    persistSession: isBrowser || process.env.EXPO_OS !== 'web',
    detectSessionInUrl: isBrowser && process.env.EXPO_OS === 'web',
  },
});

