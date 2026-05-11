import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Easing,
  Image,
} from 'react-native';
import { Camera, Activity, ShieldPlus, ChevronRight, Wifi, WifiOff } from 'lucide-react';
import { useApp } from '../AppContext';
import { COLORS } from '../styles';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { DashboardSkeleton } from './Skeleton';
import { isSupabaseConfigured } from '../lib/supabaseClient';
import { fetchDailyTipsBroadcast } from '../lib/supabaseDailyTips';

export default function Dashboard() {
  const { user, setActiveScreen, isOnline } = useApp();
  const scans = useLiveQuery(() => db.scans.orderBy('timestamp').reverse().limit(1).toArray());
  const totalScans = useLiveQuery(() => db.scans.count());
  const [dailyTips, setDailyTips] = useState<
    | undefined
    | {
        t1?: { title: string; body: string };
        t2?: { title: string; body: string };
      }
  >(undefined);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(24)).current;
  const heroScale = useRef(new Animated.Value(0.97)).current;

  const isLoading = scans === undefined || totalScans === undefined;

  useEffect(() => {
    if (!isLoading) {
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: 0, duration: 500, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        Animated.spring(heroScale, { toValue: 1, friction: 7, tension: 60, useNativeDriver: true }),
      ]).start();
    }
  }, [isLoading]);

  useEffect(() => {
    let cancelled = false;
    if (!isSupabaseConfigured()) {
      setDailyTips({});
      return;
    }
    fetchDailyTipsBroadcast()
      .then((row) => {
        if (cancelled) return;
        if (!row) {
          setDailyTips({});
          return;
        }
        const t1 =
          (row.tip1_title ?? '').trim() || (row.tip1_body ?? '').trim()
            ? { title: (row.tip1_title ?? '').trim() || 'Conseil', body: (row.tip1_body ?? '').trim() }
            : undefined;
        const t2 =
          (row.tip2_title ?? '').trim() || (row.tip2_body ?? '').trim()
            ? { title: (row.tip2_title ?? '').trim() || 'Conseil', body: (row.tip2_body ?? '').trim() }
            : undefined;
        setDailyTips({ t1, t2 });
      })
      .catch(() => {
        if (!cancelled) setDailyTips({});
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (isLoading) {
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <DashboardSkeleton />
      </ScrollView>
    );
  }

  const lastScan = scans?.[0];
  const healthIndex = lastScan
    ? lastScan.severity === 'low' ? 92 : lastScan.severity === 'medium' ? 74 : 55
    : null;

  const lastScanLabel = lastScan
    ? formatRelative(lastScan.timestamp)
    : 'No scans yet';

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Hello,</Text>
            <Text style={styles.userName}>{user?.firstName ?? 'User'}</Text>
          </View>
          <View style={styles.avatarCircle}>
            {user?.avatarUrl ? (
              <Image source={{ uri: user.avatarUrl }} style={styles.avatarImage} />
            ) : (
              <Text style={styles.avatarInitial}>
                {String(user?.firstName?.trim() || user?.email?.[0] || 'U').charAt(0).toUpperCase()}
              </Text>
            )}
          </View>
        </View>

        {/* Status pill */}
        <View style={[styles.statusPill, isOnline ? styles.onlinePill : styles.offlinePill]}>
          {isOnline
            ? <Wifi size={12} color={COLORS.primary} />
            : <WifiOff size={12} color='#9a3412' />}
          <Text style={[styles.statusText, isOnline ? styles.onlineText : styles.offlineText]}>
            {isOnline ? 'Cloud synced' : 'Offline mode'}
          </Text>
        </View>

        {/* Hero CTA */}
        <Animated.View style={{ transform: [{ scale: heroScale }] }}>
          <TouchableOpacity
            activeOpacity={0.88}
            onPress={() => setActiveScreen('scan')}
            style={styles.hero}
          >
            <View style={styles.heroIcon}>
              <Camera size={22} color="#fff" />
            </View>
            <Text style={styles.heroTitle}>New AI Scan</Text>
            <Text style={styles.heroDesc}>
              Analyze your skin in seconds.
            </Text>
            <View style={styles.heroBgDecor}>
              <Camera size={110} color="rgba(255,255,255,0.04)" />
            </View>
            <View style={styles.heroArrow}>
              <ChevronRight size={18} color="rgba(255,255,255,0.5)" />
            </View>
          </TouchableOpacity>
        </Animated.View>

        {/* Stats */}
        <View style={styles.statsRow}>
          <StatCard
            icon={<Activity size={18} color={COLORS.primary} />}
            label="HEALTH INDEX"
            value={healthIndex !== null ? `${healthIndex}` : '—'}
            sub={healthIndex !== null ? '/100' : ''}
            delay={100}
          />
          <StatCard
            icon={<ShieldPlus size={18} color={COLORS.primary} />}
            label="TOTAL SCANS"
            value={`${totalScans ?? 0}`}
            sub="scans"
            delay={200}
          />
        </View>

        {/* Last scan preview */}
        {lastScan && (
          <TouchableOpacity
            style={styles.lastScanCard}
            onPress={() => setActiveScreen('history')}
            activeOpacity={0.8}
          >
            <View style={styles.lastScanLeft}>
              <View style={[styles.severityDot, severityColor(lastScan.severity)]} />
              <View>
                <Text style={styles.lastScanLabel}>LAST SCAN</Text>
                <Text style={styles.lastScanType} numberOfLines={1}>{lastScan.type}</Text>
                <Text style={styles.lastScanDate}>{lastScanLabel}</Text>
              </View>
            </View>
            <ChevronRight size={16} color="#d1d5db" />
          </TouchableOpacity>
        )}

        {/* Conseils du jour — published by admin for all patients */}
        {dailyTips !== undefined ? (
          (dailyTips.t1 || dailyTips.t2) ? (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Conseils du jour</Text>
              {dailyTips.t1 ? (
                <TipItem
                  icon={<ShieldPlus size={18} color={COLORS.primary} />}
                  title={dailyTips.t1.title}
                  desc={dailyTips.t1.body}
                  delay={150}
                />
              ) : null}
              {dailyTips.t2 ? (
                <TipItem
                  icon={<Activity size={18} color={COLORS.primary} />}
                  title={dailyTips.t2.title}
                  desc={dailyTips.t2.body}
                  delay={250}
                />
              ) : null}
            </View>
          ) : (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Conseils du jour</Text>
              <Text style={styles.noTipsText}>
                Aucun conseil publié pour le moment. Votre équipe soignante pourra en ajouter depuis l&apos;espace admin.
              </Text>
            </View>
          )
        ) : null}
      </Animated.View>
    </ScrollView>
  );
}

function StatCard({ icon, label, value, sub, delay }: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub: string;
  delay: number;
}) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(anim, {
      toValue: 1,
      duration: 400,
      delay,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, []);

  return (
    <Animated.View style={[styles.statCard, { opacity: anim, transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) }] }]}>
      <View style={styles.statIcon}>{icon}</View>
      <Text style={styles.statLabel}>{label}</Text>
      <View style={styles.statValueRow}>
        <Text style={styles.statValue}>{value}</Text>
        {sub ? <Text style={styles.statSub}>{sub}</Text> : null}
      </View>
    </Animated.View>
  );
}

