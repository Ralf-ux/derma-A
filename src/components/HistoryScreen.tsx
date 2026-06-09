import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  TextInput, Animated, Easing, Modal, Alert, Platform,
} from 'react-native';
import { usePatientScans } from '../hooks/usePatientScans';
import { removePatientScan, updatePatientScan } from '../lib/localScans';
import { Search, Activity, Calendar, CloudOff, Cloud, Download, Trash2, Edit3, X, Check } from 'lucide-react-native';
import { format } from 'date-fns';
import { enUS } from 'date-fns/locale';
import { COLORS } from '../styles';
import { HistorySkeleton } from './Skeleton';
import { useApp } from '../AppContext';
import { ScanRecord } from '../db';

// jsPDF — web only, loaded at runtime so native bundler never sees it
let jsPDFClass: any = null;
if (Platform.OS === 'web' && typeof window !== 'undefined') {
  try {
    const mod = require('jspdf');
    jsPDFClass = mod.jsPDF ?? mod.default?.jsPDF ?? mod.default ?? mod;
    // verify it's actually a constructor
    if (typeof jsPDFClass !== 'function') jsPDFClass = null;
  } catch {
    jsPDFClass = null;
  }
}

export default function HistoryScreen() {
  const { user } = useApp();
  const { scans, isLoading, refresh } = usePatientScans(user?.id);
  const [query, setQuery] = useState('');

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;


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
            <ScanCard key={String(scan.id ?? i)} scan={scan} index={i} user={user} onChanged={refresh} />
          ))
        )}
      </ScrollView>
    </View>
  );
}

