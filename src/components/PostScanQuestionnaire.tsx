/**
 * PostScanQuestionnaire.tsx
 *
 * A modal questionnaire that appears immediately after a scan result is ready.
 * Questions are tailored to the detected condition category / keywords so that
 * the user's symptom report can be combined with the image-based AI diagnosis
 * to produce a more accurate clinical summary in the PDF report.
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
import { AlertTriangle, CheckCircle, ChevronRight, X } from 'lucide-react-native';
import { COLORS, RADIUS, SHADOW } from '../styles';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type QuestionType = 'single' | 'multi' | 'text' | 'scale';

export interface Question {
  id: string;
  text: string;
  type: QuestionType;
  options?: string[];   // for single / multi
  scaleMin?: number;    // for scale
  scaleMax?: number;
  scaleLabels?: [string, string]; // [minLabel, maxLabel]
}

export interface QuestionnaireAnswer {
  questionId: string;
  questionText: string;
  answer: string | string[] | number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Question bank — organised by condition keyword bucket
// ─────────────────────────────────────────────────────────────────────────────

const COMMON_QUESTIONS: Question[] = [
  {
    id: 'duration',
    text: 'How long have you had this skin condition?',
    type: 'single',
    options: ['Less than a week', '1–4 weeks', '1–3 months', 'More than 3 months', "I don't know"],
  },
  {
    id: 'pain_level',
    text: 'How would you rate any pain or discomfort in the affected area?',
    type: 'scale',
    scaleMin: 0,
    scaleMax: 10,
    scaleLabels: ['None', 'Severe'],
  },
  {
    id: 'spread',
    text: 'Has the affected area changed in size or spread to new areas recently?',
    type: 'single',
    options: ['Yes, it has grown / spread', 'No, it is stable', "I'm not sure"],
  },
  {
    id: 'prior_treatment',
    text: 'Have you applied any treatment to the area? (e.g. cream, ointment, medication)',
    type: 'single',
    options: ['Yes, with improvement', 'Yes, without improvement', 'No treatment applied'],
  },
];

const CANCER_QUESTIONS: Question[] = [
  {
    id: 'lesion_change',
    text: 'Has the lesion changed color, shape, or size over time?',
    type: 'single',
    options: ['Yes — noticeable change', 'Slightly', 'No change', "I'm not sure"],
  },
  {
    id: 'border_irregularity',
    text: 'How would you describe the borders of the lesion?',
    type: 'single',
    options: ['Regular / smooth', 'Irregular / jagged', 'Blurred / indistinct', "I can't tell"],
  },
  {
    id: 'multiple_colors',
    text: 'Does the lesion contain multiple colors (e.g. brown, black, red, white)?',
    type: 'single',
    options: ['Yes, multiple colors', 'One uniform color', "I'm not sure"],
  },
  {
    id: 'family_history',
    text: 'Is there a family history of skin cancer?',
    type: 'single',
    options: ['Yes', 'No', "I don't know"],
  },
  {
    id: 'sun_exposure',
    text: 'How much sun exposure does the affected area typically receive?',
    type: 'single',
    options: ['High (outdoor / minimal protection)', 'Moderate', 'Low (mostly covered / indoors)'],
  },
];

const INFECTION_QUESTIONS: Question[] = [
  {
    id: 'itch',
    text: 'Is the area itchy or irritated?',
    type: 'single',
    options: ['Severely itchy', 'Mildly itchy', 'Burning sensation', 'No itch'],
  },
  {
    id: 'discharge',
    text: 'Is there any discharge, pus, or weeping from the area?',
    type: 'single',
    options: ['Yes, with pus / discharge', 'Slight oozing', 'No discharge'],
  },
  {
    id: 'fever',
    text: 'Have you experienced any fever or flu-like symptoms recently?',
    type: 'single',
    options: ['Yes, fever above 38 °C', 'Mild fever / feeling unwell', 'No fever'],
  },
  {
    id: 'contagion',
    text: 'Have people you are in close contact with developed similar symptoms?',
    type: 'single',
    options: ['Yes', 'No', "I don't know"],
  },
  {
    id: 'triggers',
    text: 'Do you suspect any trigger that caused or worsened the condition?',
    type: 'multi',
    options: ['Contact with animals / pets', 'New soap / detergent / cosmetic', 'Dietary change', 'Stress', 'Outdoor / nature exposure', 'No identified trigger'],
  },
];

const WOUND_QUESTIONS: Question[] = [
  {
    id: 'bleeding',
    text: 'Is the wound actively bleeding or oozing?',
    type: 'single',
    options: ['Yes, actively bleeding', 'Slight oozing', 'No active bleeding'],
  },
  {
    id: 'wound_cause',
    text: 'How did the wound occur?',
    type: 'single',
    options: ['Accidental cut / abrasion', 'Burn', 'Chronic ulcer / sore', 'Unknown origin', 'Other'],
  },
  {
    id: 'infection_signs',
    text: 'Are there signs of infection around the wound? (redness, warmth, swelling)',
    type: 'single',
    options: ['Yes, clear signs of infection', 'Mild redness only', 'No infection signs'],
  },
  {
    id: 'healing_progress',
    text: 'How is the wound healing?',
    type: 'single',
    options: ['Healing normally', 'Slow to heal', 'Not healing / worsening'],
  },
];

const LESION_QUESTIONS: Question[] = [
  {
    id: 'texture',
    text: 'How would you describe the texture of the affected skin?',
    type: 'single',
    options: ['Rough / scaly', 'Smooth / flat', 'Raised / bumpy', 'Crusty', 'Normal texture'],
  },
  {
    id: 'itch_lesion',
    text: 'Is the area itchy?',
    type: 'single',
    options: ['Yes, constantly', 'Occasionally', 'No'],
  },
  {
    id: 'stress_link',
    text: 'Do symptoms seem to worsen with stress or fatigue?',
    type: 'single',
    options: ['Yes, noticeably', 'Sometimes', 'No', "I'm not sure"],
  },
  {
    id: 'known_condition',
    text: 'Have you been previously diagnosed with a skin condition?',
    type: 'single',
    options: ['Yes (psoriasis, eczema, dermatitis, etc.)', 'Yes (other condition)', 'No previous diagnosis'],
  },
];

const ADDITIONAL_QUESTION: Question = {
  id: 'additional_info',
  text: 'Is there anything else you would like to share about your symptoms or medical history?',
  type: 'text',
};

/** Select questions based on the diagnosis type string. */
function buildQuestionSet(diagnosisType: string): Question[] {
  const lower = (diagnosisType ?? '').toLowerCase();
  let specific: Question[] = [];

  if (
    lower.includes('cancer') ||
    lower.includes('melanoma') ||
    lower.includes('carcinoma') ||
    lower.includes('malignant') ||
    lower.includes('keratosis') ||
    lower.includes('neoplasm') ||
    lower.includes('lentigo') ||
    lower.includes('basal cell') ||
    lower.includes('squamous')
  ) {
    specific = CANCER_QUESTIONS;
  } else if (
    lower.includes('infection') ||
    lower.includes('fungal') ||
    lower.includes('bacterial') ||
    lower.includes('viral') ||
    lower.includes('tinea') ||
    lower.includes('herpes') ||
    lower.includes('scabies') ||
    lower.includes('acne') ||
    lower.includes('folliculitis') ||
    lower.includes('wart') ||
    lower.includes('verruca') ||
    lower.includes('varicella') ||
    lower.includes('cellulitis') ||
    lower.includes('abscess')
  ) {
    specific = INFECTION_QUESTIONS;
  } else if (
    lower.includes('wound') ||
    lower.includes('ulcer') ||
    lower.includes('burn') ||
    lower.includes('bleed') ||
    lower.includes('lacerat') ||
    lower.includes('abrasion') ||
    lower.includes('stasis')
  ) {
    specific = WOUND_QUESTIONS;
  } else {
    specific = LESION_QUESTIONS;
  }

  return [...COMMON_QUESTIONS, ...specific, ADDITIONAL_QUESTION];
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers to format answers for the PDF
// ─────────────────────────────────────────────────────────────────────────────

export function formatAnswersForPDF(answers: QuestionnaireAnswer[]): string {
  if (!answers || answers.length === 0) return 'No questionnaire responses recorded.';
  return answers
    .map((a) => {
      const val = Array.isArray(a.answer)
        ? a.answer.join(', ')
        : String(a.answer);
      return `• ${a.questionText}\n  → ${val}`;
    })
    .join('\n\n');
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────────────────

function ScaleInput({
  question,
  value,
  onChange,
}: {
  question: Question;
  value: number | undefined;
  onChange: (v: number) => void;
}) {
  const min = question.scaleMin ?? 0;
  const max = question.scaleMax ?? 10;
  const steps = Array.from({ length: max - min + 1 }, (_, i) => i + min);
  return (
    <View>
      <View style={scaleStyles.row}>
        {steps.map((s) => (
          <TouchableOpacity
            key={s}
            onPress={() => onChange(s)}
            style={[
              scaleStyles.cell,
              value === s && scaleStyles.cellActive,
              s === min && scaleStyles.cellFirst,
              s === max && scaleStyles.cellLast,
            ]}
            activeOpacity={0.75}
          >
            <Text style={[scaleStyles.cellText, value === s && scaleStyles.cellTextActive]}>
              {s}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      {question.scaleLabels && (
        <View style={scaleStyles.labels}>
          <Text style={scaleStyles.labelText}>{question.scaleLabels[0]}</Text>
          <Text style={scaleStyles.labelText}>{question.scaleLabels[1]}</Text>
        </View>
      )}
    </View>
  );
}

const scaleStyles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  cell: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  cellActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  cellFirst: { borderTopLeftRadius: 10, borderBottomLeftRadius: 10 },
  cellLast: { borderTopRightRadius: 10, borderBottomRightRadius: 10 },
  cellText: { fontSize: 13, fontWeight: '700', color: '#6b7280' },
  cellTextActive: { color: '#fff' },
  labels: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
  labelText: { fontSize: 10, color: '#9ca3af' },
});

// ─────────────────────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────────────────────

interface PostScanQuestionnaireProps {
  visible: boolean;
  diagnosisType: string;
  diagnosisSeverity: 'low' | 'medium' | 'high';
  onComplete: (answers: QuestionnaireAnswer[]) => void;
  onSkip: () => void;
}

export default function PostScanQuestionnaire({
  visible,
  diagnosisType,
  diagnosisSeverity,
  onComplete,
  onSkip,
}: PostScanQuestionnaireProps) {
  const questions = buildQuestionSet(diagnosisType);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string | string[] | number>>({});
  const [textValue, setTextValue] = useState('');

  const slideAnim = useRef(new Animated.Value(40)).current;
  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const cardAnim  = useRef(new Animated.Value(0)).current;

  // Reset when modal opens
  useEffect(() => {
    if (visible) {
      setCurrentIndex(0);
      setAnswers({});
      setTextValue('');
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 350, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: 0, duration: 400, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      ]).start();
    }
  }, [visible]);

  // Animate card transition when question changes
  const animateCard = (direction: 'forward' | 'back') => {
    const start = direction === 'forward' ? 30 : -30;
    cardAnim.setValue(start);
    Animated.timing(cardAnim, {
      toValue: 0,
      duration: 280,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  };

  const currentQuestion = questions[currentIndex];
  const progress = (currentIndex + 1) / questions.length;

  const currentAnswer = answers[currentQuestion.id];

  const canAdvance = (): boolean => {
    const a = answers[currentQuestion.id];
    if (currentQuestion.type === 'text') return true; // text is always optional
    if (currentQuestion.type === 'scale') return a !== undefined;
    if (currentQuestion.type === 'single') return typeof a === 'string';
    if (currentQuestion.type === 'multi') return Array.isArray(a) && a.length > 0;
    return false;
  };

  const handleOptionSelect = (option: string) => {
    if (currentQuestion.type === 'single') {
      setAnswers((prev) => ({ ...prev, [currentQuestion.id]: option }));
    } else if (currentQuestion.type === 'multi') {
      setAnswers((prev) => {
        const existing = (prev[currentQuestion.id] as string[] | undefined) ?? [];
        const next = existing.includes(option)
          ? existing.filter((o) => o !== option)
          : [...existing, option];
        return { ...prev, [currentQuestion.id]: next };
      });
    }
  };

  const handleScaleSelect = (v: number) => {
    setAnswers((prev) => ({ ...prev, [currentQuestion.id]: v }));
  };

  const handleNext = () => {
    // Commit text answer before advancing
    if (currentQuestion.type === 'text') {
      setAnswers((prev) => ({ ...prev, [currentQuestion.id]: textValue.trim() }));
    }

    if (currentIndex < questions.length - 1) {
      setCurrentIndex((i) => i + 1);
      animateCard('forward');
      if (currentQuestion.type === 'text') setTextValue('');
    } else {
      // Last question — finalise
      const finalAnswers = currentQuestion.type === 'text'
        ? { ...answers, [currentQuestion.id]: textValue.trim() }
        : answers;

      const result: QuestionnaireAnswer[] = questions
        .map((q) => ({
          questionId: q.id,
          questionText: q.text,
          answer: finalAnswers[q.id] ?? (q.type === 'multi' ? [] : ''),
        }))
        .filter((a) => {
          const v = a.answer;
          if (typeof v === 'string') return v.length > 0;
          if (Array.isArray(v)) return v.length > 0;
          return v !== undefined;
        });

      onComplete(result);
    }
  };

  const handleBack = () => {
    if (currentIndex > 0) {
      setCurrentIndex((i) => i - 1);
      animateCard('back');
      // Restore text value if going back to a text question
      const prevQ = questions[currentIndex - 1];
      if (prevQ.type === 'text') {
        setTextValue((answers[prevQ.id] as string) ?? '');
      }
    }
  };

  const sevColor =
    diagnosisSeverity === 'high' ? '#ef4444' :
    diagnosisSeverity === 'medium' ? '#f59e0b' : '#10b981';

  const sevLabel =
    diagnosisSeverity === 'high' ? 'High risk' :
    diagnosisSeverity === 'medium' ? 'Moderate risk' : 'Low risk';

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onSkip}>
      <Animated.View style={[styles.overlay, { opacity: fadeAnim }]}>
        <Animated.View
          style={[
            styles.sheet,
            { transform: [{ translateY: slideAnim }] },
          ]}
        >
          {/* ── Header ── */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Text style={styles.headerTitle}>Symptom Assessment</Text>
              <Text style={styles.headerSub}>
                {currentIndex + 1} of {questions.length}
              </Text>
            </View>
            <TouchableOpacity onPress={onSkip} style={styles.skipBtn} activeOpacity={0.75}>
              <X size={18} color="#9ca3af" />
            </TouchableOpacity>
          </View>

          {/* ── Disclaimer banner ── */}
          <View style={styles.disclaimer}>
            <AlertTriangle size={13} color="#d97706" />
            <Text style={styles.disclaimerText}>
              DermaScan is a decision-support tool, not a medical expert system. Your answers help
              improve the report accuracy. For a definitive diagnosis, consult a qualified
              dermatologist.
            </Text>
          </View>

          {/* ── Diagnosis badge ── */}
          <View style={styles.diagBadge}>
            <View style={[styles.diagDot, { backgroundColor: sevColor }]} />
            <Text style={styles.diagType} numberOfLines={1}>{diagnosisType}</Text>
            <Text style={[styles.diagSev, { color: sevColor }]}>{sevLabel}</Text>
          </View>

          {/* ── Progress bar ── */}
          <View style={styles.progressBg}>
            <Animated.View style={[styles.progressFill, { width: `${progress * 100}%` as any }]} />
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

              {/* Single / Multi choice */}
              {(currentQuestion.type === 'single' || currentQuestion.type === 'multi') &&
                currentQuestion.options?.map((opt) => {
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
                        {isSelected && <CheckCircle size={12} color="#fff" />}
                      </View>
                      <Text style={[styles.optionText, isSelected && styles.optionTextActive]}>
                        {opt}
                      </Text>
                    </TouchableOpacity>
                  );
                })}

              {/* Scale */}
              {currentQuestion.type === 'scale' && (
                <ScaleInput
                  question={currentQuestion}
                  value={typeof currentAnswer === 'number' ? currentAnswer : undefined}
                  onChange={handleScaleSelect}
                />
              )}

              {/* Free text */}
              {currentQuestion.type === 'text' && (
                <TextInput
                  style={styles.textInput}
                  multiline
                  numberOfLines={4}
                  placeholder="Type here (optional)..."
                  placeholderTextColor="#9ca3af"
                  value={textValue}
                  onChangeText={setTextValue}
                />
              )}
            </Animated.View>
          </ScrollView>

          {/* ── Footer navigation ── */}
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
                {currentIndex === questions.length - 1 ? 'Finish' : 'Next'}
              </Text>
              {currentIndex < questions.length - 1 && (
                <ChevronRight size={16} color="#fff" />
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
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    maxHeight: '92%',
    paddingBottom: Platform.OS === 'ios' ? 34 : 24,
    ...SHADOW.soft,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 12,
  },
  headerLeft: { gap: 2 },
  headerTitle: { fontSize: 18, fontWeight: '800', color: COLORS.primary },
  headerSub: { fontSize: 11, color: '#9ca3af' },
  skipBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  disclaimer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginHorizontal: 24,
    marginBottom: 12,
    backgroundColor: 'rgba(217,119,6,0.08)',
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: 'rgba(217,119,6,0.2)',
  },
  disclaimerText: {
    flex: 1,
    fontSize: 10,
    color: '#92400e',
    lineHeight: 15,
  },
  diagBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 24,
    marginBottom: 10,
    backgroundColor: 'rgba(0,77,64,0.05)',
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: 'rgba(0,77,64,0.08)',
  },
  diagDot: { width: 8, height: 8, borderRadius: 4 },
  diagType: { flex: 1, fontSize: 12, fontWeight: '700', color: COLORS.primary },
  diagSev: { fontSize: 11, fontWeight: '700' },
  progressBg: {
    height: 3,
    backgroundColor: '#e5e7eb',
    marginHorizontal: 24,
    borderRadius: 2,
    marginBottom: 16,
    overflow: 'hidden',
  },
  progressFill: {
    height: 3,
    backgroundColor: COLORS.primary,
    borderRadius: 2,
  },
  scroll: { maxHeight: 380 },
  scrollContent: { paddingHorizontal: 24, paddingBottom: 12 },
  questionText: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.text,
    lineHeight: 22,
    marginBottom: 16,
  },
  optionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#f9fafb',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 13,
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
  optionText: { flex: 1, fontSize: 13, color: '#4b5563', fontWeight: '500' },
  optionTextActive: { color: COLORS.primary, fontWeight: '700' },
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
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
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