function TipItem({ icon, title, desc, delay }: {
  icon: React.ReactNode;
  title: string;
  desc: string;
  delay: number;
}) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(anim, {
      toValue: 1,
      duration: 400,
      delay,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, []);

  return (
    <Animated.View style={{ opacity: anim, transform: [{ translateX: anim.interpolate({ inputRange: [0, 1], outputRange: [-12, 0] }) }] }}>
      <TouchableOpacity style={styles.tipItem} activeOpacity={0.75}>
        <View style={styles.tipIcon}>{icon}</View>
        <View style={styles.tipContent}>
          <Text style={styles.tipTitle}>{title}</Text>
          <Text style={styles.tipDesc}>{desc}</Text>
        </View>
        <ChevronRight size={14} color="#d1d5db" />
      </TouchableOpacity>
    </Animated.View>
  );
}

function formatRelative(date: Date): string {
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function severityColor(s: 'low' | 'medium' | 'high') {
  return s === 'low'
    ? { backgroundColor: '#10b981' }
    : s === 'medium'
    ? { backgroundColor: '#f59e0b' }
    : { backgroundColor: '#ef4444' };
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'transparent' },
  content: { padding: 24, paddingBottom: 120, maxWidth: 500, alignSelf: 'center', width: '100%' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  greeting: { fontSize: 28, fontWeight: '800', color: COLORS.primary },
  userName: { fontSize: 15, color: COLORS.primaryLight, fontWeight: '600', marginTop: -2 },
  avatarCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.accent,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  avatarImage: { width: 48, height: 48, borderRadius: 24 },
  avatarInitial: { fontSize: 20, fontWeight: '800', color: COLORS.primary },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 99,
    marginBottom: 24,
    borderWidth: 1,
  },
  onlinePill: { backgroundColor: 'rgba(175,239,221,0.2)', borderColor: 'rgba(175,239,221,0.4)' },
  offlinePill: { backgroundColor: '#fff7ed', borderColor: '#ffedd5' },
  statusText: { fontSize: 11, fontWeight: '700', letterSpacing: 0.3 },
  onlineText: { color: COLORS.primary },
  offlineText: { color: '#9a3412' },
  hero: {
    backgroundColor: COLORS.primary,
    borderRadius: 36,
    padding: 28,
    marginBottom: 24,
    overflow: 'hidden',
  },
  heroIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  heroTitle: { color: '#fff', fontSize: 22, fontWeight: '800', marginBottom: 6 },
  heroDesc: { color: 'rgba(255,255,255,0.55)', fontSize: 13, lineHeight: 19, maxWidth: 200 },
  heroBgDecor: { position: 'absolute', top: 30, right: -16 },
  heroArrow: { position: 'absolute', bottom: 28, right: 28 },
  statsRow: { flexDirection: 'row', gap: 14, marginBottom: 20 },
  statCard: {
    flex: 1,
    backgroundColor: COLORS.surface,
    padding: 20,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: 'rgba(0,77,64,0.06)',
  },
  statIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(175,239,221,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
  },
  statLabel: { fontSize: 8, fontWeight: '800', color: '#9ca3af', letterSpacing: 1, marginBottom: 4 },
  statValueRow: { flexDirection: 'row', alignItems: 'baseline', gap: 3 },
  statValue: { fontSize: 22, fontWeight: '800', color: COLORS.primary },
  statSub: { fontSize: 11, fontWeight: '600', color: COLORS.accent },
  lastScanCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.surface,
    padding: 18,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(0,77,64,0.06)',
    marginBottom: 28,
  },
  lastScanLeft: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  severityDot: { width: 10, height: 10, borderRadius: 5 },
  lastScanLabel: { fontSize: 8, fontWeight: '800', color: '#9ca3af', letterSpacing: 1, marginBottom: 2 },
  lastScanType: { fontSize: 14, fontWeight: '700', color: COLORS.primary },
  lastScanDate: { fontSize: 11, color: '#9ca3af', marginTop: 2 },
  section: { gap: 10 },
  sectionTitle: { fontSize: 17, fontWeight: '800', color: COLORS.primary, marginBottom: 4 },
  noTipsText: { fontSize: 13, color: '#9ca3af', lineHeight: 20, paddingVertical: 4 },
  tipItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    padding: 16,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(0,77,64,0.05)',
  },
  tipIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: 'rgba(175,239,221,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  tipContent: { flex: 1 },
  tipTitle: { fontSize: 14, fontWeight: '700', color: COLORS.primary },
  tipDesc: { fontSize: 12, color: '#9ca3af', marginTop: 2, lineHeight: 17 },
});
