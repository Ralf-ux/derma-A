/**
 * PreScanQuestionnaire.tsx
 *
 * A modal questionnaire that appears BEFORE the scan starts.
 * Collects brief patient intake information — body location, skin type,
 * symptom duration and any known triggers — so the AI model and the
 * resulting report have richer clinical context from the start.
 *
 * NOTE: DermaScan is NOT an expert medical system. It is a decision-support
 * tool intended to assist in the initial detection of skin conditions.
 * For a definitive diagnosis, always consult a qualified dermatologist.
 */

import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { AlertTriangle, CheckCircle, ChevronRight, ScanLine } from 'lucide-react-native';
import { COLORS, RADIUS, SHADOW } from '../styles';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface PreScanAnswer {
  questionId: string;
  questionText: string;
  answer: string | string[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Question bank
// ─────────────────────────────────────────────────────────────────────────────

interface Question {
  id: string;
  text: string;
  type: 'single' | 'multi' | 'text';
  options?: string[];
  hint?: string;
}

const PRE_SCAN_QUESTIONS: Question[] = [
  {
    id: 'body_location',
    text: 'Where on your body is the affected area?',
    type: 'single',
    options: [
      'Face / scalp',
      'Neck',
      'Chest / back',
      'Arm / elbow',
      'Hand / wrist / fingers',
      'Leg / knee',
      'Foot / ankle / toes',
      'Groin / genitals',
      'Other / multiple areas',
    ],
  },
  {
    id: 'skin_type',
    text: 'How would you describe your skin type?',
    type: 'single',
    options: [
      'Very fair / pale',
      'Fair',
      'Medium / olive',
      'Brown',
      'Dark brown',
      'Very dark',
    ],
    hint: 'Skin tone helps calibrate the AI analysis.',
  },
  {
    id: 'symptom_onset',
    text: 'When did you first notice this condition?',
    type: 'single',
    options: [
      'Today',
      '2–6 days ago',
      '1–4 weeks ago',
      '1–6 months ago',
      'More than 6 months ago',
      "I'm not sure",
    ],
  },
  {
    id: 'current_symptoms',
    text: 'Which symptoms are you currently experiencing? (Select all that apply)',
    type: 'multi',
    options: [
      'Itching',
      'Pain or tenderness',
      'Burning sensation',
      'Swelling',
      'Redness',
      'Peeling or flaking',
      'Oozing or discharge',
      'No noticeable symptoms',
    ],
  },
  {
    id: 'known_triggers',
    text: 'Do you suspect any possible cause or trigger?',
    type: 'multi',
    options: [
      'New skincare / cosmetic product',
      'New medication',
      'Allergic reaction / contact',
      'Sun / UV exposure',
      'Stress or illness',
      'Insect bite or injury',
      'Unknown',
    ],
  },
  {
    id: 'previous_condition',
    text: 'Have you ever been diagnosed with a skin condition before?',
    type: 'single',
    options: [
      'Yes — same condition recurring',
      'Yes — different condition',
      'No previous skin diagnosis',
      "I'm not sure",
    ],
  },
  {
    id: 'additional_context',
    text: "Anything else you'd like to tell the AI before it analyzes your photo?",
    type: 'text',
    hint: 'Optional — e.g. "I have diabetes", "I\'m pregnant", "on antibiotics".',
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────────────────────

interface PreScanQuestionnaireProps {
  visible: boolean;
  /** Called when the user completes all questions */
  onComplete: (answers: PreScanAnswer[]) => void;
  /** Called when the user skips the questionnaire entirely */
  onSkip: () => void;
}

export default function PreScanQuestionnaire({
  visible,
  onComplete,
  onSkip,
}: PreScanQuestionnaireProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string | string[]>>({});
  const [textValue, setTextValue] = useState('');

  const slideAnim = useRef(new Animated.Value(50)).current;
  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const cardAnim  = useRef(new Animated.Value(0)).current;

  // Reset + animate in each time the modal opens
  useEffect(() => {
    if (visible) {
      setCurrentIndex(0);
      setAnswers({});
      setTextValue('');
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1, duration: 320, useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0, duration: 400,
          easing: Easing.out(Easing.cubic), useNativeDriver: true,
        }),
      ]).start();
    } else {
      fadeAnim.setValue(0);
      slideAnim.setValue(50);
    }
  }, [visible]);

  const animateCard = (direction: 'forward' | 'back') => {
    const start = direction === 'forward' ? 32 : -32;
    cardAnim.setValue(start);
    Animated.timing(cardAnim, {
      toValue: 0, duration: 260,
      easing: Easing.out(Easing.cubic), useNativeDriver: true,
    }).start();
  };

  const currentQuestion = PRE_SCAN_QUESTIONS[currentIndex];
  const progress = (currentIndex + 1) / PRE_SCAN_QUESTIONS.length;
  const currentAnswer = answers[currentQuestion.id];

  const canAdvance = (): boolean => {
    if (currentQuestion.type === 'text') return true; // always optional
    if (currentQuestion.type === 'single') return typeof currentAnswer === 'string';
    if (currentQuestion.type === 'multi') return Array.isArray(currentAnswer) && currentAnswer.length > 0;
    return false;
  };

  const handleOptionSelect = (option: string) => {
    if (currentQuestion.type === 'single') {
      setAnswers(prev => ({ ...prev, [currentQuestion.id]: option }));
    } else if (currentQuestion.type === 'multi') {
      setAnswers(prev => {
        const existing = (prev[currentQuestion.id] as string[] | undefined) ?? [];
        const next = existing.includes(option)
          ? existing.filter(o => o !== option)
          : [...existing, option];
        return { ...prev, [currentQuestion.id]: next };
      });
    }
  };

  const handleNext = () => {
    // Commit text before advancing
    if (currentQuestion.type === 'text') {
      setAnswers(prev => ({ ...prev, [currentQuestion.id]: textValue.trim() }));
    }

    if (currentIndex < PRE_SCAN_QUESTIONS.length - 1) {
      setCurrentIndex(i => i + 1);
      animateCard('forward');
      if (currentQuestion.type === 'text') setTextValue('');
    } else {
      // Last question — build result
      const finalAnswers =
        currentQuestion.type === 'text'
          ? { ...answers, [currentQuestion.id]: textValue.trim() }
          : answers;

      const result: PreScanAnswer[] = PRE_SCAN_QUESTIONS.map(q => ({
        questionId: q.id,
        questionText: q.text,
        answer: finalAnswers[q.id] ?? (q.type === 'multi' ? [] : ''),
      })).filter(a => {
        const v = a.answer;
        if (typeof v === 'string') return v.length > 0;
        if (Array.isArray(v)) return v.length > 0;
        return false;
      });

      onComplete(result);
    }
  };

  const handleBack = () => {
    if (currentIndex > 0) {
      setCurrentIndex(i => i - 1);
      animateCard('back');
      const prevQ = PRE_SCAN_QUESTIONS[currentIndex - 1];
      if (prevQ.type === 'text') {
        setTextValue((answers[prevQ.id] as string) ?? '');
      }
    }
  };

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onSkip}>
      <Animated.View style={[styles.overlay, { opacity: fadeAnim }]}>
        <Animated.View style={[styles.sheet, { transform: [{ translateY: slideAnim }] }]}>

          {/* ── Header ── */}
          <View style={styles.header}>
            <View style={styles.headerIconWrap}>
              <ScanLine size={18} color={COLORS.primary} />
            </View>
            <View style={styles.headerCenter}>
              <Text style={styles.headerTitle}>Pre-Scan Check-In</Text>
              <Text style={styles.headerSub}>
                Question {currentIndex + 1} of {PRE_SCAN_QUESTIONS.length}
              </Text>
            </View>
            <TouchableOpacity onPress={onSkip} style={styles.skipBtn} activeOpacity={0.75}>
              <Text style={styles.skipText}>Skip all</Text>
            </TouchableOpacity>
          </View>

          {/* ── Disclaimer ── */}
          <View style={styles.disclaimer}>
            <AlertTriangle size={12} color="#d97706" />
            <Text style={styles.disclaimerText}>
              Your answers help the AI provide better context. This is not a medical consultation.
              Always consult a dermatologist for a definitive diagnosis.
            </Text>
          </View>

          {/* ── Progress bar ── */}
          <View style={styles.progressBg}>
            <View style={[styles.progressFill, { width: `${progress * 100}%` as any }]} />
          </View>

          {/* ── Question card ── */}
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <Animated.View style={{ transform: [{ translateX: cardAnim }] }}>
              <Text style={styles.questionText}>{currentQuestion.text}</Text>
              {currentQuestion.hint ? (
                <Text style={styles.hintText}>{currentQuestion.hint}</Text>
              ) : null}

              {/* Single / Multi choice */}
              {(currentQuestion.type === 'single' || currentQuestion.type === 'multi') &&
                currentQuestion.options?.map(opt => {
                  const isSelected =
                    currentQuestion.type === 'single'
                      ? currentAnswer === opt
                      : Array.isArray(currentAnswer) && currentAnswer.includes(opt);
                  return (
                    <TouchableOpacity
                      key={opt}
                      style={[styles.optionBtn, isSelected && styles.optionBtnActive]}
                      onPress={() => handleOptionSelect(opt)}
                      activeOpacity={0.75}
                    >
                      <View style={[styles.optionDot, isSelected && styles.optionDotActive]}>
                        {isSelected && <CheckCircle size={11} color="#fff" />}
                      </View>
                      <Text style={[styles.optionText, isSelected && styles.optionTextActive]}>
                        {opt}
                      </Text>
                    </TouchableOpacity>
                  );
                })}

              {/* Free text */}
              {currentQuestion.type === 'text' && (
                <TextInput
                  style={styles.textInput}
                  multiline
                  numberOfLines={4}
                  placeholder="Type here (optional)…"
                  placeholderTextColor="#9ca3af"
                  value={textValue}
                  onChangeText={setTextValue}
                />
              )}
            </Animated.View>
          </ScrollView>

          {/* ── Footer ── */}
          <View style={styles.footer}>
            {currentIndex > 0 ? (
              <TouchableOpacity style={styles.backBtn} onPress={handleBack} activeOpacity={0.8}>
                <Text style={styles.backBtnText}>← Back</Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.backBtnPlaceholder} />
            )}

            <TouchableOpacity
              style={[styles.nextBtn, !canAdvance() && styles.nextBtnDisabled]}
              onPress={handleNext}
              disabled={!canAdvance()}
              activeOpacity={0.85}
            >
              <Text style={styles.nextBtnText}>
                {currentIndex === PRE_SCAN_QUESTIONS.length - 1 ? 'Start Scan' : 'Next'}
              </Text>
              {currentIndex < PRE_SCAN_QUESTIONS.length - 1 && (
                <ChevronRight size={15} color="#fff" />
              )}
            </TouchableOpacity>
          </View>

        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    maxHeight: '92%',
    paddingBottom: Platform.OS === 'ios' ? 34 : 24,
    ...SHADOW.strong,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 12,
  },
  headerIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: COLORS.accentMuted,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerCenter: { flex: 1 },
  headerTitle: { fontSize: 16, fontWeight: '800', color: COLORS.primary },
  headerSub:   { fontSize: 11, color: '#9ca3af', marginTop: 1 },
  skipBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: RADIUS.pill,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  skipText: { fontSize: 11, fontWeight: '700', color: COLORS.textMuted },

  // Disclaimer
  disclaimer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginHorizontal: 20,
    marginBottom: 12,
    backgroundColor: 'rgba(217,119,6,0.07)',
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: 'rgba(217,119,6,0.18)',
  },
  disclaimerText: {
    flex: 1,
    fontSize: 10,
    color: '#92400e',
    lineHeight: 15,
  },

  // Progress
  progressBg: {
    height: 3,
    backgroundColor: '#e5e7eb',
    marginHorizontal: 20,
    borderRadius: 2,
    marginBottom: 18,
    overflow: 'hidden',
  },
  progressFill: {
    height: 3,
    backgroundColor: COLORS.primary,
    borderRadius: 2,
  },

  // Scroll
  scroll: { maxHeight: 400 },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 12 },

  // Question
  questionText: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.text,
    lineHeight: 22,
    marginBottom: 6,
  },
  hintText: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginBottom: 14,
    fontStyle: 'italic',
  },

  // Options
  optionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#f9fafb',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(0,77,64,0.06)',
  },
  optionBtnActive: {
    backgroundColor: 'rgba(0,77,64,0.07)',
    borderColor: COLORS.primary,
  },
  optionDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#d1d5db',
    justifyContent: 'center',
    alignItems: 'center',
  },
  optionDotActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  optionText:       { flex: 1, fontSize: 13, color: '#4b5563', fontWeight: '500' },
  optionTextActive: { color: COLORS.primary, fontWeight: '700' },

  // Text input
  textInput: {
    backgroundColor: '#f9fafb',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(0,77,64,0.08)',
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 13,
    color: COLORS.text,
    minHeight: 100,
    textAlignVertical: 'top',
  },

  // Footer
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  backBtn: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: '#f3f4f6',
  },
  backBtnPlaceholder: { width: 80 },
  backBtnText: { fontSize: 13, fontWeight: '700', color: '#6b7280' },
  nextBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.primary,
    paddingVertical: 13,
    paddingHorizontal: 24,
    borderRadius: 14,
  },
  nextBtnDisabled: { opacity: 0.4 },
  nextBtnText: { fontSize: 14, fontWeight: '800', color: '#fff' },
});
