/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Platform,
  Image,
  ImageBackground,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppProvider, useApp } from './AppContext';
import { FullScreenLoader } from './components/Skeleton';
import AuthScreen from './components/AuthScreen';
import Dashboard from './components/Dashboard';
import ScanScreen from './components/ScanScreen';
import SkinScanner from './components/SkinScanner';
import HistoryScreen from './components/HistoryScreen';
import AdminScreen from './components/AdminScreen';
import ProfileSettingsScreen from './components/ProfileSettingsScreen';
import Navigation from './components/Navigation';
import TipsNotificationModal from './components/TipsNotificationModal';
import { Bell } from 'lucide-react-native';
import { COLORS, LAYOUT } from './styles';
import { useDailyTipsBell } from './hooks/useDailyTipsBell';
import logoImg from '../asserts/appicon-for-all.png';
import mirrorBg from '../asserts/images/mirror-image.png';
import DermaBotWidget from './components/DermaBotWidget';


function AppContent() {
  const { activeScreen, isBooting, user, setActiveScreen } = useApp();
  const [tipsModalOpen, setTipsModalOpen] = useState(false);
  const isPatient = user?.role === 'patient';
  const { tips, hasUnread, markRead, reload } = useDailyTipsBell(isPatient ? user?.id : undefined);

  useEffect(() => {
    if (user?.role === 'admin' && ['home', 'scan', 'history'].includes(activeScreen)) {
      setActiveScreen('admin');
    }
  }, [user?.role, activeScreen, setActiveScreen]);

  if (isBooting) return <FullScreenLoader label="Loading..." />;

  const screen = (() => {
    if (user?.role === 'admin') {
      if (activeScreen === 'settings') return 'settings';
      return 'admin';
    }
    return activeScreen;
  })();

  const renderScreen = () => {
    switch (screen) {
      case 'auth':
        return <AuthScreen />;
      case 'home':
        return <Dashboard onTipsPublished={reload} />;
      case 'scan':
        // ScanScreen (web) uses file input + Gemini AI.
        // SkinScanner (native) uses expo-image-picker + Python backend.
        return Platform.OS === 'web'
          ? <ScanScreen />
          : <SkinScanner onBackPress={() => setActiveScreen('home')} />;
      case 'history':
        return <HistoryScreen />;
      case 'admin':
        return <AdminScreen onTipsSaved={reload} />;
      case 'settings':
        return <ProfileSettingsScreen />;
      default:
        return user?.role === 'admin' ? <AdminScreen onTipsSaved={reload} /> : <Dashboard onTipsPublished={reload} />;
    }
  };

  const isAuth = activeScreen === 'auth';
  const isScan = activeScreen === 'scan';
  const showHeader = !isAuth && !isScan;

  const openTips = async () => {
    setTipsModalOpen(true);
    await markRead();
  };

  return (
    <ImageBackground source={typeof mirrorBg === 'string' ? { uri: mirrorBg } : mirrorBg} style={styles.bgRoot} resizeMode="cover" imageStyle={styles.bgImage}>
      <View style={styles.bgVeil}>
        <SafeAreaView style={styles.container}>
          {showHeader && (
            <View style={styles.header}>
              <Image source={typeof logoImg === 'string' ? { uri: logoImg } : logoImg} style={styles.headerLogo} resizeMode="contain" />
              {isPatient ? (
                <TouchableOpacity style={styles.bellBtn} onPress={() => void openTips()} activeOpacity={0.8}>
                  <Bell size={20} color={hasUnread ? COLORS.bellUnread : COLORS.textSecondary} strokeWidth={hasUnread ? 2.5 : 2} />
                  {hasUnread ? <View style={styles.bellDot} /> : null}
                </TouchableOpacity>
              ) : (
                <View style={styles.bellSpacer} />
              )}
            </View>
          )}
          <View style={styles.main}>{renderScreen()}</View>
          <DermaBotWidget />
          <Navigation />

        </SafeAreaView>
      </View>

      {isPatient ? (
        <TipsNotificationModal
          visible={tipsModalOpen}
          tips={tips}
          onClose={() => setTipsModalOpen(false)}
        />
      ) : null}
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
  bgImage: { opacity: 0.22 },
  bgVeil: { flex: 1, backgroundColor: 'rgba(248, 250, 249, 0.94)', minHeight: Platform.OS === 'web' ? ('100vh' as any) : undefined },
  container: { flex: 1, backgroundColor: 'transparent' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: 'rgba(255,255,255,0.96)',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerLogo: { width: LAYOUT.headerLogoWidth, height: LAYOUT.headerLogoHeight, borderRadius: 10 },
  bellBtn: { padding: 8, position: 'relative' },
  bellSpacer: { width: 36 },
  bellDot: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: COLORS.bellUnread,
    borderWidth: 2,
    borderColor: '#fff',
  },
  main: { flex: 1 },
});
