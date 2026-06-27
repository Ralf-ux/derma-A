import React, { useEffect, useRef } from 'react';
import { Animated, Image, StyleSheet, View, ViewStyle } from 'react-native';
import { COLORS } from '../styles';
import logoImg from '../../asserts/appicon-for-all.png';

interface SkeletonProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: ViewStyle;
}

export function Skeleton({ width = '100%', height = 16, borderRadius = 10, style }: SkeletonProps) {
  const shimmer = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(shimmer, { toValue: 1, duration: 800, useNativeDriver: true }),
        Animated.timing(shimmer, { toValue: 0, duration: 800, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  const opacity = shimmer.interpolate({ inputRange: [0, 1], outputRange: [0.35, 0.75] });

  return (
    <Animated.View style={[sk.base, { width: width as any, height, borderRadius, opacity }, style]} />
  );
}

export function DashboardSkeleton() {
  return (
    <View style={sk.page}>
      <View style={sk.row}>
        <View style={{ gap: 8, flex: 1 }}>
          <Skeleton width={70} height={13} borderRadius={7} />
          <Skeleton width={150} height={24} borderRadius={10} />
        </View>
        <Skeleton width={48} height={48} borderRadius={24} />
      </View>
      <Skeleton width={170} height={36} borderRadius={99} style={{ marginBottom: 24 }} />
      <Skeleton width="100%" height={168} borderRadius={36} style={{ marginBottom: 24 }} />
      <View style={sk.row}>
        <Skeleton width="48%" height={112} borderRadius={28} />
        <Skeleton width="48%" height={112} borderRadius={28} />
      </View>
      <Skeleton width="100%" height={76} borderRadius={22} style={{ marginTop: 20 }} />
      <Skeleton width="100%" height={76} borderRadius={22} style={{ marginTop: 12 }} />
    </View>
  );
}

export function HistorySkeleton() {
  return (
    <View style={sk.page}>
      <Skeleton width={160} height={32} borderRadius={10} style={{ marginBottom: 8 }} />
      <Skeleton width={110} height={14} borderRadius={8} style={{ marginBottom: 20 }} />
      <Skeleton width="100%" height={50} borderRadius={18} style={{ marginBottom: 20 }} />
      {[0, 1, 2, 3, 4].map((i) => (
        <Skeleton key={i} width="100%" height={90} borderRadius={24} style={{ marginBottom: 12 }} />
      ))}
    </View>
  );
}

// Full-screen centered spinner used for auth/boot
export function FullScreenLoader({ label }: { label?: string }) {
  const spin = useRef(new Animated.Value(0)).current;
  const fade = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(0.9)).current;

  useEffect(() => {
    Animated.timing(fade, { toValue: 1, duration: 400, useNativeDriver: true }).start();
    Animated.loop(
      Animated.timing(spin, { toValue: 1, duration: 1100, useNativeDriver: true })
    ).start();
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.05, duration: 700, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0.9, duration: 700, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  const rotate = spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

  return (
    <Animated.View style={[sk.fullScreen, { opacity: fade }]}>
      <View style={sk.spinnerWrap}>
        {/* Spinning ring behind the logo */}
        <Animated.View style={[sk.spinnerRing, { transform: [{ rotate }] }]} />
        <Animated.Image
          source={typeof logoImg === 'string' ? { uri: logoImg } : logoImg}
          style={[sk.loaderLogo, { transform: [{ scale: pulse }] }]}
          resizeMode="contain"
        />
      </View>
      {label && <Animated.Text style={[sk.loaderLabel, { opacity: fade }]}>{label}</Animated.Text>}
    </Animated.View>
  );
}

const sk = StyleSheet.create({
  base: { backgroundColor: '#e2e8e6' },
  page: { padding: 24, maxWidth: 500, alignSelf: 'center', width: '100%' },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  fullScreen: {
    flex: 1,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 20,
    minHeight: '100vh' as any,
  },
  spinnerWrap: {
    width: 216,
    height: 216,
    justifyContent: 'center',
    alignItems: 'center',
  },
  spinnerRing: {
    position: 'absolute',
    width: 216,
    height: 216,
    borderRadius: 108,
    borderWidth: 4,
    borderColor: COLORS.accent,
    borderTopColor: COLORS.primary,
  },
  loaderLogo: {
    width: 120,
    height: 120,
    borderRadius: 28,
  },
  loaderLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#9ca3af',
    letterSpacing: 0.3,
  },
});
