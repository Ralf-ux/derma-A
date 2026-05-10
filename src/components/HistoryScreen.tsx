import React from 'react';
import { 
  View, 
  Text, 
  ScrollView, 
  TouchableOpacity, 
  StyleSheet, 
  Image,
  TextInput,
  Dimensions
} from 'react-native';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { Search, ChevronRight, Activity, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { COLORS } from '../styles';

const { width } = Dimensions.get('window');

export default function HistoryScreen() {
  const scans = useLiveQuery(() => db.scans.orderBy('timestamp').reverse().toArray());

  return (
    <View style={styles.container}>
      <ScrollView 
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={styles.title}>Historique</Text>
          <Text style={styles.subtitle}>Gérez et examinez vos scans passés.</Text>
        </View>

        <View style={styles.searchContainer}>
          <Search size={18} color="#9ca3af" style={styles.searchIcon} />
          <TextInput 
            placeholder="Rechercher un scan..."
            placeholderTextColor="#9ca3af"
            style={styles.searchInput}
          />
        </View>

        <View style={styles.list}>
          {!scans || scans.length === 0 ? (
            <View style={styles.emptyState}>
              <View style={styles.emptyIconWrapper}>
                <Activity size={32} color="#d1d5db" />
              </View>
              <Text style={styles.emptyText}>Aucun scan enregistré pour le moment.</Text>
            </View>
          ) : (
            scans.map((scan, i) => (
              <TouchableOpacity key={scan.id} style={styles.scanCard} activeOpacity={0.7}>
                <Image 
                  source={{ uri: `https://images.unsplash.com/photo-1550831107-1553da8c8464?w=200&h=200&auto=format&fit=crop` }}
                  style={styles.scanImage}
                />
                <View style={styles.scanInfo}>
                  <View style={styles.dateRow}>
                    <Calendar size={10} color="#9ca3af" />
                    <Text style={styles.scanDate}>
                        {format(scan.timestamp!, 'dd MMM yyyy', { locale: fr })}
                    </Text>
                  </View>
                  <Text style={styles.scanType} numberOfLines={1}>{scan.type}</Text>
                  <View style={styles.tagsRow}>
                    <View style={[
                      styles.confidenceTag,
                      scan.severity === 'low' ? styles.lowSeverity : styles.highSeverity
                    ]}>
                      <Text style={[
                        styles.confidenceText,
                        scan.severity === 'low' ? styles.lowSeverityText : styles.highSeverityText
                      ]}>
                        {scan.confidence.toFixed(1)}% CONFIANCE
                      </Text>
                    </View>
                    <Text style={styles.locationText} numberOfLines={1}>{scan.location}</Text>
                  </View>
                </View>
                <ChevronRight size={18} color="#f3f4f6" />
              </TouchableOpacity>
            ))
          )}
        </View>
      </ScrollView>

      <TouchableOpacity style={styles.fab} activeOpacity={0.9}>
        <Activity size={24} color={COLORS.surface} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    padding: 24,
    paddingBottom: 140,
    maxWidth: 500,
    alignSelf: 'center',
    width: '100%',
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: COLORS.primary,
    fontFamily: 'Lexend',
  },
  subtitle: {
    fontSize: 14,
    color: '#9ca3af',
    marginTop: 4,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    paddingHorizontal: 16,
    marginBottom: 32,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 14,
    color: COLORS.text,
  },
  list: {
    gap: 16,
  },
  scanCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    padding: 16,
    borderRadius: 32,
    borderWidth: 1,
    borderColor: 'rgba(0, 77, 64, 0.05)',
    gap: 16,
  },
  scanImage: {
    width: 72,
    height: 72,
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
  },
  scanInfo: {
    flex: 1,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  scanDate: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#9ca3af',
    letterSpacing: 0.5,
  },
  scanType: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.primary,
    marginBottom: 8,
  },
  tagsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  confidenceTag: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 99,
  },
  lowSeverity: {
    backgroundColor: 'rgba(175, 239, 221, 0.4)',
  },
  highSeverity: {
    backgroundColor: '#fee2e2',
  },
  confidenceText: {
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: -0.2,
  },
  lowSeverityText: {
    color: COLORS.primary,
  },
  highSeverityText: {
    color: '#ef4444',
  },
  locationText: {
    fontSize: 10,
    color: '#9ca3af',
    flex: 1,
  },
  emptyState: {
    paddingVertical: 80,
    alignItems: 'center',
    gap: 16,
  },
  emptyIconWrapper: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#f9fafb',
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: '#9ca3af',
    textAlign: 'center',
  },
  fab: {
    position: 'absolute',
    bottom: 110,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 20,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  }
});