// ── Native: generate a real PDF via expo-print + expo-sharing ────────────────
async function saveReportNative(scan: ScanRecord, user: any) {
  const Print   = require('expo-print');
  const Sharing = require('expo-sharing');

  const patientName = user
    ? `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() || 'Unknown'
    : 'Unknown';
  const sevLabel =
    scan.severity === 'low' ? 'Low' :
    scan.severity === 'medium' ? 'Moderate' : 'High';
  const sevColor =
    scan.severity === 'low' ? '#10b981' :
    scan.severity === 'medium' ? '#f59e0b' : '#ef4444';
  const dateStr  = format(new Date(scan.timestamp), 'MMMM dd, yyyy HH:mm', { locale: enUS });
  const genDate  = format(new Date(), 'MMMM dd, yyyy HH:mm', { locale: enUS });

  // Resolve image: if it's a remote URL convert to base64 inline; if already base64 use as-is
  let imgTag = '';
  if (scan.imageData) {
    try {
      let src = scan.imageData;
      if (src.startsWith('http')) {
        const resp = await fetch(src);
        const blob = await resp.blob();
        src = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload  = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
      }
      if (src.startsWith('data:image')) {
        imgTag = `<img src="${src}" style="max-width:240px;max-height:200px;border-radius:10px;margin-top:8px;display:block;" />`;
      }
    } catch { /* skip image if unavailable */ }
  }

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <style>
    * { margin:0; padding:0; box-sizing:border-box; }
    body { font-family: Helvetica, Arial, sans-serif; font-size: 13px; color: #1a1a1a; background: #fff; }
    .header { background: #0a4d3c; color: #fff; padding: 28px 28px 22px; }
    .header h1 { font-size: 22px; font-weight: 700; letter-spacing: -0.3px; }
    .header p  { font-size: 10px; opacity: 0.7; margin-top: 4px; }
    .body { padding: 24px 28px; }
    .section { background: #f0f5f3; border-radius: 10px; padding: 16px 18px; margin-bottom: 16px; }
    .section-title { font-size: 9px; font-weight: 800; letter-spacing: 1.2px; color: #0a4d3c; text-transform: uppercase; margin-bottom: 10px; }
    .row { display: flex; justify-content: space-between; margin-bottom: 5px; }
    .label { color: #5f6f6b; font-size: 11px; }
    .value { font-weight: 600; font-size: 11px; color: #0d1f1b; text-align: right; max-width: 60%; }
    .scan-type { font-size: 17px; font-weight: 800; color: #0a4d3c; margin-bottom: 10px; }
    .sev-badge { display: inline-block; background: ${sevColor}; color: #fff; padding: 4px 12px; border-radius: 99px; font-size: 10px; font-weight: 800; letter-spacing: 0.8px; }
    .summary-text { font-size: 12px; color: #374151; line-height: 1.7; }
    .image-section { text-align: center; }
    .sync-badge { display: inline-block; padding: 4px 12px; border-radius: 6px; font-size: 10px; font-weight: 700;
      background: ${scan.isSynced ? '#d1fae5' : '#f3f4f6'}; color: ${scan.isSynced ? '#065f46' : '#4b5563'}; }
    .footer { background: #0a4d3c; color: rgba(255,255,255,0.65); font-size: 9px; padding: 12px 28px; text-align: center; margin-top: 16px; }
    .confidence-bar-bg { background: #e5e7eb; border-radius: 99px; height: 7px; margin-top: 6px; overflow: hidden; }
    .confidence-bar-fill { background: ${sevColor}; height: 7px; border-radius: 99px; width: ${Math.round(scan.confidence)}%; }
  </style>
</head>
<body>
  <div class="header">
    <h1>DermaScan — Analysis Report</h1>
    <p>Generated on ${genDate} &nbsp;·&nbsp; AI-powered Dermatological Analysis</p>
  </div>

  <div class="body">

    <div class="section">
      <div class="section-title">Patient Information</div>
      <div class="row"><span class="label">Full Name</span><span class="value">${patientName}</span></div>
      <div class="row"><span class="label">Email</span><span class="value">${user?.email ?? '—'}</span></div>
      <div class="row"><span class="label">Sex</span><span class="value">${user?.sex === 'male' ? 'Male' : user?.sex === 'female' ? 'Female' : 'Other'}</span></div>
      <div class="row"><span class="label">Location</span><span class="value">${user?.location ?? '—'}</span></div>
      <div class="row"><span class="label">Contact</span><span class="value">${user?.contact ?? '—'}</span></div>
    </div>

    <div class="section">
      <div class="section-title">Scan Result</div>
      <div class="scan-type">${scan.type}</div>
      <span class="sev-badge">${sevLabel.toUpperCase()}</span>
      <div style="margin-top:12px;">
        <div class="row"><span class="label">Scan date</span><span class="value">${dateStr}</span></div>
        <div class="row"><span class="label">Body area</span><span class="value">${scan.location}</span></div>
        <div class="row" style="margin-top:8px;"><span class="label">AI Confidence</span><span class="value">${scan.confidence.toFixed(1)}%</span></div>
        <div class="confidence-bar-bg"><div class="confidence-bar-fill"></div></div>
      </div>
    </div>

    <div class="section">
      <div class="section-title">Clinical Summary</div>
      <p class="summary-text">${scan.summary || 'No summary available.'}</p>
    </div>

    ${imgTag ? `
    <div class="section image-section">
      <div class="section-title">Analyzed Image</div>
      ${imgTag}
    </div>` : ''}

    <div style="text-align:center;margin-bottom:8px;">
      <span class="sync-badge">${scan.isSynced ? '✓ Cloud Synced' : '○ Local Storage'}</span>
    </div>

  </div>

  <div class="footer">
    DermaScan &nbsp;·&nbsp; Confidential medical report &nbsp;·&nbsp; For clinical use only &nbsp;·&nbsp; Not a substitute for professional medical diagnosis
  </div>
</body>
</html>`;

  // Render HTML → PDF file on device
  const { uri } = await Print.printToFileAsync({ html, base64: false });

  // Rename the file to something meaningful before sharing
  const fileName = `DermaScan_${scan.type.replace(/[^a-zA-Z0-9]/g, '_')}_${format(new Date(scan.timestamp), 'yyyyMMdd')}.pdf`;

  // Share / save the PDF file
  const canShare = await Sharing.isAvailableAsync();
  if (canShare) {
    await Sharing.shareAsync(uri, {
      mimeType: 'application/pdf',
      dialogTitle: `Save ${fileName}`,
      UTI: 'com.adobe.pdf',
    });
  } else {
    Alert.alert('Saved', `PDF saved to: ${uri}`);
  }
}

