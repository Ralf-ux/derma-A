/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import {
  View,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  Platform,
  Image,
  ImageBackground,
} from 'react-native';
import { AppProvider, useApp } from './AppContext';
import { FullScreenLoader } from './components/Skeleton';
import AuthScreen from './components/AuthScreen';
import Dashboard from './components/Dashboard';
import ScanScreen from './components/ScanScreen';
import HistoryScreen from './components/HistoryScreen';
import AdminScreen from './components/AdminScreen';
import ProfileSettingsScreen from './components/ProfileSettingsScreen';
import Navigation from './components/Navigation';
import { Bell } from 'lucide-react';
import { COLORS } from './styles';
import logoImg from '../asserts/favicon-removed.png';
import mirrorBg from '../asserts/images/miror image.png';

function AppContent() {
  const { activeScreen, isBooting } = useApp();

  if (isBooting) return <FullScreenLoader label="Loading..." />;

  const renderScreen = () => {
    switch (activeScreen) {
      case 'auth': return <AuthScreen />;
      case 'home': return <Dashboard />;
      case 'scan': return <ScanScreen />;
      case 'history': return <HistoryScreen />;
      case 'admin': return <AdminScreen />;
      case 'settings': return <ProfileSettingsScreen />;
      default: return <Dashboard />;
    }
  };

  const isAuth = activeScreen === 'auth';
  const isScan = activeScreen === 'scan';

  return (
    <ImageBackground
      source={{ uri: mirrorBg }}
      style={styles.bgRoot}
      resizeMode="cover"
      imageStyle={styles.bgImage}
    >
      <View style={styles.bgWhiteVeil}>
        <SafeAreaView style={styles.container}>
          {!isAuth && !isScan && (
            <View style={styles.header}>
              <Image
                source={{ uri: logoImg }}
                style={styles.headerLogo}
                resizeMode="contain"
              />
              <TouchableOpacity style={styles.iconBtn}>
                <Bell size={19} color="#9ca3af" />
              </TouchableOpacity>
            </View>
          )}
          <View style={styles.main}>{renderScreen()}</View>
          <Navigation />
        </SafeAreaView>
      </View>
    </ImageBackground>
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
  bgRoot: { flex: 1, minHeight: Platform.OS === 'web' ? ('100vh' as any) : undefined },
  bgImage: { opacity: 0.4 },
  bgWhiteVeil: { flex: 1, backgroundColor: 'rgba(255,255,255,0.88)', minHeight: Platform.OS === 'web' ? ('100vh' as any) : undefined },
  container: { flex: 1, backgroundColor: 'transparent', minHeight: Platform.OS === 'web' ? ('100vh' as any) : undefined },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 10,
    backgroundColor: 'rgba(255,255,255,0.8)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,77,64,0.05)',
  },
  // Logo tripled: was 110×36, now 330×108
  headerLogo: { width: 330, height: 108 },
  iconBtn: { padding: 6 },
  main: { flex: 1 },
});
