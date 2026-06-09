import type { AuthResponse, User } from '@supabase/supabase-js';
import type { UserProfile } from '../../types/user';
import { supabase } from './client';
import { getEnv } from '../getEnv';

function getConfigValue(key: string): string | undefined {
  return getEnv(key);
}

function normalizeEmail(email: unknown): string {
  return String(email ?? '').trim().toLowerCase();
}

function parseAdminEmailAllowlist(): Set<string> {
  const single = normalizeEmail(
    getConfigValue('EXPO_PUBLIC_ADMIN_EMAIL') ?? getConfigValue('VITE_ADMIN_EMAIL'),
  );
  const list = String(
    getConfigValue('EXPO_PUBLIC_ADMIN_EMAILS') ?? getConfigValue('VITE_ADMIN_EMAILS') ?? '',
  )
    .split(',')
    .map((v) => normalizeEmail(v))
    .filter(Boolean);
  const values = single ? [single, ...list] : list;
  return new Set(values);
}

const ADMIN_EMAIL_ALLOWLIST = parseAdminEmailAllowlist();

function resolveRoleForEmail(email: string): UserProfile['role'] {
  return ADMIN_EMAIL_ALLOWLIST.has(normalizeEmail(email)) ? 'admin' : 'patient';
}

export function normalizeProfileRole(role: unknown): UserProfile['role'] {
  const s = String(role ?? '').trim().toLowerCase();
  return s === 'admin' ? 'admin' : 'patient';
}

function normalizeSex(value: unknown): UserProfile['sex'] {
  const s = String(value ?? '').trim().toLowerCase();
  return s === 'male' || s === 'female' || s === 'other' ? s : 'other';
}

export async function supabaseSignIn(email: string, password: string): Promise<AuthResponse['data']> {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  if (data.user) {
    await ensureProfileFromAuthUser(data.user).catch(() => null);
  }
  return data;
}

export async function supabaseSignUp(
  email: string,
  password: string,
  profile: {
    firstName: string;
    lastName: string;
    sex: UserProfile['sex'];
    location: string;
    contact: string;
  },
): Promise<AuthResponse['data']> {
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
      },
    },
  });
  if (error) throw error;
  if (data.user && data.session) {
    await upsertProfileRow(data.user.id, email, profile);
  }
  return data;
}

export async function supabaseSignOut(): Promise<void> {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function fetchProfile(userId: string): Promise<Record<string, unknown> | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function updateUserProfile(
  userId: string,
  patch: {
    first_name?: string;
    last_name?: string;
    sex?: UserProfile['sex'];
    location?: string;
    contact?: string;
    avatar_url?: string | null;
  },
): Promise<void> {
  const { error } = await supabase.from('profiles').update(patch).eq('id', userId);
  if (error) throw error;
}

export async function uploadProfileAvatar(userId: string, file: File): Promise<string> {
  return uploadProfileAvatarBlob(userId, file, file.type || 'image/jpeg', 'jpg');
}

export async function uploadProfileAvatarFromUri(userId: string, uri: string): Promise<string> {
  const response = await fetch(uri);
  const blob = await response.blob();
  const ext = uri.toLowerCase().includes('.png') ? 'png' : 'jpg';
  return uploadProfileAvatarBlob(userId, blob, blob.type || 'image/jpeg', ext);
}

async function uploadProfileAvatarBlob(
  userId: string,
  body: Blob | File,
  contentType: string,
  ext: string,
): Promise<string> {
  const path = `${userId}/avatar.${ext}`;
  const { error: uploadError } = await supabase.storage
    .from('avatars')
    .upload(path, body, { upsert: true, contentType });
  if (uploadError) throw uploadError;
  const { data } = supabase.storage.from('avatars').getPublicUrl(path);
  return `${data.publicUrl}?t=${Date.now()}`;
}

export function buildAppUser(supaUser: User, profile: Record<string, unknown> | null): UserProfile {
  const meta = (supaUser.user_metadata ?? {}) as Record<string, unknown>;
  const email = supaUser.email ?? '';
  const roleFromDb = profile?.role != null ? normalizeProfileRole(profile.role) : null;
  const role =
    roleFromDb ?? (ADMIN_EMAIL_ALLOWLIST.has(normalizeEmail(email)) ? 'admin' : 'patient');

  return {
    id: supaUser.id,
    firstName: String(profile?.first_name ?? meta.first_name ?? ''),
    lastName: String(profile?.last_name ?? meta.last_name ?? ''),
    email,
    sex: normalizeSex(profile?.sex ?? meta.sex),
    location: String(profile?.location ?? meta.location ?? ''),
    contact: String(profile?.contact ?? meta.contact ?? ''),
    role,
    biometricEnabled: false,
    avatarUrl: profile?.avatar_url ? String(profile.avatar_url) : undefined,
  };
}

export function usersEqual(a: UserProfile | null, b: UserProfile | null): boolean {
  if (!a || !b) return a === b;
  return (
    a.id === b.id &&
    a.firstName === b.firstName &&
    a.lastName === b.lastName &&
    a.email === b.email &&
    a.sex === b.sex &&
    a.location === b.location &&
    a.contact === b.contact &&
    a.role === b.role &&
    a.avatarUrl === b.avatarUrl
  );
}

async function upsertProfileRow(
  userId: string,
  email: string,
  profile: {
    firstName: string;
    lastName: string;
    sex: UserProfile['sex'];
    location: string;
    contact: string;
  },
): Promise<void> {
  const { error } = await supabase.from('profiles').upsert(
    {
      id: userId,
      first_name: profile.firstName,
      last_name: profile.lastName,
      sex: profile.sex,
      location: profile.location,
      contact: profile.contact,
      role: resolveRoleForEmail(email),
    },
    { onConflict: 'id' },
  );
  if (error) throw error;
}

async function ensureProfileFromAuthUser(user: User): Promise<Record<string, unknown> | null> {
  const existing = await fetchProfile(user.id);
  if (existing) return existing;

  const meta = (user.user_metadata ?? {}) as Record<string, unknown>;
  const email = user.email ?? '';
  const { error } = await supabase.from('profiles').insert({
    id: user.id,
    first_name: String(meta.first_name ?? ''),
    last_name: String(meta.last_name ?? ''),
    sex: normalizeSex(meta.sex),
    location: String(meta.location ?? ''),
    contact: String(meta.contact ?? ''),
    role: resolveRoleForEmail(email),
  });

  if (error) {
    if (error.code === '23505') return fetchProfile(user.id);
    throw error;
  }
  return fetchProfile(user.id);
}
