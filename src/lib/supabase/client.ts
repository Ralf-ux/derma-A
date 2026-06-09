import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { getEnv } from '../getEnv';

const supabaseUrl = getEnv('EXPO_PUBLIC_SUPABASE_URL') ?? '';
const supabaseAnonKey = getEnv('EXPO_PUBLIC_SUPABASE_ANON_KEY') ?? '';

export function isSupabaseConfigured(): boolean {
  return Boolean(supabaseUrl && supabaseAnonKey);
}

const clientOptions = Platform.OS === 'web'
  ? {}
  : {
      auth: {
        storage: AsyncStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
      },
    };

// Only create a real client when credentials are present. A dummy no-op
// client is returned otherwise so callers that guard with isSupabaseConfigured()
// will never attempt a real network request with an invalid key.
function buildClient(): SupabaseClient {
  if (!isSupabaseConfigured()) {
    // Minimal stub — createClient requires non-empty strings.
    // isSupabaseConfigured() guards all callers, but we still need a
    // non-throwing export to satisfy module loading.
    return createClient('http://localhost:54321', 'stub-key-not-used', clientOptions);
  }
  return createClient(supabaseUrl, supabaseAnonKey, clientOptions);
}

export const supabase: SupabaseClient = buildClient();
