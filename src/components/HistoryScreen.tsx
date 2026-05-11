import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  TextInput, Animated, Easing, Modal, Alert,
} from 'react-native';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, ScanRecord } from '../db';
import { Search, Activity, Calendar, CloudOff, Cloud, Download, Trash2, Edit3, X, Check } from 'lucide-react';
import { format } from 'date-fns';
import { enUS } from 'date-fns/locale';
import { COLORS } from '../styles';
import { HistorySkeleton } from './Skeleton';
import { useApp } from '../AppContext';
import jsPDF from 'jspdf';

export default function HistoryScreen() {
  const scans = useLiveQuery(() => db.scans.orderBy('timestamp').reverse().toArray());
  const [query, setQuery] = useState('');
  const { user } = useApp();

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  const isLoading = scans === undefined;

  useEffect(() => {
    if (!isLoading) {
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: 0, duration: 400, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      ]).start();
    }
  }, [isLoading]);

  if (isLoading) {
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.list}>
        <HistorySkeleton />
      </ScrollView>
    );
  }

  const filtered = (scans ?? []).filter((s) =>
    s.type.toLowerCase().includes(query.toLowerCase()) ||
    s.location.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.headerWrap, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
        <Text style={styles.title}>History</Text>
        <Text style={styles.subtitle}>{scans?.length ?? 0} scan{(scans?.length ?? 0) !== 1 ? 's' : ''} recorded</Text>

        <View style={styles.searchBox}>
          <Search size={16} color="#9ca3af" />
          <TextInput
            placeholder="Search..."
            placeholderTextColor="#9ca3af"
            style={styles.searchInput}
            value={query}
            onChangeText={setQuery}
          />
        </View>
      </Animated.View>

      <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
        {filtered.length === 0 ? (
          <EmptyState />
        ) : (
          filtered.map((scan, i) => (
            <ScanCard key={scan.id} scan={scan} index={i} user={user} />
          ))
        )}
      </ScrollView>
    </View>
  );
}

