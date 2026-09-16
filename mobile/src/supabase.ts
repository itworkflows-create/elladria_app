import 'react-native-url-polyfill/auto';
import { AppState, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { createClient, processLock } from '@supabase/supabase-js';
const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const key = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const storage = Platform.OS === 'web' ? AsyncStorage : {
  getItem: (name: string) => SecureStore.getItemAsync(name),
  setItem: (name: string, value: string) => SecureStore.setItemAsync(name, value),
  removeItem: (name: string) => SecureStore.deleteItemAsync(name),
};
function client(storageKey: string) {
  return url && key ? createClient(url, key, {
    auth: { storage, storageKey, autoRefreshToken: true, persistSession: true,
      detectSessionInUrl: false, lock: processLock },
    global: { fetch: (input, init) => fetch(input, { ...init,
      signal: init?.signal ?? AbortSignal.timeout(20000) }) },
  }) : null;
}
export const supabase = client('elladria.candidate.auth');
// Staff and candidate sessions are deliberately separate on the same browser.
export const adminSupabase = Platform.OS === 'web' ? client('elladria.staff.auth') : null;
export const cloudEnabled = process.env.EXPO_PUBLIC_BACKEND === 'supabase';
export function watchSupabaseAppState() {
  if (!supabase || Platform.OS === 'web') return () => {};
  const refresh = (state: string) => state === 'active'
    ? supabase!.auth.startAutoRefresh() : supabase!.auth.stopAutoRefresh();
  refresh(AppState.currentState);
  const sub = AppState.addEventListener('change', refresh);
  return () => { sub.remove(); supabase!.auth.stopAutoRefresh(); };
}
