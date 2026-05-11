import React, { createElement, useEffect, useRef, useState } from 'react';
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
} from 'react-native';
import { LogOut, ShieldCheck, User, Camera } from 'lucide-react';
import { useApp } from '../AppContext';
import { COLORS } from '../styles';
import { isSupabaseConfigured } from '../lib/supabaseClient';
import { supabaseSignOut, updateUserProfile, uploadProfileAvatar } from '../lib/supabaseAuth';
import type { UserProfile } from '../db';

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

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
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

  const displayName = [firstName, lastName].filter(Boolean).join(' ') || 'User';

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
      setMessage(e?.message ?? 'Could not save profile.');
    } finally {
      setSaving(false);
    }
  };

  const openAvatarPicker = () => {
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      fileInputRef.current?.click();
    } else {
      setMessage('Photo change is supported on the web build (file picker).');
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
      setMessage(err?.message ?? 'Could not upload photo. Ensure the avatars bucket exists (see supabase/schema_daily_tips_and_avatar.sql).');
    } finally {
      setAvatarBusy(false);
    }
  };

  if (!user) {
    return (
      <View style={styles.missingUser}>
        <Text style={styles.missingUserText}>Session introuvable. Reconnectez-vous.</Text>
      </View>
    );
  }

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
        <TouchableOpacity style={styles.avatarWrap} onPress={openAvatarPicker} activeOpacity={0.85} disabled={avatarBusy}>
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
        <Text style={styles.hint}>Tap to change photo</Text>

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
    borderRadius: 24,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(0,77,64,0.06)',
    gap: 12,
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
