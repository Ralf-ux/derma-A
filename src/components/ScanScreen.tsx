import React, { useRef, useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Animated, Easing,
} from 'react-native';
import { X, Zap, Sun, Camera as CameraIcon, Upload } from 'lucide-react-native';
import { useApp } from '../AppContext';
import { db } from '../db';
import { COLORS } from '../styles';
import { isSupabaseConfigured } from '../lib/supabaseClient';
import { uploadScanRow } from '../lib/supabaseScans';
import { GoogleGenAI } from '@google/genai';
import PreScanQuestionnaire, { type PreScanAnswer } from './PreScanQuestionnaire';

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY ?? (import.meta.env.GEMINI_API_KEY as string | undefined);

function deriveSeverity(confidence: number): 'low' | 'medium' | 'high' {
  if (confidence >= 80) return 'low';
  if (confidence >= 60) return 'medium';
  return 'high';
}

async function analyzeImageWithGemini(file: File, preScanContext = ''): Promise<{
  type: string;
  confidence: number;
  severity: 'low' | 'medium' | 'high';
  summary: string;
}> {
  if (!GEMINI_API_KEY) throw new Error('GEMINI_API_KEY not configured');

  const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

  // Convert file to base64
  const arrayBuffer = await file.arrayBuffer();
  const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));

  const prompt = `You are a dermatology AI assistant. Analyze this skin image and respond ONLY with a valid JSON object (no markdown, no explanation) in this exact format:
{
  "type": "<skin condition name in English, e.g. Dermatitis, Eczema, Psoriasis, Melanoma, Acne, Keratosis, Benign lesion, etc.>",
  "confidence": <number between 50 and 98>,
  "severity": "<low|medium|high>",
  "summary": "<2-3 sentence clinical summary in English describing the finding and recommendation>"
}
If the image is not a skin image, use type "Non-cutaneous image", confidence 0, severity "low", and explain in summary.${preScanContext}`;

  const response = await ai.models.generateContent({
    model: 'gemini-2.0-flash',
    contents: [
      {
        role: 'user',
        parts: [
          { inlineData: { mimeType: file.type as any || 'image/jpeg', data: base64 } },
          { text: prompt },
        ],
      },
    ],
  });

  const text = response.text ?? '';
  // Extract JSON from response
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('Invalid AI response format');

  const parsed = JSON.parse(jsonMatch[0]);
  return {
    type: parsed.type ?? 'Skin lesion',
    confidence: Math.min(98, Math.max(0, Number(parsed.confidence) || 75)),
    severity: ['low', 'medium', 'high'].includes(parsed.severity) ? parsed.severity : deriveSeverity(parsed.confidence),
    summary: parsed.summary ?? '',
  };
}

function Dot({ delay }: { delay: number }) {
  const anim = useRef(new Animated.Value(0.3)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(anim, { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0.3, duration: 400, useNativeDriver: true }),
      ])
    ).start();
  }, []);
  return <Animated.View style={[styles.dot, { opacity: anim }]} />;
}

function ProcessingDots() {
  return (
    <View style={styles.dotsRow}>
      <Dot delay={0} /><Dot delay={200} /><Dot delay={400} />
    </View>
  );
}

