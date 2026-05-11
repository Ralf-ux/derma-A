import type { User } from '@supabase/supabase-js';
import { supabase } from './supabaseClient';
import type { UserProfile } from '../db';

export async function supabaseSignIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

export interface SignUpProfile {
  firstName: string;
  lastName: string;
  sex: 'male' | 'female' | 'other';
  location: string;
  contact: string;
}

export async function supabaseSignUp(email: string, password: string, profile: SignUpProfile) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        first_name: profile.firstName,
        last_name: profile.lastName,
        sex: profile.sex,
        location: profile.location,
        contact: profile.contact,
        role: 'patient',
      },
    },
  });
  if (error) throw error;

  // Insert into profiles table if user was created
  if (data.user) {
    await supabase.from('profiles').upsert({
      id: data.user.id,
      first_name: profile.firstName,
      last_name: profile.lastName,
      sex: profile.sex,
      location: profile.location,
      contact: profile.contact,
      role: 'patient',
    });
  }

  return data;
}

export async function supabaseSignOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

/** Normalize DB / metadata role so the Admin tab matches (`'Admin'` → `'admin'`). */
export function normalizeProfileRole(role: unknown): 'patient' | 'admin' {
  const s = String(role ?? '').trim().toLowerCase();
  return s === 'admin' ? 'admin' : 'patient';
}

export async function fetchProfile(userId: string) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

function normalizeSex(value: unknown): UserProfile['sex'] {
  const s = String(value ?? '').trim().toLowerCase();
  return s === 'male' || s === 'female' || s === 'other' ? s : 'other';
}

export function buildAppUser(supaUser: User, profile: Record<string, unknown> | null): UserProfile {
  const meta = (supaUser.user_metadata ?? {}) as Record<string, unknown>;
  return {
    id: supaUser.id,
    firstName: String(profile?.first_name ?? meta.first_name ?? supaUser.email?.split('@')[0] ?? ''),
    lastName: String(profile?.last_name ?? meta.last_name ?? ''),
    email: supaUser.email ?? '',
    sex: normalizeSex(profile?.sex ?? meta.sex),
    location: String(profile?.location ?? meta.location ?? ''),
    contact: String(profile?.contact ?? meta.contact ?? ''),
    role: normalizeProfileRole(profile?.role ?? meta.role),
    biometricEnabled: false,
    avatarUrl: profile?.avatar_url != null ? String(profile.avatar_url) : undefined,
  };
}

export async function updateUserProfile(
  userId: string,
  patch: {
    first_name?: string;
    last_name?: string;
    sex?: 'male' | 'female' | 'other';
    location?: string;
    contact?: string;
    avatar_url?: string | null;
  },
) {
  const { error } = await supabase.from('profiles').update(patch).eq('id', userId);
  if (error) throw error;
}

export async function uploadProfileAvatar(userId: string, file: File) {
  const ext = file.type === 'image/png' ? 'png' : 'jpg';
  const path = `${userId}/avatar-${Date.now()}.${ext}`;
  const { error: uploadError } = await supabase.storage.from('avatars').upload(path, file, {
    contentType: file.type || 'image/jpeg',
    upsert: false,
  });
  if (uploadError) throw uploadError;
  const { data } = supabase.storage.from('avatars').getPublicUrl(path);
  return data.publicUrl;
}
