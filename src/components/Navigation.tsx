import React, { useRef, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  Platform, Animated, Easing, Image,
} from 'react-native';
import { Home, History, Settings, ShieldCheck } from 'lucide-react-native';
import { useApp } from '../AppContext';
import { COLORS, RADIUS, SHADOW } from '../styles';

// Use the branded icon for the Scan tab
const appIconForAll = require('../../asserts/appicon-for-all.png');

export default function Navigation() {
  const { activeScreen, setActiveScreen, user } = useApp();

  if (activeScreen === 'auth' || activeScreen === 'scan') return null;

  const isAdmin = user?.role === 'admin';

  const ITEMS = isAdmin
    ? [
        { id: 'admin',    icon: ShieldCheck, label: 'Dashboard' },
        { id: 'settings', icon: Settings,    label: 'Settings'  },
      ]
    : [
        { id: 'home',     icon: Home,    label: 'Home'    },
        { id: 'scan',     icon: null,    label: 'Scan',  isScanTab: true },
        { id: 'history',  icon: History, label: 'History' },
        { id: 'settings', icon: Settings, label: 'Profile' },
      ];

  return (
    <View style={styles.wrapper}>
      <View style={styles.pill}>
        {ITEMS.map((item) => (
          <NavItem
            key={item.id}
            item={item}
            isActive={activeScreen === item.id}
            onPress={() => setActiveScreen(item.id)}
          />
        ))}
      </View>
    </View>
  );
}

function NavItem({
  item,
  isActive,
  onPress,
}: {
  item: { id: string; label: string; icon: React.ComponentType<any> | null; isScanTab?: boolean };
  isActive: boolean;
  onPress: () => void;
}) {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const activeBgAnim = useRef(new Animated.Value(isActive ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(activeBgAnim, {
      toValue: isActive ? 1 : 0,
      duration: 250,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [isActive]);

  const handlePress = () => {
    Animated.sequence([
      Animated.timing(scaleAnim, { toValue: 0.85, duration: 80, useNativeDriver: true }),
      Animated.spring(scaleAnim, { toValue: 1, friction: 4, tension: 140, useNativeDriver: true }),
    ]).start();
    onPress();
  };

  const Icon = item.icon;

  // Scan tab — prominent center button with the app icon
  if (item.isScanTab) {
    return (
      <TouchableOpacity onPress={handlePress} activeOpacity={1} style={styles.scanWrap}>
        <Animated.View style={[styles.scanBtn, isActive && styles.scanBtnActive, { transform: [{ scale: scaleAnim }] }]}>
          <Image source={appIconForAll} style={styles.scanIcon} resizeMode="contain" />
        </Animated.View>
        <Text style={[styles.scanLabel, isActive && styles.scanLabelActive]}>Scan</Text>
      </TouchableOpacity>
    );
  }

  const isAdminTab = item.id === 'admin';
  const activeColor = isAdminTab ? '#6366f1' : COLORS.primary;

  return (
    <TouchableOpacity onPress={handlePress} activeOpacity={1} style={styles.itemWrap}>
      <Animated.View style={[styles.itemOuter, { transform: [{ scale: scaleAnim }] }]}>
        <Animated.View
          style={[
            styles.itemBg,
            isAdminTab ? styles.itemBgAdmin : styles.itemBgDefault,
            { opacity: activeBgAnim },
          ]}
        />
        <View style={styles.itemContent}>
          {Icon && (
            <Icon
              size={isActive ? 20 : 18}
              color={isActive ? activeColor : COLORS.textMuted}
              strokeWidth={isActive ? 2.5 : 1.8}
            />
          )}
          <Text style={[styles.label, isActive ? { color: activeColor, fontWeight: '800' } : styles.inactiveLabel]}>
            {item.label}
          </Text>
        </View>
      </Animated.View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingBottom: Platform.OS === 'ios' ? 28 : 12,
    paddingTop: 8,
    backgroundColor: 'transparent',
    pointerEvents: 'box-none' as any,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.97)',
    borderRadius: RADIUS.pill,
    paddingHorizontal: 8,
    paddingVertical: 6,
    maxWidth: 420,
    width: '92%',
    borderWidth: 1,
    borderColor: 'rgba(0,77,64,0.08)',
    ...SHADOW.strong,
  },

  // Regular tab
  itemWrap: { flex: 1, alignItems: 'center' },
  itemOuter: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: RADIUS.pill,
    overflow: 'hidden',
    minWidth: 56,
  },
  itemBg: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: RADIUS.pill,
  },
  itemBgDefault: { backgroundColor: COLORS.accentMuted },
  itemBgAdmin:   { backgroundColor: 'rgba(99,102,241,0.12)' },
  itemContent: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    gap: 3,
  },
  label:         { fontSize: 9,  fontWeight: '700', letterSpacing: 0.2 },
  inactiveLabel: { color: COLORS.textMuted },

  // Scan tab
  scanWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -18,
  },
  scanBtn: {
    width: 56,
    height: 56,
    borderRadius: 18,
    backgroundColor: COLORS.surface,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.border,
    ...SHADOW.card,
  },
  scanBtnActive: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.accentMuted,
  },
  scanIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
  },
  scanLabel:       { fontSize: 9, fontWeight: '700', color: COLORS.textMuted, marginTop: 4, letterSpacing: 0.2 },
  scanLabelActive: { color: COLORS.primary, fontWeight: '800' },
});
