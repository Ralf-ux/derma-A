import React, { useRef, useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions, ActivityIndicator } from 'react-native';
import { X, Zap, RefreshCw, Sun, Camera as CameraIcon } from 'lucide-react';
import { useApp } from '../AppContext';
import { db } from '../db';
import { COLORS } from '../styles';

const { width, height } = Dimensions.get('window');

export default function ScanScreen() {
  const { setActiveScreen } = useApp();
  const [isProcessing, setIsProcessing] = useState(false);
  const [lightingScore, setLightingScore] = useState(85);

  const handleCapture = async () => {
    setIsProcessing(true);
    
    // Simulate AI Processing (TFLite style)
    setTimeout(async () => {
      const newScan = {
        type: 'Nevus Mélanocytaire',
        location: 'Avant-bras gauche',
        confidence: 84 + Math.random() * 5,
        summary: 'Le scan montre une lésion pigmentée symétrique avec des bordures régulières. L\'IA suggère un naevus mélanocytaire bénin. Cependant, une surveillance clinique est conseillée.',
        timestamp: new Date(),
        patientId: '123',
        isSynced: false,
        severity: 'low' as const,
      };

      await db.scans.add(newScan);
      setIsProcessing(false);
      setActiveScreen('history');
    }, 2500);
  };

  return (
    <View style={styles.container}>
      {/* Background Simulation */}
      <View style={styles.cameraPlaceholder}>
        <View style={styles.overlay} />
      </View>

      {/* Guide Frame */}
      <View style={styles.guideContainer}>
        <View style={styles.guideFrame}>
          <View style={[styles.corner, styles.topLeft]} />
          <View style={[styles.corner, styles.topRight]} />
          <View style={[styles.corner, styles.bottomLeft]} />
          <View style={[styles.corner, styles.bottomRight]} />
        </View>
      </View>

      {/* Interface */}
      <View style={styles.interface}>
        <View style={styles.header}>
          <TouchableOpacity 
            onPress={() => setActiveScreen('home')}
            style={styles.closeBtn}
          >
            <X color="#fff" size={20} />
          </TouchableOpacity>

          <View style={styles.metrics}>
            <View style={styles.metricItem}>
              <Sun size={12} color={COLORS.accent} />
              <Text style={styles.metricLabel}>ÉCLAIRAGE</Text>
            </View>
            <View style={styles.bar}>
              <View style={[styles.progress, { width: `${lightingScore}%` }]} />
            </View>
            <Text style={styles.status}>OPTIMAL POUR IA</Text>
          </View>
        </View>

        <View style={styles.controls}>
          <View style={styles.hintBox}>
            <Text style={styles.hintText}>Alignez la zone à analyser</Text>
          </View>

          <View style={styles.actionRow}>
            <TouchableOpacity style={styles.secBtn}>
              <RefreshCw color="#fff" size={20} />
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.captureBtn} 
              onPress={handleCapture}
              disabled={isProcessing}
            >
              <View style={styles.captureInner}>
                 <CameraIcon color="#fff" size={28} />
              </View>
            </TouchableOpacity>

            <TouchableOpacity style={styles.secBtn}>
              <Zap color="#fff" size={20} />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {isProcessing && (
        <View style={styles.processingOverlay}>
          <View style={styles.processingCard}>
            <ActivityIndicator color={COLORS.primary} size="large" />
            <Text style={styles.processingText}>ANALYSE EN COURS...</Text>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  cameraPlaceholder: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#00201a',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 77, 64, 0.4)',
  },
  guideContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  guideFrame: {
    width: 300,
    height: 300,
    borderRadius: 40,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  corner: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderColor: COLORS.accent,
  },
  topLeft: { top: -2, left: -2, borderTopWidth: 4, borderLeftWidth: 4, borderTopLeftRadius: 30 },
  topRight: { top: -2, right: -2, borderTopWidth: 4, borderRightWidth: 4, borderTopRightRadius: 30 },
  bottomLeft: { bottom: -2, left: -2, borderBottomWidth: 4, borderLeftWidth: 4, borderBottomLeftRadius: 30 },
  bottomRight: { bottom: -2, right: -2, borderBottomWidth: 4, borderRightWidth: 4, borderBottomRightRadius: 30 },
  interface: {
    flex: 1,
    justifyContent: 'space-between',
    padding: 24,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingTop: 40,
  },
  closeBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  metrics: {
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: 12,
    borderRadius: 20,
    width: 140,
    gap: 6,
  },
  metricItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metricLabel: {
    color: COLORS.accent,
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 1,
  },
  bar: {
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 2,
  },
  progress: {
    height: '100%',
    backgroundColor: COLORS.accent,
  },
  status: {
    fontSize: 7,
    color: 'rgba(255,255,255,0.4)',
    textAlign: 'center',
    fontWeight: '800',
  },
  controls: {
    alignItems: 'center',
    paddingBottom: 40,
    gap: 32,
  },
  hintBox: {
    backgroundColor: 'rgba(0, 77, 64, 0.8)',
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 99,
  },
  hintText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 40,
  },
  captureBtn: {
    width: 88,
    height: 88,
    borderRadius: 44,
    borderWidth: 4,
    borderColor: 'rgba(175, 239, 221, 0.3)',
    padding: 4,
  },
  captureInner: {
    flex: 1,
    backgroundColor: COLORS.primary,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  secBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  processingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 77, 64, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
  },
  processingCard: {
    backgroundColor: COLORS.surface,
    padding: 32,
    borderRadius: 32,
    alignItems: 'center',
    gap: 16,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 20,
  },
  processingText: {
    fontSize: 10,
    fontWeight: '900',
    color: COLORS.primary,
    letterSpacing: 2,
  }
});