async function generatePDF(scan: ScanRecord, user: any) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const W = 210;
  const primary = [0, 77, 64] as [number, number, number];
  const light = [248, 250, 247] as [number, number, number];

  // Header band
  doc.setFillColor(...primary);
  doc.rect(0, 0, W, 38, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('DermaScan — Analysis Report', 14, 16);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(`Generated on ${format(new Date(), 'MMMM dd, yyyy HH:mm', { locale: enUS })}`, 14, 24);
  doc.text('Gemini 2.0 Flash AI · Dermatological Analysis', 14, 30);

  // Patient info card
  doc.setFillColor(...light);
  doc.roundedRect(14, 44, W - 28, 38, 4, 4, 'F');
  doc.setTextColor(...primary);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('PATIENT INFORMATION', 20, 54);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(60, 60, 60);
  const patientName = user ? `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() || 'Unknown' : 'Unknown';
  doc.text(`Name: ${patientName}`, 20, 62);
  doc.text(`Email: ${user?.email ?? '—'}`, 20, 68);
  doc.text(`Location: ${user?.location ?? '—'}`, 110, 62);
  doc.text(`Contact: ${user?.contact ?? '—'}`, 110, 68);
  doc.text(`Sex: ${user?.sex === 'male' ? 'Male' : user?.sex === 'female' ? 'Female' : 'Other'}`, 20, 74);

  // Scan result card
  const sevColor: [number, number, number] =
    scan.severity === 'low' ? [16, 185, 129] :
    scan.severity === 'medium' ? [245, 158, 11] : [239, 68, 68];

  doc.setFillColor(...light);
  doc.roundedRect(14, 88, W - 28, 52, 4, 4, 'F');

  doc.setFillColor(...sevColor);
  doc.roundedRect(14, 88, 5, 52, 2, 2, 'F');

  doc.setTextColor(...primary);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('SCAN RESULT', 24, 98);

  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...primary);
  doc.text(scan.type, 24, 108);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(80, 80, 80);
  const sevLabel = scan.severity === 'low' ? 'Low' : scan.severity === 'medium' ? 'Moderate' : 'High';
  doc.text(`Severity: ${sevLabel}`, 24, 116);
  doc.text(`AI Confidence: ${scan.confidence.toFixed(1)}%`, 24, 122);
  doc.text(`Scan date: ${format(new Date(scan.timestamp), 'MMMM dd, yyyy HH:mm', { locale: enUS })}`, 24, 128);
  doc.text(`Body area: ${scan.location}`, 24, 134);

  // Severity badge
  doc.setFillColor(...sevColor);
  doc.roundedRect(140, 100, 56, 14, 3, 3, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text(sevLabel.toUpperCase(), 168, 109, { align: 'center' });

  // Summary
  doc.setFillColor(...light);
  doc.roundedRect(14, 146, W - 28, 50, 4, 4, 'F');
  doc.setTextColor(...primary);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('CLINICAL SUMMARY', 20, 156);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(60, 60, 60);
  const summaryLines = doc.splitTextToSize(scan.summary || 'No summary available.', W - 44);
  doc.text(summaryLines, 20, 164);

  // Scan image
  if (scan.imageData) {
    try {
      doc.setFillColor(...light);
      doc.roundedRect(14, 202, W - 28, 70, 4, 4, 'F');
      doc.setTextColor(...primary);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text('ANALYZED IMAGE', 20, 212);
      const imgFormat = scan.imageData.startsWith('data:image/png') ? 'PNG' : 'JPEG';
      doc.addImage(scan.imageData, imgFormat, 20, 216, 80, 50);
    } catch {
      // image embed failed silently
    }
  }

  // Sync status
  doc.setFillColor(scan.isSynced ? 16 : 156, scan.isSynced ? 185 : 163, scan.isSynced ? 129 : 175);
  doc.roundedRect(14, 278, 60, 10, 2, 2, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text(scan.isSynced ? '✓ Cloud Synced' : '○ Local Storage', 44, 285, { align: 'center' });

  // Footer
  doc.setFillColor(...primary);
  doc.rect(0, 287, W, 10, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.text('DermaScan · Confidential report · For medical use only', W / 2, 293, { align: 'center' });

  doc.save(`DermaScan_${scan.type.replace(/\s+/g, '_')}_${format(new Date(scan.timestamp), 'yyyyMMdd')}.pdf`);
}

function ScanCard({ scan, index, user }: { scan: ScanRecord; index: number; user: any }) {
  const anim = useRef(new Animated.Value(0)).current;
  const [editModal, setEditModal] = useState(false);
  const [editType, setEditType] = useState(scan.type);
  const [editLocation, setEditLocation] = useState(scan.location);
  const [editSeverity, setEditSeverity] = useState<'low' | 'medium' | 'high'>(scan.severity);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Animated.timing(anim, {
      toValue: 1,
      duration: 350,
      delay: index * 60,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, []);

  const handleDelete = async () => {
    if (!scan.id) return;
    if (!window.confirm('Delete this scan?')) return;
    await db.scans.delete(scan.id);
  };

  const handleSave = async () => {
    if (!scan.id) return;
    setSaving(true);
    await db.scans.update(scan.id, {
      type: editType.trim() || scan.type,
      location: editLocation.trim() || scan.location,
      severity: editSeverity,
    });
    setSaving(false);
    setEditModal(false);
  };

  const handleDownload = () => generatePDF(scan, user);

  const severityStyle =
    scan.severity === 'low' ? styles.low :
    scan.severity === 'medium' ? styles.medium : styles.high;

  const severityTextStyle =
    scan.severity === 'low' ? styles.lowText :
    scan.severity === 'medium' ? styles.mediumText : styles.highText;

  const severityLabel =
    scan.severity === 'low' ? 'Low' :
    scan.severity === 'medium' ? 'Moderate' : 'High';

  return (
    <>
      <Animated.View style={{
        opacity: anim,
        transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) }],
      }}>
        <View style={styles.card}>
          <View style={[styles.severityBar, severityStyle]} />

          <View style={styles.cardBody}>
            <View style={styles.cardTop}>
              <Text style={styles.scanType} numberOfLines={1}>{scan.type}</Text>
              <View style={[styles.severityTag, severityStyle]}>
                <Text style={[styles.severityTagText, severityTextStyle]}>{severityLabel}</Text>
              </View>
            </View>

            <Text style={styles.scanLocation} numberOfLines={1}>{scan.location}</Text>

            <View style={styles.cardMeta}>
              <View style={styles.metaItem}>
                <Calendar size={10} color="#9ca3af" />
                <Text style={styles.metaText}>
                  {format(new Date(scan.timestamp), 'MMM dd, yyyy', { locale: enUS })}
                </Text>
              </View>
              <View style={styles.metaItem}>
                {scan.isSynced
                  ? <Cloud size={10} color={COLORS.primary} />
                  : <CloudOff size={10} color="#9ca3af" />}
                <Text style={[styles.metaText, scan.isSynced && { color: COLORS.primary }]}>
                  {scan.isSynced ? 'Synced' : 'Local'}
                </Text>
              </View>
              <View style={styles.confidencePill}>
                <Text style={styles.confidenceText}>{scan.confidence.toFixed(1)}%</Text>
              </View>
            </View>

            {/* Action buttons */}
            <View style={styles.actions}>
              <TouchableOpacity style={styles.actionBtn} onPress={handleDownload} activeOpacity={0.75}>
                <Download size={13} color={COLORS.primary} />
                <Text style={styles.actionText}>PDF</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionBtn} onPress={() => setEditModal(true)} activeOpacity={0.75}>
                <Edit3 size={13} color="#6366f1" />
                <Text style={[styles.actionText, { color: '#6366f1' }]}>Edit</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.actionBtn, styles.deleteBtn]} onPress={handleDelete} activeOpacity={0.75}>
                <Trash2 size={13} color="#ef4444" />
                <Text style={[styles.actionText, { color: '#ef4444' }]}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Animated.View>

      {/* Edit Modal */}
      <Modal visible={editModal} transparent animationType="fade" onRequestClose={() => setEditModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit scan</Text>
              <TouchableOpacity onPress={() => setEditModal(false)}>
                <X size={20} color="#9ca3af" />
              </TouchableOpacity>
            </View>

            <Text style={styles.fieldLabel}>CONDITION TYPE</Text>
            <TextInput
              style={styles.modalInput}
              value={editType}
              onChangeText={setEditType}
              placeholder="e.g. Eczema"
              placeholderTextColor="#9ca3af"
            />

            <Text style={styles.fieldLabel}>BODY AREA</Text>
            <TextInput
              style={styles.modalInput}
              value={editLocation}
              onChangeText={setEditLocation}
              placeholder="e.g. Forearm"
              placeholderTextColor="#9ca3af"
            />

            <Text style={styles.fieldLabel}>SEVERITY</Text>
            <View style={styles.sevRow}>
              {(['low', 'medium', 'high'] as const).map(s => (
                <TouchableOpacity
                  key={s}
                  onPress={() => setEditSeverity(s)}
                  style={[styles.sevBtn, editSeverity === s && styles.sevBtnActive,
                    s === 'low' ? styles.sevLow : s === 'medium' ? styles.sevMed : styles.sevHigh,
                    editSeverity === s && { opacity: 1 },
                    editSeverity !== s && { opacity: 0.35 },
                  ]}
                  activeOpacity={0.8}
                >
                  <Text style={styles.sevBtnText}>
                    {s === 'low' ? 'Low' : s === 'medium' ? 'Moderate' : 'High'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={saving} activeOpacity={0.85}>
              <Check size={15} color="#fff" />
              <Text style={styles.saveBtnText}>{saving ? 'Saving...' : 'Save'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
}

function EmptyState() {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(anim, { toValue: 1, duration: 500, useNativeDriver: true }).start();
  }, []);

  return (
    <Animated.View style={[styles.empty, { opacity: anim }]}>
      <View style={styles.emptyIcon}>
        <Activity size={28} color="#d1d5db" />
      </View>
      <Text style={styles.emptyTitle}>No scans</Text>
      <Text style={styles.emptyDesc}>Your analyses will appear here after your first scan.</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  headerWrap: {
    padding: 24,
    paddingBottom: 0,
    maxWidth: 500,
    alignSelf: 'center',
    width: '100%',
  },
  title: { fontSize: 30, fontWeight: '800', color: COLORS.primary },
  subtitle: { fontSize: 13, color: '#9ca3af', marginTop: 2, marginBottom: 20 },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: COLORS.surface,
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(0,77,64,0.06)',
  },
  searchInput: { flex: 1, fontSize: 14, color: COLORS.text },
  list: {
    padding: 24,
    paddingTop: 4,
    paddingBottom: 130,
    gap: 12,
    maxWidth: 500,
    alignSelf: 'center',
    width: '100%',
  },
  card: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(0,77,64,0.06)',
  },
  severityBar: { width: 4 },
  low: { backgroundColor: '#10b981' },
  medium: { backgroundColor: '#f59e0b' },
  high: { backgroundColor: '#ef4444' },
  cardBody: { flex: 1, padding: 16, gap: 4 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  scanType: { fontSize: 15, fontWeight: '700', color: COLORS.primary, flex: 1, marginRight: 8 },
  severityTag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 99,
    opacity: 0.15,
  },
  severityTagText: { fontSize: 9, fontWeight: '800', letterSpacing: 0.5 },
  lowText: { color: '#065f46' },
  mediumText: { color: '#92400e' },
  highText: { color: '#991b1b' },
  scanLocation: { fontSize: 12, color: '#9ca3af' },
  cardMeta: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 8 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { fontSize: 10, color: '#9ca3af', fontWeight: '600' },
  confidencePill: {
    marginLeft: 'auto' as any,
    backgroundColor: 'rgba(175,239,221,0.3)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 99,
  },
  confidenceText: { fontSize: 10, fontWeight: '800', color: COLORS.primary },
  actions: { flexDirection: 'row', gap: 8, marginTop: 10 },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: 'rgba(0,77,64,0.06)',
  },
  deleteBtn: { backgroundColor: 'rgba(239,68,68,0.07)' },
  actionText: { fontSize: 11, fontWeight: '700', color: COLORS.primary },
  empty: { paddingVertical: 80, alignItems: 'center', gap: 12 },
  emptyIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#f9fafb',
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: COLORS.primary },
  emptyDesc: { fontSize: 13, color: '#9ca3af', textAlign: 'center', maxWidth: 240, lineHeight: 19 },
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 28,
    padding: 24,
    width: '100%',
    maxWidth: 420,
    gap: 12,
  },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  modalTitle: { fontSize: 17, fontWeight: '800', color: COLORS.primary },
  fieldLabel: { fontSize: 9, fontWeight: '800', color: '#9ca3af', letterSpacing: 1.2, marginTop: 4 },
  modalInput: {
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: COLORS.text,
    borderWidth: 1,
    borderColor: 'rgba(0,77,64,0.08)',
  },
  sevRow: { flexDirection: 'row', gap: 8 },
  sevBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 12 },
  sevBtnActive: {},
  sevLow: { backgroundColor: '#10b981' },
  sevMed: { backgroundColor: '#f59e0b' },
  sevHigh: { backgroundColor: '#ef4444' },
  sevBtnText: { fontSize: 12, fontWeight: '700', color: '#fff' },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: COLORS.primary,
    borderRadius: 14,
    paddingVertical: 14,
    marginTop: 4,
  },
  saveBtnText: { color: '#fff', fontWeight: '800', fontSize: 14 },
});
