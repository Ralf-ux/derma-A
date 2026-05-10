/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { View, StyleSheet, SafeAreaView, TouchableOpacity, Text, Image, Platform } from 'react-native';
import { AppProvider, useApp } from './AppContext';
import AuthScreen from './components/AuthScreen';
import Dashboard from './components/Dashboard';
import ScanScreen from './components/ScanScreen';
import HistoryScreen from './components/HistoryScreen';
import Navigation from './components/Navigation';
import { Menu, User, Bell } from 'lucide-react';
import { COLORS } from './styles';

function AppContent() {
  const { activeScreen, user } = useApp();

  const renderScreen = () => {
    switch (activeScreen) {
      case 'auth': return <AuthScreen />;
      case 'home': return <Dashboard />;
      case 'scan': return <ScanScreen />;
      case 'history': return <HistoryScreen />;
      case 'settings': return (
        <View style={styles.settingsContent}>
          <View style={styles.settingsAvatarWrapper}>
            <View style={styles.settingsAvatarBg}>
              <User size={40} color={COLORS.primary} />
            </View>
          </View>
          <Text style={styles.settingsTitle}>Paramètres de Profil</Text>
          <Text style={styles.settingsSubtitle}>Gérez vos préférences médicales et la sécurité biométrique ici.</Text>
          
          <View style={styles.settingsCard}>
            <View style={styles.settingsRow}>
              <Text style={styles.settingsLabel}>BIOMÉTRIE</Text>
              <View style={styles.toggleTrack}>
                <View style={styles.toggleThumb} />
              </View>
            </View>
            <View style={[styles.settingsRow, { borderBottomWidth: 0 }]}>
              <Text style={styles.settingsLabel}>CHIFFREMENT RLS</Text>
              <Text style={styles.activeStatus}>Activé</Text>
            </View>
          </View>
        </View>
      );
      default: return <Dashboard />;
    }
  };

  const isAuth = activeScreen === 'auth';
  const isScan = activeScreen === 'scan';

  return (
    <SafeAreaView style={styles.container}>
      {!isAuth && !isScan && (
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <TouchableOpacity style={styles.iconBtn}>
              <Menu size={20} color={COLORS.primary} />
            </TouchableOpacity>
            <Text style={styles.brand}>Derma</Text>
          </View>
          <View style={styles.headerRight}>
            <TouchableOpacity style={styles.iconBtn}>
              <Bell size={20} color="#9ca3af" />
            </TouchableOpacity>
            <View style={styles.avatarMini}>
              <Image 
                source={{ uri: `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.name}` }}
                style={styles.avatarImg}
              />
            </View>
          </View>
        </View>
      )}

      <View style={styles.main}>
        {renderScreen()}
      </View>

      <Navigation />
    </SafeAreaView>
  );
}

export default function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 77, 64, 0.05)',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  brand: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.primary,
    fontFamily: 'Lexend',
    letterSpacing: -0.5,
  },
  iconBtn: {
    padding: 4,
  },
  avatarMini: {
    width: 32,
    height: 32,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(0, 77, 64, 0.1)',
  },
  avatarImg: {
    width: '100%',
    height: '100%',
  },
  main: {
    flex: 1,
  },
  settingsContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  settingsAvatarWrapper: {
    marginBottom: 24,
  },
  settingsAvatarBg: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(175, 239, 221, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  settingsTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.primary,
    fontFamily: 'Lexend',
    marginBottom: 8,
  },
  settingsSubtitle: {
    fontSize: 14,
    color: '#9ca3af',
    textAlign: 'center',
    marginBottom: 32,
  },
  settingsCard: {
    width: '100%',
    maxWidth: 320,
    backgroundColor: COLORS.surface,
    borderRadius: 32,
    padding: 24,
    shadowColor: COLORS.primary,
    shadowOpacity: 0.04,
    shadowRadius: 16,
    elevation: 4,
  },
  settingsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f9fafb',
  },
  settingsLabel: {
    fontSize: 10,
    fontWeight: '900',
    color: '#9ca3af',
    letterSpacing: 1.5,
  },
  toggleTrack: {
    width: 40,
    height: 20,
    backgroundColor: 'rgba(175, 239, 221, 0.3)',
    borderRadius: 10,
    padding: 2,
    alignItems: 'flex-end',
  },
  toggleThumb: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: COLORS.accent,
  },
  activeStatus: {
    fontSize: 12,
    fontWeight: 'bold',
    color: COLORS.primary,
    fontStyle: 'italic',
  }
});

