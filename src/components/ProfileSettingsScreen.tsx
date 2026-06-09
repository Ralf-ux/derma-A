import React, { createElement, useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Easing,
  TextInput,
  ScrollView,
  Image,
  Platform,
  Alert,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { LogOut, ShieldCheck, User, Camera } from 'lucide-react-native';
import { useApp } from '../AppContext';
import { COLORS, RADIUS, SHADOW } from '../styles';
import { isSupabaseConfigured, supabase } from '../lib/supabase/client';
import {
  buildAppUser,
  fetchProfile,
  supabaseSignOut,
  updateUserProfile,
  uploadProfileAvatar,
  uploadProfileAvatarFromUri,
  usersEqual,
} from '../lib/supabase/auth';
import type { UserProfile } from '../types/user';

function getReadableSupabaseError(err: unknown): string {
  const message = String((err as any)?.message ?? '').trim();
  if (!message) return 'Could not sync with the server.';
  if (message.toLowerCase().includes('infinite recursion detected in policy for relation "profiles"')) {
    return 'Supabase RLS error on profiles. Re-run supabase/schema_daily_tips_and_avatar.sql in the SQL Editor, then sign in again.';
  }
  return message;
}

export default function ProfileSettingsScreen() {
  const { user, setUser, setActiveScreen } = useApp();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [firstName, setFirstName] = useState(user?.firstName ?? '');
  const [lastName, setLastName] = useState(user?.lastName ?? '');
  const [location, setLocation] = useState(user?.location ?? '');
  const [contact, setContact] = useState(user?.contact ?? '');
  const [sex, setSex] = useState<'male' | 'female' | 'other'>(user?.sex ?? 'other');
  const [saving, setSaving] = useState(false);
  const [avatarBusy, setAvatarBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
  }, []);

  /** Reload role + profile from Supabase (e.g. after SQL: update profiles set role = 'admin'). */
  const syncProfileFromServer = useCallback(async (opts?: { silent?: boolean }) => {
    if (!isSupabaseConfigured()) return;
    setSyncing(true);
    if (!opts?.silent) setMessage(null);
    try {
      const { data: authData, error: authErr } = await supabase.auth.getUser();
      if (authErr || !authData.user) throw new Error('Invalid session.');
      const profile = await fetchProfile(authData.user.id);
      const nextUser = buildAppUser(authData.user, profile);
      setUser((prev) => (usersEqual(prev, nextUser) ? prev : nextUser));
      if (!opts?.silent) {
        if (!profile) {
          setMessage(`No profile row for this user (${authData.user.id}). Create a row in public.profiles, then sync again.`);
        } else {
          setMessage(`Profile synced. Role: ${nextUser.role}.`);
        }
      }
    } catch (e: any) {
      setMessage(getReadableSupabaseError(e));
    } finally {
      setSyncing(false);
    }
  }, [setUser]);

  useEffect(() => {
    void syncProfileFromServer({ silent: true });
    // Run once when settings opens — do not depend on syncProfileFromServer (avoids setUser loops).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!user) return;
    setFirstName(user.firstName);
    setLastName(user.lastName);
    setLocation(user.location);
    setContact(user.contact);
    setSex(user.sex);
  }, [user?.id, user?.firstName, user?.lastName, user?.location, user?.contact, user?.sex, user?.avatarUrl]);

  const handleLogout = async () => {
    try {
      if (isSupabaseConfigured()) await supabaseSignOut();
    } catch {
      // still clear local session
    }
    setUser(null);
    setActiveScreen('auth');
  };

  const displayName =
    [firstName, lastName].filter(Boolean).join(' ') || user?.email?.split('@')[0] || 'User';

  const applyUserPatch = (patch: Partial<UserProfile>) => {
    if (!user) return;
    setUser({ ...user, ...patch });
  };

  const saveProfile = async () => {
    if (!user) return;
    setMessage(null);
    setSaving(true);
    try {
      if (!isSupabaseConfigured()) throw new Error('Supabase is not configured.');
      await updateUserProfile(user.id, {
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        sex,
        location: location.trim(),
        contact: contact.trim(),
      });
      applyUserPatch({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        sex,
        location: location.trim(),
        contact: contact.trim(),
      });
      setMessage('Profile saved.');
    } catch (e: any) {
      setMessage(getReadableSupabaseError(e));
    } finally {
      setSaving(false);
    }
  };

  const openAvatarPicker = async () => {
    if (!user) return;
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      fileInputRef.current?.click();
      return;
    }

    setMessage(null);
    const library = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (library.status !== 'granted') {
      setMessage('Photo library permission is required to change your profile picture.');
      return;
    }

    const camera = await ImagePicker.requestCameraPermissionsAsync();
    const pick = await new Promise<'camera' | 'library' | null>((resolve) => {
      Alert.alert('Profile photo', 'Choose a source', [
        { text: 'Camera', onPress: () => resolve('camera') },
        { text: 'Photo library', onPress: () => resolve('library') },
        { text: 'Cancel', style: 'cancel', onPress: () => resolve(null) },
      ]);
    });
    if (!pick) return;

    const result =
      pick === 'camera'
        ? await ImagePicker.launchCameraAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.85,
          })
        : await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.85,
          });

    if (result.canceled || !result.assets[0]?.uri) return;

    setAvatarBusy(true);
    try {
      if (!isSupabaseConfigured()) throw new Error('Supabase is not configured.');
      const url = await uploadProfileAvatarFromUri(user.id, result.assets[0].uri);
      await updateUserProfile(user.id, { avatar_url: url });
      applyUserPatch({ avatarUrl: url });
      setMessage('Profile photo updated.');
    } catch (err: unknown) {
      setMessage(getReadableSupabaseError(err));
    } finally {
      setAvatarBusy(false);
    }
  };

  const onWebAvatarFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !user) return;
    setAvatarBusy(true);
    setMessage(null);
    try {
      if (!isSupabaseConfigured()) throw new Error('Supabase is not configured.');
      const url = await uploadProfileAvatar(user.id, file);
      await updateUserProfile(user.id, { avatar_url: url });
      applyUserPatch({ avatarUrl: url });
      setMessage('Profile photo updated.');
    } catch (err: any) {
      setMessage(getReadableSupabaseError(err));
    } finally {
      setAvatarBusy(false);
    }
  };

  if (!user) {
    return (
      <View style={styles.missingUser}>
        <Text style={styles.missingUserText}>Session not found. Please sign in again.</Text>
      </View>
    );
  }
  const promoteToAdminSql = `update public.profiles set role = 'admin' where id = '${user.id}';`;

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollInner} keyboardShouldPersistTaps="handled">
      {Platform.OS === 'web' && typeof document !== 'undefined'
        ? createElement('input', {
            ref: fileInputRef,
            type: 'file',
            accept: 'image/*',
            style: { display: 'none' },
            onChange: onWebAvatarFile,
          })
        : null}
      <Animated.View style={[styles.inner, { opacity: fadeAnim }]}>
        <Text style={styles.screenTitle}>Account settings</Text>
        <Text style={styles.screenSubtitle}>Manage your profile and security</Text>

        <TouchableOpacity style={styles.avatarWrap} onPress={() => void openAvatarPicker()} activeOpacity={0.85} disabled={avatarBusy}>
          {user?.avatarUrl ? (
            <Image source={{ uri: user.avatarUrl }} style={styles.avatarImg} />
          ) : (
            <View style={styles.avatarCircle}>
              <Text style={styles.avatarInitial}>{(displayName[0] ?? 'U').toUpperCase()}</Text>
            </View>
          )}
          <View style={styles.avatarBadge}>
            <Camera size={14} color="#fff" />
          </View>
        </TouchableOpacity>
        <Text style={styles.hint}>Tap your photo to update it</Text>

        <Text style={styles.name}>{displayName}</Text>
        <Text style={styles.email}>{user?.email ?? ''}</Text>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Edit profile</Text>
          <View style={styles.row2}>
            <Field fill label="First name" icon={<User size={14} color="#9ca3af" />} value={firstName} onChangeText={setFirstName} />
            <Field fill label="Last name" icon={<User size={14} color="#9ca3af" />} value={lastName} onChangeText={setLastName} />
          </View>
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>SEX</Text>
            <View style={styles.sexRow}>
              {(['male', 'female', 'other'] as const).map((s) => (
                <TouchableOpacity
                  key={s}
                  onPress={() => setSex(s)}
                  style={[styles.sexBtn, sex === s && styles.sexBtnActive]}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.sexBtnText, sex === s && styles.sexBtnTextActive]}>
                    {s === 'male' ? 'Male' : s === 'female' ? 'Female' : 'Other'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
          <Field label="Location" value={location} onChangeText={setLocation} />
          <Field label="Contact (phone)" value={contact} onChangeText={setContact} keyboardType="phone-pad" />

          <TouchableOpacity style={[styles.saveBtn, saving && styles.saveBtnDisabled]} onPress={saveProfile} disabled={saving} activeOpacity={0.85}>
            <Text style={styles.saveBtnText}>{saving ? 'Saving…' : 'Save changes'}</Text>
          </TouchableOpacity>
          {!!message && <Text style={styles.msg}>{message}</Text>}
        </View>

        <View style={styles.card}>
          <View style={styles.row}>
            <ShieldCheck size={16} color={COLORS.primary} />
            <Text style={styles.rowLabel}>RLS Encryption</Text>
            <Text style={styles.rowValue}>Enabled</Text>
          </View>
          <View style={[styles.row, styles.rowLast]}>
            <ShieldCheck size={16} color={COLORS.primary} />
            <Text style={styles.rowLabel}>Role</Text>
            <Text style={styles.rowValue}>{user?.role ?? '—'}</Text>
          </View>
          <TouchableOpacity
            style={[styles.syncBtn, syncing && styles.syncBtnDisabled]}
            onPress={() => void syncProfileFromServer({ silent: false })}
            disabled={syncing}
            activeOpacity={0.85}
          >
            <Text style={styles.syncBtnText}>{syncing ? 'Syncing…' : 'Sync from server'}</Text>
          </TouchableOpacity>
          {user?.role === 'patient' ? (
            <Text style={styles.roleHint}>
              To enable admin access, run in Supabase SQL:{' '}
              <Text style={styles.roleHintMono}>{promoteToAdminSql}</Text>
              {' '}then tap Sync or sign out and back in.
            </Text>
          ) : null}
        </View>

        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.8}>
          <LogOut size={16} color="#ef4444" />
          <Text style={styles.logoutText}>Sign out</Text>
        </TouchableOpacity>
      </Animated.View>
    </ScrollView>
  );
}

