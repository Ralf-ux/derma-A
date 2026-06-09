import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Animated, Easing, TextInput, Modal, Platform, Linking,
} from 'react-native';
import { Users, Activity, AlertTriangle, ShieldAlert, MapPin, X, Phone, Mail, User } from 'lucide-react-native';
import { COLORS } from '../styles';
import { fetchAdminStats } from '../lib/supabaseScans';
import { fetchDailyTipsBroadcast, saveDailyTipsBroadcast } from '../lib/supabaseDailyTips';

interface Profile {
  id: string;
  first_name: string;
  last_name: string;
  sex: string;
  location: string;
  contact: string;
}

interface Stats {
  totalScans: number;
  totalPatients: number;
  infected: number;
  severelyInfected: number;
  zoneMap: Record<string, number>;
  sexMap: Record<string, number>;
  profiles: Profile[];
}

type AdminScreenProps = { onTipsSaved?: () => void };

export default function AdminScreen({ onTipsSaved }: AdminScreenProps) {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPatient, setSelectedPatient] = useState<Profile | null>(null);
  const [search, setSearch] = useState('');
  const [tip1Title, setTip1Title] = useState('');
  const [tip1Body, setTip1Body] = useState('');
  const [tip2Title, setTip2Title] = useState('');
  const [tip2Body, setTip2Body] = useState('');
  const [tipsSaving, setTipsSaving] = useState(false);
  const [tipsMsg, setTipsMsg] = useState<string | null>(null);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(24)).current;

  const playEnterAnimation = () => {
    fadeAnim.setValue(0);
    slideAnim.setValue(24);
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 500, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
    ]).start();
  };

  useEffect(() => {
    Promise.all([fetchAdminStats(), fetchDailyTipsBroadcast().catch(() => null)])
      .then(([s, tips]) => {
        setStats(s);
        if (tips) {
          setTip1Title(tips.tip1_title ?? '');
          setTip1Body(tips.tip1_body ?? '');
          setTip2Title(tips.tip2_title ?? '');
          setTip2Body(tips.tip2_body ?? '');
        }
        playEnterAnimation();
      })
      .catch((e) => {
        const msg = String(e?.message ?? e ?? 'Failed to load admin data');
        if (msg.toLowerCase().includes('infinite recursion')) {
          setError(
            'RLS policy error on profiles. Re-run supabase/schema_daily_tips_and_avatar.sql in the Supabase SQL Editor.',
          );
        } else {
          setError(msg);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const handleSaveTips = async () => {
    setTipsMsg(null);
    setTipsSaving(true);
    try {
      await saveDailyTipsBroadcast({
        tip1_title: tip1Title.trim(),
        tip1_body: tip1Body.trim(),
        tip2_title: tip2Title.trim(),
        tip2_body: tip2Body.trim(),
      });
      setTipsMsg('Tips published. All patients will see them on their home screen.');
      onTipsSaved?.();
    } catch (e: any) {
      setTipsMsg(e?.message ?? 'Could not save. Check daily_tips_broadcast and RLS policies in Supabase.');
    } finally {
      setTipsSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <Text style={styles.loadingText}>Loading data...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  if (!stats) return null;

  const topZones = Object.entries(stats.zoneMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  const filteredProfiles = stats.profiles.filter(p => {
    const q = search.toLowerCase();
    return (
      (p.first_name ?? '').toLowerCase().includes(q) ||
      (p.last_name ?? '').toLowerCase().includes(q) ||
      (p.location ?? '').toLowerCase().includes(q) ||
      (p.contact ?? '').toLowerCase().includes(q)
    );
  });

  const infectionRate = stats.totalScans > 0
    ? ((stats.infected / stats.totalScans) * 100).toFixed(1)
    : '0';

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>

        {/* Title */}
        <Text style={styles.title}>Admin Dashboard</Text>
        <Text style={styles.subtitle}>Epidemiological overview</Text>

        <View style={styles.tipsCard}>
          <Text style={styles.tipsCardTitle}>Daily tips (all patients)</Text>
          <Text style={styles.tipsHint}>Two messages shown on every patient&apos;s home screen. Saving triggers a notification bell.</Text>
          <Text style={styles.tipsLabel}>Tip 1 — title</Text>
          <TextInput
            placeholder="e.g. Sun protection"
            placeholderTextColor="#9ca3af"
            style={styles.tipsInput}
            value={tip1Title}
            onChangeText={setTip1Title}
          />
          <Text style={styles.tipsLabel}>Tip 1 — message</Text>
          <TextInput
            placeholder="Message body…"
            placeholderTextColor="#9ca3af"
            style={[styles.tipsInput, styles.tipsMultiline]}
            value={tip1Body}
            onChangeText={setTip1Body}
            multiline
          />
          <Text style={styles.tipsLabel}>Tip 2 — title</Text>
          <TextInput
            placeholder="e.g. Hydration"
            placeholderTextColor="#9ca3af"
            style={styles.tipsInput}
            value={tip2Title}
            onChangeText={setTip2Title}
          />
          <Text style={styles.tipsLabel}>Tip 2 — message</Text>
          <TextInput
            placeholder="Message body…"
            placeholderTextColor="#9ca3af"
            style={[styles.tipsInput, styles.tipsMultiline]}
            value={tip2Body}
            onChangeText={setTip2Body}
            multiline
          />
          <TouchableOpacity style={[styles.tipsSaveBtn, tipsSaving && { opacity: 0.6 }]} onPress={handleSaveTips} disabled={tipsSaving} activeOpacity={0.85}>
            <Text style={styles.tipsSaveText}>{tipsSaving ? 'Publishing…' : 'Publish tips'}</Text>
          </TouchableOpacity>
          {!!tipsMsg && <Text style={styles.tipsMsg}>{tipsMsg}</Text>}
        </View>

        {/* KPI Cards */}
        <View style={styles.kpiGrid}>
          <KpiCard icon={<Users size={20} color={COLORS.primary} />} label="Patients" value={stats.totalPatients} color={COLORS.primary} delay={0} />
          <KpiCard icon={<Activity size={20} color="#6366f1" />} label="Scans" value={stats.totalScans} color="#6366f1" delay={80} />
          <KpiCard icon={<AlertTriangle size={20} color="#f59e0b" />} label="Infected" value={stats.infected} color="#f59e0b" delay={160} />
          <KpiCard icon={<ShieldAlert size={20} color="#ef4444" />} label="Severe" value={stats.severelyInfected} color="#ef4444" delay={240} />
        </View>

        {/* Infection rate */}
        <View style={styles.rateCard}>
          <Text style={styles.rateLabel}>INFECTION RATE</Text>
          <View style={styles.rateBarWrap}>
            <View style={[styles.rateBar, { width: `${Math.min(100, parseFloat(infectionRate))}%` as any }]} />
          </View>
          <Text style={styles.rateValue}>{infectionRate}% of scans show an infection</Text>
        </View>

        {/* Sex breakdown */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Sex breakdown</Text>
          <View style={styles.sexRow}>
            {[
              { key: 'male', label: 'Male', color: '#3b82f6' },
              { key: 'female', label: 'Female', color: '#ec4899' },
              { key: 'other', label: 'Other', color: '#8b5cf6' },
            ].map(({ key, label, color }) => {
              const count = stats.sexMap[key] ?? 0;
              const total = Object.values(stats.sexMap).reduce((a, b) => a + b, 0);
              const pct = total > 0 ? ((count / total) * 100).toFixed(0) : '0';
              return (
                <View key={key} style={styles.sexCard}>
                  <View style={[styles.sexDot, { backgroundColor: color }]} />
                  <Text style={styles.sexCount}>{count}</Text>
                  <Text style={styles.sexLabel}>{label}</Text>
                  <Text style={[styles.sexPct, { color }]}>{pct}%</Text>
                </View>
              );
            })}
          </View>
        </View>

        {/* Top zones */}
        {topZones.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Most affected zones</Text>
            {topZones.map(([zone, count], i) => {
              const maxCount = topZones[0][1];
              const pct = maxCount > 0 ? (count / maxCount) * 100 : 0;
              return (
                <View key={zone} style={styles.zoneRow}>
                  <View style={styles.zoneRank}>
                    <Text style={styles.zoneRankText}>{i + 1}</Text>
                  </View>
                  <View style={styles.zoneInfo}>
                    <View style={styles.zoneNameRow}>
                      <MapPin size={11} color={COLORS.primary} />
                      <Text style={styles.zoneName}>{zone}</Text>
                    </View>
                    <View style={styles.zoneBarWrap}>
                      <View style={[styles.zoneBar, { width: `${pct}%` as any }]} />
                    </View>
                  </View>
                  <Text style={styles.zoneCount}>{count}</Text>
                </View>
              );
            })}
          </View>
        )}

        {/* Patient list */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Patient list</Text>
          <View style={styles.searchBox}>
            <TextInput
              placeholder="Search a patient..."
              placeholderTextColor="#9ca3af"
              style={styles.searchInput}
              value={search}
              onChangeText={setSearch}
            />
          </View>
          {filteredProfiles.length === 0 ? (
            <Text style={styles.noPatients}>No patients found.</Text>
          ) : (
            filteredProfiles.map(p => (
              <TouchableOpacity
                key={p.id}
                style={styles.patientRow}
                onPress={() => setSelectedPatient(p)}
                activeOpacity={0.75}
              >
                <View style={styles.patientAvatar}>
                  <Text style={styles.patientAvatarText}>
                    {(p.first_name?.[0] ?? '?').toUpperCase()}
                  </Text>
                </View>
                <View style={styles.patientInfo}>
                  <Text style={styles.patientName}>{p.first_name} {p.last_name}</Text>
                  <Text style={styles.patientMeta}>{p.location ?? '—'} · {p.sex === 'male' ? 'M' : p.sex === 'female' ? 'F' : '?'}</Text>
                </View>
                <View style={styles.contactBtn}>
                  <Phone size={13} color={COLORS.primary} />
                </View>
              </TouchableOpacity>
            ))
          )}
        </View>
      </Animated.View>

      {/* Patient detail modal */}
      <Modal visible={!!selectedPatient} transparent animationType="fade" onRequestClose={() => setSelectedPatient(null)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Patient profile</Text>
              <TouchableOpacity onPress={() => setSelectedPatient(null)}>
                <X size={20} color="#9ca3af" />
              </TouchableOpacity>
            </View>

            {selectedPatient && (
              <>
                <View style={styles.modalAvatar}>
                  <Text style={styles.modalAvatarText}>
                    {(selectedPatient.first_name?.[0] ?? '?').toUpperCase()}
                  </Text>
                </View>
                <Text style={styles.modalName}>{selectedPatient.first_name} {selectedPatient.last_name}</Text>

                <View style={styles.modalRows}>
                  <ModalRow icon={<User size={14} color={COLORS.primary} />} label="Sex" value={selectedPatient.sex === 'male' ? 'Male' : selectedPatient.sex === 'female' ? 'Female' : 'Other'} />
                  <ModalRow icon={<MapPin size={14} color={COLORS.primary} />} label="Location" value={selectedPatient.location ?? '—'} />
                  <ModalRow icon={<Phone size={14} color={COLORS.primary} />} label="Contact" value={selectedPatient.contact ?? '—'} />
                </View>

                {selectedPatient.contact && (
                  <TouchableOpacity
                    style={styles.callBtn}
                    onPress={() => {
                      const url = `tel:${selectedPatient.contact}`;
                      if (Platform.OS === 'web' && typeof window !== 'undefined') window.open(url);
                      else void Linking.openURL(url);
                    }}
                    activeOpacity={0.85}
                  >
                    <Phone size={15} color="#fff" />
                    <Text style={styles.callBtnText}>Call patient</Text>
                  </TouchableOpacity>
                )}
              </>
            )}
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

function KpiCard({ icon, label, value, color, delay }: {
  icon: React.ReactNode; label: string; value: number; color: string; delay: number;
}) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(anim, { toValue: 1, duration: 400, delay, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
  }, []);
  return (
    <Animated.View style={[styles.kpiCard, { opacity: anim, transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) }] }]}>
      <View style={[styles.kpiIcon, { backgroundColor: `${color}18` }]}>{icon}</View>
      <Text style={[styles.kpiValue, { color }]}>{value}</Text>
      <Text style={styles.kpiLabel}>{label}</Text>
    </Animated.View>
  );
}

function ModalRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <View style={styles.modalRow}>
      {icon}
      <Text style={styles.modalRowLabel}>{label}</Text>
      <Text style={styles.modalRowValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'transparent' },
  content: { padding: 24, paddingBottom: 130, maxWidth: 500, alignSelf: 'center', width: '100%' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { color: '#9ca3af', fontSize: 14 },
  errorText: { color: '#ef4444', fontSize: 14 },
  title: { fontSize: 28, fontWeight: '800', color: COLORS.primary },
  subtitle: { fontSize: 13, color: '#9ca3af', marginTop: 2, marginBottom: 24 },
  tipsCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 24,
    padding: 18,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(0,77,64,0.08)',
    gap: 8,
  },
  tipsCardTitle: { fontSize: 16, fontWeight: '800', color: COLORS.primary },
  tipsHint: { fontSize: 12, color: '#9ca3af', marginBottom: 8, lineHeight: 17 },
  tipsLabel: { fontSize: 10, fontWeight: '800', color: '#9ca3af', letterSpacing: 0.6, marginTop: 4 },
  tipsInput: {
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: COLORS.text,
    borderWidth: 1,
    borderColor: 'rgba(0,77,64,0.06)',
  },
  tipsMultiline: { minHeight: 72, textAlignVertical: 'top' as any },
  tipsSaveBtn: {
    backgroundColor: '#6366f1',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 10,
  },
  tipsSaveText: { color: '#fff', fontWeight: '800', fontSize: 14 },
  tipsMsg: { fontSize: 12, color: COLORS.primary, marginTop: 6, lineHeight: 17 },
  kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 20 },
  kpiCard: {
    flex: 1,
    minWidth: '44%' as any,
    backgroundColor: COLORS.surface,
    borderRadius: 24,
    padding: 18,
    borderWidth: 1,
    borderColor: 'rgba(0,77,64,0.06)',
    alignItems: 'flex-start',
    gap: 6,
  },
  kpiIcon: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  kpiValue: { fontSize: 28, fontWeight: '800' },
  kpiLabel: { fontSize: 11, fontWeight: '700', color: '#9ca3af', letterSpacing: 0.5 },
  rateCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    padding: 18,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(0,77,64,0.06)',
    gap: 8,
  },
  rateLabel: { fontSize: 9, fontWeight: '800', color: '#9ca3af', letterSpacing: 1 },
  rateBarWrap: { height: 8, backgroundColor: '#f3f4f6', borderRadius: 99, overflow: 'hidden' },
  rateBar: { height: 8, backgroundColor: '#f59e0b', borderRadius: 99 },
  rateValue: { fontSize: 12, color: '#9ca3af', fontWeight: '600' },
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 17, fontWeight: '800', color: COLORS.primary, marginBottom: 12 },
  sexRow: { flexDirection: 'row', gap: 10 },
  sexCard: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: 18,
    padding: 14,
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderColor: 'rgba(0,77,64,0.06)',
  },
  sexDot: { width: 10, height: 10, borderRadius: 5 },
  sexCount: { fontSize: 22, fontWeight: '800', color: COLORS.primary },
  sexLabel: { fontSize: 10, color: '#9ca3af', fontWeight: '600' },
  sexPct: { fontSize: 11, fontWeight: '800' },
  zoneRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10 },
  zoneRank: {
    width: 24, height: 24, borderRadius: 8,
    backgroundColor: 'rgba(0,77,64,0.08)',
    justifyContent: 'center', alignItems: 'center',
  },
  zoneRankText: { fontSize: 11, fontWeight: '800', color: COLORS.primary },
  zoneInfo: { flex: 1, gap: 4 },
  zoneNameRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  zoneName: { fontSize: 13, fontWeight: '700', color: COLORS.primary },
  zoneBarWrap: { height: 5, backgroundColor: '#f3f4f6', borderRadius: 99, overflow: 'hidden' },
  zoneBar: { height: 5, backgroundColor: COLORS.primary, borderRadius: 99 },
  zoneCount: { fontSize: 13, fontWeight: '800', color: COLORS.primary, minWidth: 24, textAlign: 'right' },
  searchBox: {
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(0,77,64,0.06)',
  },
  searchInput: { fontSize: 14, color: COLORS.text },
  noPatients: { fontSize: 13, color: '#9ca3af', textAlign: 'center', paddingVertical: 20 },
  patientRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 18,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(0,77,64,0.06)',
    gap: 12,
  },
  patientAvatar: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: COLORS.accent,
    justifyContent: 'center', alignItems: 'center',
  },
  patientAvatarText: { fontSize: 16, fontWeight: '800', color: COLORS.primary },
  patientInfo: { flex: 1 },
  patientName: { fontSize: 14, fontWeight: '700', color: COLORS.primary },
  patientMeta: { fontSize: 11, color: '#9ca3af', marginTop: 2 },
  contactBtn: {
    width: 34, height: 34, borderRadius: 10,
    backgroundColor: 'rgba(0,77,64,0.08)',
    justifyContent: 'center', alignItems: 'center',
  },
  // Modal
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center', alignItems: 'center', padding: 24,
  },
  modalCard: {
    backgroundColor: COLORS.surface, borderRadius: 28,
    padding: 24, width: '100%', maxWidth: 380, gap: 12,
  },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  modalTitle: { fontSize: 17, fontWeight: '800', color: COLORS.primary },
  modalAvatar: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: COLORS.accent,
    justifyContent: 'center', alignItems: 'center',
    alignSelf: 'center', marginVertical: 8,
  },
  modalAvatarText: { fontSize: 26, fontWeight: '800', color: COLORS.primary },
  modalName: { fontSize: 18, fontWeight: '800', color: COLORS.primary, textAlign: 'center' },
  modalRows: { gap: 10, marginTop: 4 },
  modalRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#f9fafb', borderRadius: 12, padding: 12,
  },
  modalRowLabel: { fontSize: 12, fontWeight: '700', color: '#9ca3af', flex: 1 },
  modalRowValue: { fontSize: 13, fontWeight: '700', color: COLORS.primary },
  callBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, backgroundColor: COLORS.primary, borderRadius: 14,
    paddingVertical: 14, marginTop: 4,
  },
  callBtnText: { color: '#fff', fontWeight: '800', fontSize: 14 },
});
