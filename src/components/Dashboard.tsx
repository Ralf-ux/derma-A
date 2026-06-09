import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, Animated, Easing, Image,
} from 'react-native';
import {
  Camera, Activity, ShieldPlus, ChevronRight,
  Wifi, WifiOff, Sparkles, Heart,
} from 'lucide-react-native';
import { useApp } from '../AppContext';
import { COLORS, RADIUS, SHADOW } from '../styles';
import { usePatientScans } from '../hooks/usePatientScans';
import { DashboardSkeleton } from './Skeleton';
import { isSupabaseConfigured } from '../lib/supabaseClient';
import { fetchDailyTipsBroadcast } from '../lib/supabaseDailyTips';

const appIconForAll = require('../../asserts/appicon for all.png');

type DashboardProps = { onTipsPublished?: () => void };

export default function Dashboard(_props: DashboardProps) {
  const { user, setActiveScreen, isOnline } = useApp();
  const { scans: allScans, isLoading: scansLoading } = usePatientScans(user?.id);
  const scans = allScans?.slice(0, 1);
  const totalScans = allScans?.length ?? 0;
  const [dailyTips, setDailyTips] = useState<
    | undefined
    | { t1?: { title: string; body: string }; t2?: { title: string; body: string } }
  >(undefined);

  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(28)).current;
  const heroScale = useRef(new Animated.Value(0.96)).current;

  useEffect(() => {
    if (!scansLoading) {
      Animated.parallel([
        Animated.timing(fadeAnim,  { toValue: 1, duration: 500, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: 0, duration: 500, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        Animated.spring(heroScale, { toValue: 1, friction: 7, tension: 60, useNativeDriver: true }),
      ]).start();
    }
  }, [scansLoading]);

  useEffect(() => {
    let cancelled = false;
    if (!isSupabaseConfigured()) { setDailyTips({}); return; }
    fetchDailyTipsBroadcast()
      .then((row) => {
        if (cancelled) return;
        if (!row) { setDailyTips({}); return; }
        const t1 = (row.tip1_title ?? '').trim() || (row.tip1_body ?? '').trim()
          ? { title: (row.tip1_title ?? '').trim() || 'Daily tip', body: (row.tip1_body ?? '').trim() }
          : undefined;
        const t2 = (row.tip2_title ?? '').trim() || (row.tip2_body ?? '').trim()
          ? { title: (row.tip2_title ?? '').trim() || 'Daily tip', body: (row.tip2_body ?? '').trim() }
          : undefined;
        setDailyTips({ t1, t2 });
      })
      .catch(() => { if (!cancelled) setDailyTips({}); });
    return () => { cancelled = true; };
  }, []);

  if (scansLoading) {
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <DashboardSkeleton />
      </ScrollView>
    );
  }

  const lastScan    = scans?.[0];
  const healthIndex = lastScan
    ? lastScan.severity === 'low' ? 92 : lastScan.severity === 'medium' ? 74 : 55
    : null;
  const lastScanLabel = lastScan ? formatRelative(lastScan.timestamp) : 'No scans yet';

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>

        {/* ── Header ─────────────────────────────────────────────────────── */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.greeting}>Good day 👋</Text>
            <Text style={styles.userName} numberOfLines={1}>
              {user?.firstName?.trim() || user?.email?.split('@')[0] || 'User'}
            </Text>
          </View>
          <TouchableOpacity onPress={() => setActiveScreen('settings')} activeOpacity={0.8}>
            <View style={styles.avatarRing}>
              {user?.avatarUrl ? (
                <Image source={{ uri: user.avatarUrl }} style={styles.avatarImage} />
              ) : (
                <Text style={styles.avatarInitial}>
                  {String(user?.firstName?.trim() || user?.email?.[0] || 'U').charAt(0).toUpperCase()}
                </Text>
              )}
            </View>
          </TouchableOpacity>
        </View>

        {/* ── Status pill ─────────────────────────────────────────────────── */}
        <View style={[styles.statusPill, isOnline ? styles.onlinePill : styles.offlinePill]}>
          {isOnline
            ? <Wifi size={11} color={COLORS.primary} />
            : <WifiOff size={11} color="#9a3412" />}
          <Text style={[styles.statusText, isOnline ? styles.onlineText : styles.offlineText]}>
            {isOnline ? 'Connected · Cloud synced' : 'Offline mode · Local only'}
          </Text>
        </View>

        {/* ── Hero CTA ────────────────────────────────────────────────────── */}
        <Animated.View style={{ transform: [{ scale: heroScale }] }}>
          <TouchableOpacity
            activeOpacity={0.88}
            onPress={() => setActiveScreen('scan')}
            style={styles.hero}
          >
            {/* Background decoration */}
            <View style={styles.heroBgCircle1} />
            <View style={styles.heroBgCircle2} />

            <View style={styles.heroRow}>
              <View style={styles.heroLeft}>
                <View style={styles.heroIconBadge}>
                  <Image source={appIconForAll} style={styles.heroIconImg} resizeMode="contain" />
                </View>
                <Text style={styles.heroEyebrow}>AI DERMATOLOGY</Text>
                <Text style={styles.heroTitle}>Start a New{'\n'}Skin Analysis</Text>
                <Text style={styles.heroDesc}>
                  Upload or snap a photo for instant AI-powered diagnosis.
                </Text>
                <View style={styles.heroBtn}>
                  <Text style={styles.heroBtnText}>Scan Now</Text>
                  <ChevronRight size={14} color={COLORS.primary} />
                </View>
              </View>
              <View style={styles.heroRight}>
                <Camera size={72} color="rgba(255,255,255,0.12)" />
              </View>
            </View>
          </TouchableOpacity>
        </Animated.View>

        {/* ── Stats ───────────────────────────────────────────────────────── */}
        <View style={styles.statsRow}>
          <StatCard
            icon={<Heart size={18} color={COLORS.primary} />}
            label="HEALTH INDEX"
            value={healthIndex !== null ? `${healthIndex}` : '—'}
            sub={healthIndex !== null ? '/100' : ''}
            color={healthIndex !== null
              ? healthIndex >= 80 ? COLORS.low : healthIndex >= 60 ? COLORS.medium : COLORS.high
              : COLORS.primary}
            delay={80}
          />
          <StatCard
            icon={<Activity size={18} color={COLORS.primary} />}
            label="TOTAL SCANS"
            value={`${totalScans}`}
            sub="scans"
            color={COLORS.primary}
            delay={180}
          />
        </View>

        {/* ── Last scan preview ───────────────────────────────────────────── */}
        {lastScan && (
          <TouchableOpacity
            style={styles.lastScanCard}
            onPress={() => setActiveScreen('history')}
            activeOpacity={0.82}
          >
            <View style={[styles.severityStripe, { backgroundColor: severityColor(lastScan.severity) }]} />
            <View style={styles.lastScanBody}>
              <View style={styles.lastScanTop}>
                <Text style={styles.lastScanEye}>LAST SCAN</Text>
                <View style={[styles.severityPill, { backgroundColor: severityBg(lastScan.severity) }]}>
                  <Text style={[styles.severityPillText, { color: severityColor(lastScan.severity) }]}>
                    {lastScan.severity.toUpperCase()}
                  </Text>
                </View>
              </View>
              <Text style={styles.lastScanType} numberOfLines={1}>{lastScan.type}</Text>
              <Text style={styles.lastScanDate}>{lastScanLabel} · {lastScan.confidence.toFixed(1)}% confidence</Text>
            </View>
            <ChevronRight size={16} color={COLORS.textMuted} />
          </TouchableOpacity>
        )}

        {/* ── Daily tips ──────────────────────────────────────────────────── */}
        {dailyTips !== undefined && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Sparkles size={15} color={COLORS.primary} />
              <Text style={styles.sectionTitle}>Daily Care Tips</Text>
            </View>
            {dailyTips.t1 || dailyTips.t2 ? (
              <>
                {dailyTips.t1 && (
                  <TipItem
                    icon={<ShieldPlus size={17} color={COLORS.primary} />}
                    title={dailyTips.t1.title}
                    desc={dailyTips.t1.body}
                    delay={100}
                  />
                )}
                {dailyTips.t2 && (
                  <TipItem
                    icon={<Heart size={17} color={COLORS.primary} />}
                    title={dailyTips.t2.title}
                    desc={dailyTips.t2.body}
                    delay={200}
                  />
                )}
              </>
            ) : (
              <View style={styles.emptyTips}>
                <Text style={styles.noTipsText}>
                  No tips published yet. Your care team can add them from the admin dashboard.
                </Text>
              </View>
            )}
          </View>
        )}

      </Animated.View>
    </ScrollView>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function StatCard({ icon, label, value, sub, color, delay }: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub: string;
  color: string;
  delay: number;
}) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(anim, {
      toValue: 1, duration: 420, delay,
      easing: Easing.out(Easing.cubic), useNativeDriver: true,
    }).start();
  }, []);

  return (
    <Animated.View style={[
      styles.statCard,
      { opacity: anim, transform: [{ translateY: anim.interpolate({ inputRange: [0,1], outputRange: [18,0] }) }] },
    ]}>
      <View style={[styles.statIconWrap, { backgroundColor: `${color}18` }]}>{icon}</View>
      <Text style={styles.statLabel}>{label}</Text>
      <View style={styles.statValueRow}>
        <Text style={[styles.statValue, { color }]}>{value}</Text>
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
      toValue: 1, duration: 400, delay,
      easing: Easing.out(Easing.cubic), useNativeDriver: true,
    }).start();
  }, []);

  return (
    <Animated.View style={{ opacity: anim, transform: [{ translateX: anim.interpolate({ inputRange: [0,1], outputRange: [-14,0] }) }] }}>
      <TouchableOpacity style={styles.tipCard} activeOpacity={0.78}>
        <View style={styles.tipIconWrap}>{icon}</View>
        <View style={styles.tipContent}>
          <Text style={styles.tipTitle}>{title}</Text>
          <Text style={styles.tipDesc} numberOfLines={2}>{desc}</Text>
        </View>
        <ChevronRight size={13} color={COLORS.textMuted} />
      </TouchableOpacity>
    </Animated.View>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatRelative(date: Date | string): string {
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function severityColor(s: 'low' | 'medium' | 'high') {
  return s === 'low' ? COLORS.low : s === 'medium' ? COLORS.medium : COLORS.high;
}
function severityBg(s: 'low' | 'medium' | 'high') {
  return s === 'low' ? COLORS.lowBg : s === 'medium' ? COLORS.mediumBg : COLORS.highBg;
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'transparent' },
  content:   { padding: 20, paddingBottom: 130, maxWidth: 500, alignSelf: 'center', width: '100%' },

  // Header
  header:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  headerLeft:   { flex: 1, marginRight: 12 },
  greeting:     { fontSize: 13, fontWeight: '600', color: COLORS.textSecondary },
  userName:     { fontSize: 24, fontWeight: '800', color: COLORS.text, marginTop: 2, letterSpacing: -0.5 },
  avatarRing:   {
    width: 50, height: 50, borderRadius: 25,
    backgroundColor: COLORS.accent,
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 2, borderColor: COLORS.primary,
    overflow: 'hidden',
  },
  avatarImage:   { width: 50, height: 50, borderRadius: 25 },
  avatarInitial: { fontSize: 20, fontWeight: '800', color: COLORS.primary },

  // Status
  statusPill:  {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    alignSelf: 'flex-start',
    paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: RADIUS.pill, marginBottom: 20, borderWidth: 1,
  },
  onlinePill:  { backgroundColor: 'rgba(168,240,216,0.2)', borderColor: 'rgba(168,240,216,0.5)' },
  offlinePill: { backgroundColor: '#fff7ed', borderColor: '#ffedd5' },
  statusText:  { fontSize: 10, fontWeight: '700', letterSpacing: 0.3 },
  onlineText:  { color: COLORS.primary },
  offlineText: { color: '#9a3412' },

  // Hero
  hero: {
    borderRadius: RADIUS.xxl,
    backgroundColor: COLORS.primary,
    padding: 24,
    marginBottom: 18,
    overflow: 'hidden',
    ...SHADOW.strong,
  },
  heroBgCircle1: {
    position: 'absolute', width: 200, height: 200, borderRadius: 100,
    backgroundColor: 'rgba(255,255,255,0.04)',
    top: -60, right: -40,
  },
  heroBgCircle2: {
    position: 'absolute', width: 140, height: 140, borderRadius: 70,
    backgroundColor: 'rgba(255,255,255,0.04)',
    bottom: -50, right: 40,
  },
  heroRow:      { flexDirection: 'row', alignItems: 'flex-end' },
  heroLeft:     { flex: 1 },
  heroRight:    { opacity: 0.5 },
  heroIconBadge:{
    width: 48, height: 48, borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 14,
  },
  heroIconImg:  { width: 32, height: 32, borderRadius: 8 },
  heroEyebrow:  { fontSize: 9, fontWeight: '800', color: 'rgba(168,240,216,0.9)', letterSpacing: 1.8, marginBottom: 6 },
  heroTitle:    { fontSize: 24, fontWeight: '900', color: '#fff', lineHeight: 30, marginBottom: 8 },
  heroDesc:     { fontSize: 12, color: 'rgba(255,255,255,0.6)', lineHeight: 18, maxWidth: 200, marginBottom: 18 },
  heroBtn:      {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#fff',
    borderRadius: RADIUS.pill,
    paddingHorizontal: 16, paddingVertical: 9,
    alignSelf: 'flex-start',
  },
  heroBtnText:  { fontSize: 12, fontWeight: '800', color: COLORS.primary },

  // Stats
  statsRow:     { flexDirection: 'row', gap: 12, marginBottom: 16 },
  statCard:     {
    flex: 1, backgroundColor: COLORS.surface,
    padding: 16, borderRadius: RADIUS.xl,
    borderWidth: 1, borderColor: COLORS.borderLight,
    ...SHADOW.soft,
  },
  statIconWrap: {
    width: 38, height: 38, borderRadius: 12,
    justifyContent: 'center', alignItems: 'center', marginBottom: 12,
  },
  statLabel:    { fontSize: 8, fontWeight: '800', color: COLORS.textMuted, letterSpacing: 1.1, marginBottom: 4 },
  statValueRow: { flexDirection: 'row', alignItems: 'baseline', gap: 3 },
  statValue:    { fontSize: 24, fontWeight: '900' },
  statSub:      { fontSize: 11, fontWeight: '600', color: COLORS.textSecondary },

  // Last scan
  lastScanCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    borderWidth: 1, borderColor: COLORS.borderLight,
    marginBottom: 24, overflow: 'hidden',
    ...SHADOW.soft,
  },
  severityStripe: { width: 4, alignSelf: 'stretch' },
  lastScanBody:   { flex: 1, padding: 16, gap: 3 },
  lastScanTop:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  lastScanEye:    { fontSize: 8, fontWeight: '800', color: COLORS.textMuted, letterSpacing: 1.1 },
  severityPill:   { paddingHorizontal: 8, paddingVertical: 3, borderRadius: RADIUS.pill },
  severityPillText:{ fontSize: 8, fontWeight: '800', letterSpacing: 0.6 },
  lastScanType:   { fontSize: 15, fontWeight: '700', color: COLORS.primary },
  lastScanDate:   { fontSize: 11, color: COLORS.textMuted },

  // Tips
  section:       { gap: 10 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  sectionTitle:  { fontSize: 16, fontWeight: '800', color: COLORS.primary },
  emptyTips:     {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },
  noTipsText:    { fontSize: 13, color: COLORS.textMuted, lineHeight: 20 },
  tipCard:       {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.surface,
    padding: 14, borderRadius: RADIUS.lg,
    borderWidth: 1, borderColor: COLORS.borderLight,
    ...SHADOW.soft,
  },
  tipIconWrap:   {
    width: 42, height: 42, borderRadius: 13,
    backgroundColor: COLORS.accentMuted,
    justifyContent: 'center', alignItems: 'center', marginRight: 12,
  },
  tipContent:    { flex: 1 },
  tipTitle:      { fontSize: 13, fontWeight: '700', color: COLORS.primary },
  tipDesc:       { fontSize: 11, color: COLORS.textMuted, marginTop: 2, lineHeight: 16 },
});
