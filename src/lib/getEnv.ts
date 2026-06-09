import Constants from 'expo-constants';
import { Platform } from 'react-native';

/**
 * Unified env reader that works on both Vite (web) and Expo/Hermes (native).
 *
 * Priority order:
 *  1. process.env          — set by Expo CLI for EXPO_PUBLIC_* vars on native,
 *                            and by Vite's define plugin on web
 *  2. import.meta.env      — Vite only (web build); accessed via a safe wrapper
 *                            that is never evaluated on native/Hermes
 *  3. Constants.expoConfig.extra — fallback for native when process.env is empty
 */
export function getEnv(key: string): string | undefined {
  const PLACEHOLDERS = ['YOUR_SUPABASE_URL_HERE', 'YOUR_SUPABASE_ANON_KEY_HERE'];

  const isValid = (v: string | undefined): v is string =>
    Boolean(v) && !PLACEHOLDERS.includes(v!);

  // 1. process.env — available on both native (Expo injects EXPO_PUBLIC_*) and web
  if (typeof process !== 'undefined' && process.env) {
    const val = process.env[key];
    if (isValid(val)) return val;
  }

  // 2. Vite import.meta.env — web ONLY.
  //    We use a function + eval trick so Hermes never parses the import.meta syntax.
  //    On web, Vite statically replaces import.meta.env.* at build time anyway.
  if (Platform.OS === 'web') {
    try {
      // eslint-disable-next-line no-new-func
      const getViteEnv = new Function('key', 'return (typeof import.meta !== "undefined" && import.meta.env) ? import.meta.env[key] : undefined');
      const val = getViteEnv(key) as string | undefined;
      if (isValid(val)) return val;
    } catch {
      // ignore — Vite replaces import.meta.env at build time so runtime fallback is fine
    }
  }

  // 3. Expo config extra — native fallback (app.config.ts "extra" section)
  const fromExpo = Constants.expoConfig?.extra?.[key] as string | undefined;
  if (isValid(fromExpo)) return fromExpo;

  return undefined;
}
