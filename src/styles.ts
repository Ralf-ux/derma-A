import { StyleSheet, Dimensions, Platform } from 'react-native';

const { width } = Dimensions.get('window');

export const COLORS = {
  // Brand
  primary:        '#0a4d3c',
  primaryLight:   '#0d6b54',
  primaryGrad1:   '#0a4d3c',
  primaryGrad2:   '#0d7a5f',
  secondary:      '#062e24',
  accent:         '#a8f0d8',
  accentMuted:    'rgba(168,240,216,0.28)',
  accentStrong:   '#4fd1a8',

  // Surface
  background:     '#f0f5f3',
  surface:        '#ffffff',
  surfaceElevated:'#fafcfb',
  glass:          'rgba(255,255,255,0.82)',

  // Text
  text:           '#0d1f1b',
  textSecondary:  '#4d6b63',
  textMuted:      '#8fa8a0',

  // Semantic
  success:        '#10b981',
  warning:        '#f59e0b',
  danger:         '#ef4444',
  info:           '#3b82f6',
  error:          '#dc2626',

  // UI
  border:         '#dde9e5',
  borderLight:    'rgba(0,77,64,0.07)',
  bellUnread:     '#ef4444',

  // Severity
  low:            '#10b981',
  lowBg:          'rgba(16,185,129,0.10)',
  medium:         '#f59e0b',
  mediumBg:       'rgba(245,158,11,0.10)',
  high:           '#ef4444',
  highBg:         'rgba(239,68,68,0.10)',
};

export const RADIUS = {
  xs:   6,
  sm:   10,
  md:   16,
  lg:   22,
  xl:   28,
  xxl:  36,
  pill: 999,
};

export const SHADOW = {
  card: Platform.select({
    ios: {
      shadowColor: '#0a4d3c',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.10,
      shadowRadius: 16,
    },
    android: { elevation: 4 },
    default: {
      shadowColor: '#0a4d3c',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.10,
      shadowRadius: 16,
    },
  }) as object,
  soft: Platform.select({
    ios: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.06,
      shadowRadius: 8,
    },
    android: { elevation: 2 },
    default: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.06,
      shadowRadius: 8,
    },
  }) as object,
  strong: Platform.select({
    ios: {
      shadowColor: '#0a4d3c',
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.18,
      shadowRadius: 24,
    },
    android: { elevation: 8 },
    default: {
      shadowColor: '#0a4d3c',
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.18,
      shadowRadius: 24,
    },
  }) as object,
};

export const LAYOUT = {
  maxContentWidth: Math.min(480, width),
  headerLogoWidth:  40,
  headerLogoHeight: 40,
};

export const globalStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOW.card,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.text,
    letterSpacing: -0.3,
  },
  body: {
    fontSize: 14,
    color: COLORS.textSecondary,
    lineHeight: 21,
  },
  button: {
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.md,
    paddingVertical: 14,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  buttonText: {
    color: COLORS.surface,
    fontWeight: '700',
    fontSize: 15,
  },
});
