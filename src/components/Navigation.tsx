import React, { useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform, Animated, Easing } from 'react-native';
import { Home, Camera, History, Settings, ShieldCheck } from 'lucide-react';
import { useApp } from '../AppContext';
import { COLORS } from '../styles';

export default function Navigation() {
  const { activeScreen, setActiveScreen, user } = useApp();

  if (activeScreen === 'auth' || activeScreen === 'scan') return null;

  const isAdmin = user?.role === 'admin';

  const ITEMS = [
    { id: 'home', icon: Home, label: 'Home' },
    { id: 'scan', icon: Camera, label: 'Scan' },
    { id: 'history', icon: History, label: 'History' },
    ...(isAdmin ? [{ id: 'admin', icon: ShieldCheck, label: 'Admin' }] : []),
    { id: 'settings', icon: Settings, label: 'Settings' },
  ];

  return (
    <View style={styles.container}>
      <View style={styles.bar}>
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

function NavItem({ item, isActive, onPress }: {
  item: { id: string; icon: any; label: string };
  isActive: boolean;
  onPress: () => void;
}) {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const bgAnim = useRef(new Animated.Value(isActive ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(bgAnim, {
      toValue: isActive ? 1 : 0,
      duration: 220,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [isActive]);

  const handlePress = () => {
    Animated.sequence([
      Animated.timing(scaleAnim, { toValue: 0.88, duration: 80, useNativeDriver: true }),
      Animated.spring(scaleAnim, { toValue: 1, friction: 5, tension: 120, useNativeDriver: true }),
    ]).start();
    onPress();
  };

  const bgColor = bgAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['rgba(175,239,221,0)', 'rgba(175,239,221,0.3)'],
  });

  const Icon = item.icon;

  return (
    <TouchableOpacity onPress={handlePress} activeOpacity={1} style={styles.itemWrap}>
      <Animated.View style={[styles.item, { backgroundColor: bgColor, transform: [{ scale: scaleAnim }] }]}>
        <Icon
          size={isActive ? 21 : 19}
          color={isActive ? (item.id === 'admin' ? '#6366f1' : COLORS.primary) : '#9ca3af'}
          strokeWidth={isActive ? 2.5 : 1.8}
        />
        <Text style={[styles.label, isActive ? (item.id === 'admin' ? styles.adminLabel : styles.activeLabel) : styles.inactiveLabel]}>
          {item.label}
        </Text>
      </Animated.View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingBottom: Platform.OS === 'ios' ? 28 : 16,
    paddingTop: 10,
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,77,64,0.06)',
  },
  bar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    maxWidth: 500,
    alignSelf: 'center',
    width: '100%',
    paddingHorizontal: 12,
  },
  itemWrap: { flex: 1, alignItems: 'center' },
  item: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 18,
    gap: 3,
  },
  label: { fontSize: 9, fontWeight: '700', letterSpacing: 0.3 },
  activeLabel: { color: COLORS.primary },
  adminLabel: { color: '#6366f1' },
  inactiveLabel: { color: '#9ca3af' },
});
