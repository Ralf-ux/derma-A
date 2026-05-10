import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions, Platform } from 'react-native';
import { Home, Camera, History, Settings } from 'lucide-react';
import { useApp } from '../AppContext';
import { COLORS } from '../styles';

const { width } = Dimensions.get('window');

export default function Navigation() {
  const { activeScreen, setActiveScreen } = useApp();

  const items = [
    { id: 'home', icon: Home, label: 'Accueil' },
    { id: 'scan', icon: Camera, label: 'Scan' },
    { id: 'history', icon: History, label: 'Historique' },
    { id: 'settings', icon: Settings, label: 'Paramètres' },
  ];

  if (activeScreen === 'auth' || activeScreen === 'scan') return null;

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        {items.map((item) => {
          const isActive = activeScreen === item.id;
          return (
            <TouchableOpacity
              key={item.id}
              onPress={() => setActiveScreen(item.id)}
              style={[
                styles.item,
                isActive && styles.activeItem
              ]}
              activeOpacity={0.7}
            >
              {isActive && <View style={styles.activeBg} />}
              <item.icon 
                size={isActive ? 22 : 20} 
                color={isActive ? COLORS.primary : '#9ca3af'}
                strokeWidth={isActive ? 2.5 : 2}
              />
              <Text style={[
                styles.label,
                isActive ? styles.activeLabel : styles.inactiveLabel
              ]}>
                {item.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingBottom: Platform.OS === 'ios' ? 34 : 24,
    paddingTop: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 77, 64, 0.05)',
  },
  content: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    maxWidth: 500,
    alignSelf: 'center',
    width: '100%',
    paddingHorizontal: 20,
  },
  item: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    gap: 4,
  },
  activeItem: {
    // shadow logic handled by activeBg
  },
  activeBg: {
    position: 'absolute',
    inset: 0,
    backgroundColor: 'rgba(175, 239, 221, 0.3)',
    borderRadius: 20,
  },
  label: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  activeLabel: {
    color: COLORS.primary,
  },
  inactiveLabel: {
    color: '#9ca3af',
  }
});