function Field({
  label,
  value,
  onChangeText,
  icon,
  keyboardType,
  fill,
}: {
  label: string;
  value: string;
  onChangeText: (t: string) => void;
  icon?: React.ReactNode;
  keyboardType?: 'default' | 'phone-pad';
  fill?: boolean;
}) {
  return (
    <View style={[styles.field, fill ? { flex: 1 } : undefined]}>
      <Text style={styles.fieldLabel}>{label.toUpperCase()}</Text>
      <View style={styles.inputRow}>
        {icon}
        <TextInput
          placeholderTextColor="#9ca3af"
          style={styles.input}
          value={value}
          onChangeText={onChangeText}
          keyboardType={keyboardType}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  missingUser: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  missingUserText: { fontSize: 15, color: COLORS.primary, textAlign: 'center' },
  scroll: { flex: 1, backgroundColor: 'transparent' },
  scrollInner: { padding: 24, paddingBottom: 140, alignItems: 'center' },
  inner: { width: '100%', maxWidth: 400, alignItems: 'center' },
  screenTitle: { fontSize: 22, fontWeight: '700', color: COLORS.text, alignSelf: 'flex-start', width: '100%' },
  screenSubtitle: {
    fontSize: 13,
    color: COLORS.textSecondary,
    alignSelf: 'flex-start',
    width: '100%',
    marginBottom: 20,
    marginTop: 4,
  },
  avatarWrap: { marginBottom: 6, position: 'relative' },
  avatarCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: COLORS.accent,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarImg: { width: 88, height: 88, borderRadius: 44, backgroundColor: '#f3f4f6' },
  avatarInitial: { fontSize: 32, fontWeight: '800', color: COLORS.primary },
  avatarBadge: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  hint: { fontSize: 11, color: '#9ca3af', marginBottom: 12 },
  name: { fontSize: 20, fontWeight: '800', color: COLORS.primary },
  email: { fontSize: 13, color: '#9ca3af', marginTop: 2, marginBottom: 20 },
  card: {
    width: '100%',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 12,
    ...SHADOW.soft,
  },
  cardTitle: { fontSize: 14, fontWeight: '800', color: COLORS.primary, marginBottom: 4 },
  row2: { flexDirection: 'row', gap: 10 },
  field: { gap: 6 },
  fieldLabel: { fontSize: 9, fontWeight: '800', color: '#9ca3af', letterSpacing: 1 },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#f9fafb',
    borderRadius: 14,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: 'rgba(0,77,64,0.06)',
  },
  input: { flex: 1, paddingVertical: 12, fontSize: 14, color: COLORS.text },
  sexRow: { flexDirection: 'row', gap: 8 },
  sexBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 12, backgroundColor: '#f3f4f6' },
  sexBtnActive: { backgroundColor: 'rgba(0,77,64,0.08)', borderWidth: 1, borderColor: COLORS.primary },
  sexBtnText: { fontSize: 12, fontWeight: '600', color: '#9ca3af' },
  sexBtnTextActive: { color: COLORS.primary },
  saveBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 4,
  },
  saveBtnDisabled: { opacity: 0.55 },
  saveBtnText: { color: '#fff', fontWeight: '800', fontSize: 14 },
  msg: { fontSize: 12, color: COLORS.primaryLight, textAlign: 'center' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  rowLast: { borderBottomWidth: 0 },
  rowLabel: { flex: 1, fontSize: 13, fontWeight: '600', color: COLORS.text },
  rowValue: { fontSize: 12, fontWeight: '700', color: COLORS.primary },
  syncBtn: {
    marginTop: 10,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(0,77,64,0.08)',
    alignItems: 'center',
  },
  syncBtnDisabled: { opacity: 0.55 },
  syncBtnText: { fontSize: 13, fontWeight: '700', color: COLORS.primary },
  roleHint: { fontSize: 11, color: '#9ca3af', lineHeight: 16, marginTop: 8 },
  roleHintMono: { fontFamily: Platform.OS === 'web' ? 'monospace' : undefined, fontSize: 10 },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.2)',
    backgroundColor: 'rgba(239,68,68,0.05)',
  },
  logoutText: { fontSize: 14, fontWeight: '700', color: '#ef4444' },
});