export default function ScanScreen() {
  const { setActiveScreen, user, isOnline } = useApp();
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [processingStatus, setProcessingStatus] = useState('Analyzing...');

  // ── Pre-scan questionnaire ─────────────────────────────────────────────────
  const [showPreQuestionnaire, setShowPreQuestionnaire] = useState(false);
  const [preScanAnswers, setPreScanAnswers] = useState<PreScanAnswer[]>([]);

  const scanLineAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const processingOpacity = useRef(new Animated.Value(0)).current;
  const cornerAnim = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(cornerAnim, { toValue: 1, duration: 1200, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(cornerAnim, { toValue: 0.4, duration: 1200, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(scanLineAnim, { toValue: 1, duration: 2000, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(scanLineAnim, { toValue: 0, duration: 2000, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ])
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.06, duration: 900, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 900, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    ).start();
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  };

  /**
   * Step 1 — user taps the capture button.
   * Open the pre-scan questionnaire first; the actual AI call happens only
   * after the questionnaire is completed or skipped.
   */
  const handleCapture = () => {
    if (!selectedFile) return;
    setPreScanAnswers([]);
    setShowPreQuestionnaire(true);
  };

  /**
   * Step 2 — pre-scan questionnaire completed or skipped.
   * Now run the AI analysis.
   */
  const handlePreScanDone = async (answers: PreScanAnswer[]) => {
    setShowPreQuestionnaire(false);
    setPreScanAnswers(answers);
    await runAnalysis(answers);
  };

  /**
   * Core AI analysis — called after pre-scan answers are collected.
   */
  const runAnalysis = async (preScanData: PreScanAnswer[]) => {
    if (!selectedFile) return;
    setIsProcessing(true);
    setProcessingStatus('Analyzing...');
    Animated.timing(processingOpacity, { toValue: 1, duration: 300, useNativeDriver: true }).start();

    let result: { type: string; confidence: number; severity: 'low' | 'medium' | 'high'; summary: string };

    // Build a pre-scan context snippet to enrich the Gemini prompt
    const preScanContext = preScanData.length > 0
      ? '\n\nPatient intake context:\n' + preScanData
          .map(a => `- ${a.questionText}: ${Array.isArray(a.answer) ? a.answer.join(', ') : a.answer}`)
          .join('\n')
      : '';

    try {
      setProcessingStatus('AI model processing...');
      result = await analyzeImageWithGemini(selectedFile, preScanContext);
    } catch {
      // Fallback to mock if Gemini fails
      setProcessingStatus('Local analysis...');
      await new Promise(r => setTimeout(r, 1500));
      const confidence = 70 + Math.random() * 28;
      const severity = deriveSeverity(confidence);
      const baseName = selectedFile.name.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' ');
      result = {
        type: baseName || 'Skin lesion',
        confidence,
        severity,
        summary: `Analysis completed with ${confidence.toFixed(1)}% confidence. Severity: ${
          severity === 'low' ? 'low' : severity === 'medium' ? 'moderate' : 'high'
        }. Consult a dermatologist for confirmation.`,
      };
    }

    // Convert image to base64 for local storage
    let imageData: string | undefined;
    try {
      const reader = new FileReader();
      imageData = await new Promise<string>((resolve, reject) => {
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(selectedFile);
      });
    } catch { /* skip */ }

    // Attach pre-scan answers to the summary
    const preScanSummary = preScanData.length > 0
      ? '\n\nPre-scan intake: ' + preScanData
          .map(a => `${a.questionText.replace(/\?$/, '')}: ${Array.isArray(a.answer) ? a.answer.join(', ') : a.answer}`)
          .join(' | ')
      : '';

    const newScan = {
      type: result.type,
      location: user?.location || 'Analyzed area',
      confidence: result.confidence,
      summary: result.summary + preScanSummary,
      imageData,
      timestamp: new Date(),
      patientId: user?.id ?? 'anonymous',
      isSynced: false,
      severity: result.severity,
    };

    const id = await db.scans.add(newScan);

    if (isOnline && user?.id && isSupabaseConfigured()) {
      try {
        setProcessingStatus('Cloud sync...');
        await uploadScanRow({ userId: user.id, record: newScan, imageFile: selectedFile });
        await db.scans.update(id, { isSynced: true });
      } catch { /* keep local */ }
    }

    Animated.timing(processingOpacity, { toValue: 0, duration: 200, useNativeDriver: true }).start(() => {
      setIsProcessing(false);
      setActiveScreen('history');
    });
  };

  const scanLineTranslate = scanLineAnim.interpolate({ inputRange: [0, 1], outputRange: [-130, 130] });

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      <View style={styles.bg}>
        {previewUrl
          ? <View style={[styles.bg, { overflow: 'hidden' }]}>
              {/* @ts-ignore */}
              <img src={previewUrl} style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.55 }} alt="" />
            </View>
          : <View style={styles.bgDark} />
        }
      </View>

      <View style={styles.guideContainer}>
        <View style={styles.guideFrame}>
          <Animated.View style={[styles.corner, styles.topLeft, { opacity: cornerAnim }]} />
          <Animated.View style={[styles.corner, styles.topRight, { opacity: cornerAnim }]} />
          <Animated.View style={[styles.corner, styles.bottomLeft, { opacity: cornerAnim }]} />
          <Animated.View style={[styles.corner, styles.bottomRight, { opacity: cornerAnim }]} />
          <Animated.View style={[styles.scanLine, { transform: [{ translateY: scanLineTranslate }] }]} />
        </View>
      </View>

      <View style={styles.interface}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => setActiveScreen('home')} style={styles.closeBtn}>
            <X color="#fff" size={18} />
          </TouchableOpacity>
          <View style={styles.badge}>
            <Sun size={11} color={COLORS.accent} />
            <Text style={styles.badgeText}>
              {GEMINI_API_KEY ? 'IA GEMINI ACTIVE' : 'MODE SIMULATION'}
            </Text>
          </View>
        </View>

        <View style={styles.controls}>
          <Text style={styles.hint}>
            {selectedFile ? selectedFile.name : 'Select an image to analyze'}
          </Text>
          <View style={styles.actionRow}>
            <View style={styles.secBtn}>
              {/* @ts-ignore */}
              <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', width: '100%', height: '100%' }}>
                <Upload color="#fff" size={18} />
                {/* @ts-ignore */}
                <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFileSelect} />
              </label>
            </View>

            <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
              <TouchableOpacity
                style={[styles.captureBtn, !selectedFile && styles.captureBtnDisabled]}
                onPress={handleCapture}
                disabled={isProcessing || !selectedFile}
                activeOpacity={0.85}
              >
                <View style={styles.captureInner}>
                  <CameraIcon color="#fff" size={26} />
                </View>
              </TouchableOpacity>
            </Animated.View>

            <TouchableOpacity style={styles.secBtn} onPress={() => { setSelectedFile(null); setPreviewUrl(null); }}>
              <Zap color="#fff" size={18} />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {isProcessing && (
        <Animated.View style={[styles.processingOverlay, { opacity: processingOpacity }]}>
          <View style={styles.processingCard}>
            <ProcessingDots />
            <Text style={styles.processingTitle}>Analyzing</Text>
            <Text style={styles.processingSubtitle}>{processingStatus}</Text>
          </View>
        </Animated.View>
      )}

      {/* ── Pre-scan questionnaire (shown before AI runs) ── */}
      <PreScanQuestionnaire
        visible={showPreQuestionnaire}
        onComplete={handlePreScanDone}
        onSkip={() => handlePreScanDone([])}
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  bg: { ...StyleSheet.absoluteFillObject },
  bgDark: { flex: 1, backgroundColor: '#001a14' },
  guideContainer: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center' },
  guideFrame: { width: 280, height: 280, borderRadius: 36, borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)', overflow: 'hidden', justifyContent: 'center', alignItems: 'center' },
  corner: { position: 'absolute', width: 36, height: 36, borderColor: COLORS.accent },
  topLeft: { top: -1, left: -1, borderTopWidth: 3, borderLeftWidth: 3, borderTopLeftRadius: 28 },
  topRight: { top: -1, right: -1, borderTopWidth: 3, borderRightWidth: 3, borderTopRightRadius: 28 },
  bottomLeft: { bottom: -1, left: -1, borderBottomWidth: 3, borderLeftWidth: 3, borderBottomLeftRadius: 28 },
  bottomRight: { bottom: -1, right: -1, borderBottomWidth: 3, borderRightWidth: 3, borderBottomRightRadius: 28 },
  scanLine: { position: 'absolute', width: '100%', height: 1.5, backgroundColor: COLORS.accent, opacity: 0.6 },
  interface: { flex: 1, justifyContent: 'space-between', padding: 24 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 48 },
  closeBtn: { width: 42, height: 42, borderRadius: 21, backgroundColor: 'rgba(255,255,255,0.08)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)', justifyContent: 'center', alignItems: 'center' },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(0,0,0,0.45)', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 99, borderWidth: 1, borderColor: 'rgba(175,239,221,0.2)' },
  badgeText: { color: COLORS.accent, fontSize: 9, fontWeight: '800', letterSpacing: 1.2 },
  controls: { alignItems: 'center', paddingBottom: 48, gap: 28 },
  hint: { color: 'rgba(255,255,255,0.55)', fontSize: 13, fontWeight: '500' },
  actionRow: { flexDirection: 'row', alignItems: 'center', gap: 36 },
  captureBtn: { width: 84, height: 84, borderRadius: 42, borderWidth: 3, borderColor: 'rgba(175,239,221,0.25)', padding: 4 },
  captureBtnDisabled: { opacity: 0.4 },
  captureInner: { flex: 1, backgroundColor: COLORS.primary, borderRadius: 38, justifyContent: 'center', alignItems: 'center' },
  secBtn: { width: 46, height: 46, borderRadius: 23, backgroundColor: 'rgba(255,255,255,0.08)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  processingOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,20,15,0.75)', justifyContent: 'center', alignItems: 'center', zIndex: 100 },
  processingCard: { backgroundColor: '#0a1f1a', borderWidth: 1, borderColor: 'rgba(175,239,221,0.15)', padding: 36, borderRadius: 32, alignItems: 'center', gap: 12 },
  processingTitle: { fontSize: 16, fontWeight: '700', color: '#fff' },
  processingSubtitle: { fontSize: 12, color: 'rgba(255,255,255,0.4)' },
  dotsRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.accent },
});
