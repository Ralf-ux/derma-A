import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { Camera, Activity, ShieldPlus, ChevronRight, Zap } from 'lucide-react';
import { useApp } from '../AppContext';
import { COLORS } from '../styles';

export default function Dashboard() {
  const { user, setActiveScreen, isOnline } = useApp();

  return (
    <ScrollView 
      style={styles.container} 
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Bonjour,</Text>
          <Text style={styles.userName}>{user?.name}</Text>
        </View>
        <Image 
          source={{ uri: `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.name}` }}
          style={styles.avatar}
        />
      </View>

      {/* Connection Status */}
      <View style={[
        styles.statusCard, 
        isOnline ? styles.onlineCard : styles.offlineCard
      ]}>
        <View style={styles.statusInfo}>
          <View style={[
            styles.statusDot, 
            isOnline ? styles.onlineDot : styles.offlineDot
          ]} />
          <Text style={[
            styles.statusText,
            isOnline ? styles.onlineText : styles.offlineText
          ]}>
            {isOnline ? "CLOUD SYNCHRONISÉ" : "MODE HORS LIGNE"}
          </Text>
        </View>
        <Zap size={14} color={isOnline ? COLORS.primary : '#9a3412'} />
      </View>

      {/* Hero Quick Action */}
      <TouchableOpacity 
        activeOpacity={0.9}
        onPress={() => setActiveScreen('scan')}
        style={styles.hero}
      >
        <View style={styles.heroIconWrapper}>
            <Camera size={24} color={COLORS.surface} />
        </View>
        <Text style={styles.heroTitle}>Nouveau Scan AI</Text>
        <Text style={styles.heroDesc}>Analysez votre peau en quelques secondes avec notre IA locale.</Text>
        <View style={styles.heroBgIcon}>
          <Camera size={120} color="rgba(255,255,255,0.05)" />
        </View>
      </TouchableOpacity>

      {/* Stats Grid */}
      <View style={styles.statsGrid}>
        <View style={styles.statCard}>
          <View style={[styles.statIconWrapper, { backgroundColor: 'rgba(175, 239, 221, 0.4)' }]}>
            <Activity size={20} color={COLORS.primary} />
          </View>
          <Text style={styles.statLabel}>INDEX SANTÉ</Text>
          <View style={styles.statValueRow}>
            <Text style={styles.statValue}>92</Text>
            <Text style={styles.statMax}>/100</Text>
          </View>
        </View>
        <View style={styles.statCard}>
          <View style={[styles.statIconWrapper, { backgroundColor: 'rgba(0, 77, 64, 0.05)' }]}>
            <ShieldPlus size={20} color={COLORS.primary} />
          </View>
          <Text style={styles.statLabel}>DERNIER SCAN</Text>
          <Text style={styles.statDate}>Aujourd'hui</Text>
        </View>
      </View>

      {/* Recommendations */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recommandations</Text>
          <TouchableOpacity>
             <Text style={styles.seeAll}>Tout voir</Text>
          </TouchableOpacity>
        </View>
        
        <View style={styles.recommendationsList}>
          {[
            { title: "Protection UV", desc: "Indice UV élevé aujourd'hui.", icon: ShieldPlus },
            { title: "Hydratation", desc: "Pensez à boire 2L d'eau.", icon: Activity },
          ].map((item, index) => (
            <TouchableOpacity key={index} style={styles.recItem}>
              <View style={styles.recIconWrapper}>
                <item.icon size={20} color={COLORS.primary} />
              </View>
              <View style={styles.recContent}>
                <Text style={styles.recTitle}>{item.title}</Text>
                <Text style={styles.recDesc}>{item.desc}</Text>
              </View>
              <ChevronRight size={16} color="#d1d5db" />
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    padding: 24,
    paddingBottom: 120,
    maxWidth: 500,
    alignSelf: 'center',
    width: '100%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 32,
  },
  greeting: {
    fontSize: 32,
    fontWeight: 'bold',
    color: COLORS.primary,
    fontFamily: 'Lexend',
  },
  userName: {
    fontSize: 16,
    color: COLORS.primaryLight,
    fontWeight: '600',
    marginTop: -4,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 2,
    borderColor: COLORS.accent,
  },
  statusCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 24,
    borderWidth: 1,
    marginBottom: 32,
  },
  onlineCard: {
    backgroundColor: 'rgba(175, 239, 221, 0.2)',
    borderColor: 'rgba(175, 239, 221, 0.4)',
  },
  offlineCard: {
    backgroundColor: '#fff7ed',
    borderColor: '#ffedd5',
  },
  statusInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  onlineDot: {
    backgroundColor: '#059669',
  },
  offlineDot: {
    backgroundColor: '#ea580c',
  },
  statusText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
  },
  onlineText: {
    color: COLORS.primary,
  },
  offlineText: {
    color: '#9a3412',
  },
  hero: {
    backgroundColor: COLORS.primary,
    borderRadius: 40,
    padding: 32,
    marginBottom: 32,
    overflow: 'hidden',
  },
  heroIconWrapper: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  heroTitle: {
    color: COLORS.surface,
    fontSize: 24,
    fontWeight: 'bold',
    fontFamily: 'Lexend',
    marginBottom: 8,
  },
  heroDesc: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 14,
    lineHeight: 20,
    maxWidth: 200,
  },
  heroBgIcon: {
    position: 'absolute',
    top: 40,
    right: -20,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 32,
  },
  statCard: {
    flex: 1,
    backgroundColor: COLORS.surface,
    padding: 24,
    borderRadius: 32,
    borderWidth: 1,
    borderColor: 'rgba(0, 77, 64, 0.05)',
  },
  statIconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  statLabel: {
    fontSize: 8,
    fontWeight: '800',
    color: '#9ca3af',
    letterSpacing: 1,
    marginBottom: 4,
  },
  statValueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  statMax: {
    fontSize: 12,
    fontWeight: 'bold',
    color: COLORS.accent,
  },
  statDate: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  section: {
    gap: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingHorizontal: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.primary,
    fontFamily: 'Lexend',
  },
  seeAll: {
    fontSize: 12,
    fontWeight: 'bold',
    color: COLORS.accent,
  },
  recommendationsList: {
    gap: 12,
  },
  recItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    padding: 16,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(0, 77, 64, 0.05)',
  },
  recIconWrapper: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: 'rgba(175, 239, 221, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  recContent: {
    flex: 1,
  },
  recTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  recDesc: {
    fontSize: 12,
    color: '#9ca3af',
    marginTop: 2,
  }
});