// ── Web: generate a real PDF with jsPDF ──────────────────────────────────────
async function generatePDF(scan: ScanRecord, user: any) {
  // Native path — render HTML to a real PDF file via expo-print
  if (Platform.OS !== 'web') {
    await saveReportNative(scan, user);
    return;
  }

  // Web path — use jsPDF
  if (!jsPDFClass) {
    Alert.alert('PDF unavailable', 'Could not load the PDF library. Please refresh and try again.');
    return;
  }

  const doc = new jsPDFClass({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const W       = 210;
  const primary = [10, 77, 60]   as [number, number, number];
  const light   = [240, 245, 243] as [number, number, number];

  // Header
  doc.setFillColor(...primary);
  doc.rect(0, 0, W, 40, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('DermaScan — Analysis Report', 14, 17);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(`Generated on ${format(new Date(), 'MMMM dd, yyyy HH:mm', { locale: enUS })}`, 14, 25);
  doc.text('AI-powered Dermatological Analysis', 14, 31);

  // Patient info
  doc.setFillColor(...light);
  doc.roundedRect(14, 46, W - 28, 38, 4, 4, 'F');
  doc.setTextColor(...primary);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('PATIENT INFORMATION', 20, 56);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(60, 60, 60);
  const patientName = user
    ? `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() || 'Unknown'
    : 'Unknown';
  doc.text(`Name: ${patientName}`,                20, 64);
  doc.text(`Email: ${user?.email ?? '—'}`,         20, 70);
  doc.text(`Location: ${user?.location ?? '—'}`,  110, 64);
  doc.text(`Contact: ${user?.contact ?? '—'}`,    110, 70);
  doc.text(`Sex: ${user?.sex === 'male' ? 'Male' : user?.sex === 'female' ? 'Female' : 'Other'}`, 20, 76);

  // Scan result
  const sevColor: [number, number, number] =
    scan.severity === 'low'    ? [16, 185, 129] :
    scan.severity === 'medium' ? [245, 158, 11] : [239, 68, 68];
  const sevLabel = scan.severity === 'low' ? 'Low' : scan.severity === 'medium' ? 'Moderate' : 'High';

  doc.setFillColor(...light);
  doc.roundedRect(14, 90, W - 28, 52, 4, 4, 'F');
  doc.setFillColor(...sevColor);
  doc.roundedRect(14, 90, 5, 52, 2, 2, 'F');
  doc.setTextColor(...primary);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('SCAN RESULT', 24, 100);
  doc.setFontSize(14);
  doc.text(scan.type, 24, 110);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(80, 80, 80);
  doc.text(`Severity: ${sevLabel}`,                                                    24, 118);
  doc.text(`AI Confidence: ${scan.confidence.toFixed(1)}%`,                            24, 124);
  doc.text(`Scan date: ${format(new Date(scan.timestamp), 'MMMM dd, yyyy HH:mm', { locale: enUS })}`, 24, 130);
  doc.text(`Body area: ${scan.location}`,                                               24, 136);
  doc.setFillColor(...sevColor);
  doc.roundedRect(140, 102, 56, 14, 3, 3, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text(sevLabel.toUpperCase(), 168, 111, { align: 'center' });

  // Clinical summary
  doc.setFillColor(...light);
  doc.roundedRect(14, 148, W - 28, 52, 4, 4, 'F');
  doc.setTextColor(...primary);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('CLINICAL SUMMARY', 20, 158);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(60, 60, 60);
  const summaryLines = doc.splitTextToSize(scan.summary || 'No summary available.', W - 44);
  doc.text(summaryLines, 20, 166);

  // Analyzed image (handles both base64 data URIs and remote URLs)
  if (scan.imageData) {
    try {
      let imgDataUri = scan.imageData;
      if (imgDataUri.startsWith('http')) {
        const resp = await fetch(imgDataUri);
        const blob = await resp.blob();
        imgDataUri = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload  = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
      }
      if (imgDataUri.startsWith('data:image')) {
        doc.setFillColor(...light);
        doc.roundedRect(14, 206, W - 28, 70, 4, 4, 'F');
        doc.setTextColor(...primary);
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.text('ANALYZED IMAGE', 20, 216);
        const fmt = imgDataUri.startsWith('data:image/png') ? 'PNG' : 'JPEG';
        doc.addImage(imgDataUri, fmt, 20, 220, 80, 50);
      }
    } catch { /* image embed failed — PDF still saves */ }
  }

  // Sync status + footer
  doc.setFillColor(scan.isSynced ? 16 : 156, scan.isSynced ? 185 : 163, scan.isSynced ? 129 : 175);
  doc.roundedRect(14, 280, 60, 10, 2, 2, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text(scan.isSynced ? '✓ Cloud Synced' : '○ Local Storage', 44, 287, { align: 'center' });
  doc.setFillColor(...primary);
  doc.rect(0, 287, W, 10, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.text('DermaScan · Confidential medical report · For clinical use only', W / 2, 293, { align: 'center' });

  doc.save(`DermaScan_${scan.type.replace(/[^a-zA-Z0-9]/g, '_')}_${format(new Date(scan.timestamp), 'yyyyMMdd')}.pdf`);
}

function ScanCard({ scan, index, user, onChanged }: { scan: ScanRecord; index: number; user: any; onChanged: () => void }) {
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
    const confirmed = await new Promise<boolean>((resolve) => {
      Alert.alert('Delete scan', 'Delete this scan?', [
        { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
        { text: 'Delete', style: 'destructive', onPress: () => resolve(true) },
      ]);
    });
    if (!confirmed) return;
    await removePatientScan(scan.id);
    onChanged();
  };

  const handleSave = async () => {
    if (!scan.id) return;
    setSaving(true);
    await updatePatientScan(scan.id, {
      type: editType.trim() || scan.type,
      location: editLocation.trim() || scan.location,
      severity: editSeverity,
    });
    setSaving(false);
    setEditModal(false);
    onChanged();
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
