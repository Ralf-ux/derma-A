import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Platform,
  TextInput, ScrollView, KeyboardAvoidingView, Animated, Easing, Image,
} from 'react-native';
import { Send, X, Bot } from 'lucide-react-native';
import { useApp } from '../AppContext';
import { COLORS, RADIUS, SHADOW } from '../styles';
import { getEnv } from '../lib/getEnv';

// OpenRouter — verified working free models (June 2026)
const OPENROUTER_API_KEY = getEnv('EXPO_PUBLIC_OPENROUTER_API_KEY') ?? '';
const OPENROUTER_URL     = 'https://openrouter.ai/api/v1/chat/completions';

// Primary: Meta Llama 3.3 70B — strong, free, great for chat and Q&A
const PRIMARY_MODEL  = 'meta-llama/llama-3.3-70b-instruct:free';
// Fallback: OpenAI OSS 20B — also free, good instruction following
const FALLBACK_MODEL = 'openai/gpt-oss-20b:free';

const SYSTEM_PROMPT = `You are DermaBot, an expert AI dermatology assistant integrated into the DermaScan mobile app.
Your role is to:
- Answer questions about skin conditions, symptoms, care routines, and ingredients
- Explain scan results in plain language when the user mentions them
- Give practical, evidence-based skincare advice
- Remind users that your responses are for educational purposes and not a substitute for professional medical diagnosis

Keep responses clear, concise, and friendly. Use bullet points or short paragraphs. Avoid overly technical jargon unless explaining it.
If a question is outside dermatology, gently redirect to skin-related topics.`;

const appIconForAll = require('../../asserts/appicon-for-all.png');

type Message = { role: 'bot' | 'user'; text: string };

async function callOpenRouter(history: Message[], newUserText: string): Promise<string> {
  const apiMessages: Array<{ role: string; content: string }> = [
    { role: 'system', content: SYSTEM_PROMPT },
    ...history.slice(-8).map((m) => ({
      role: m.role === 'user' ? 'user' : 'assistant',
      content: m.text,
    })),
    { role: 'user', content: newUserText },
  ];

  const headers: Record<string, string> = {
    'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
    'Content-Type': 'application/json',
    'X-Title': 'DermaScan',
  };

  const body = JSON.stringify({
    messages: apiMessages,
    max_tokens: 512,
    temperature: 0.7,
  });

  // Try primary model first, fall back automatically if it returns 404/503
  for (const model of [PRIMARY_MODEL, FALLBACK_MODEL]) {
    const response = await fetch(OPENROUTER_URL, {
      method: 'POST',
      headers,
      body: JSON.stringify({ ...JSON.parse(body), model }),
    });

    if (response.status === 404 || response.status === 503) {
      // Model unavailable — try next
      continue;
    }

    if (!response.ok) {
      const err = await response.text().catch(() => '');
      throw new Error(`API error ${response.status}: ${err}`);
    }

    const data = await response.json();
    const content = data?.choices?.[0]?.message?.content;
    if (!content) throw new Error('Empty response from AI');
    return content.trim();
  }

  throw new Error('All models unavailable. Please try again shortly.');
}

// Typing indicator dots
function TypingDots() {
  const dots = [0, 1, 2].map(() => useRef(new Animated.Value(0)).current);
  useEffect(() => {
    dots.forEach((anim, i) => {
      Animated.loop(
        Animated.sequence([
          Animated.delay(i * 160),
          Animated.timing(anim, { toValue: 1, duration: 300, useNativeDriver: true }),
          Animated.timing(anim, { toValue: 0, duration: 300, useNativeDriver: true }),
          Animated.delay(320),
        ]),
      ).start();
    });
  }, []);
  return (
    <View style={ts.typingRow}>
      {dots.map((anim, i) => (
        <Animated.View key={i} style={[ts.dot, { opacity: anim, transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [0, -4] }) }] }]} />
      ))}
    </View>
  );
}

export default function DermaBotWidget() {
  const { user } = useApp();
  const isPatient = user?.role === 'patient';

  const [open, setOpen]         = useState(false);
  const [question, setQuestion] = useState('');
  const [busy, setBusy]         = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { role: 'bot', text: `Hi ${user?.firstName || 'there'} 👋 I'm DermaBot, your AI skin health assistant. Ask me anything about skin conditions, care routines, or your scan results.` },
  ]);
  const scrollRef = useRef<ScrollView>(null);
  const fabScaleAnim  = useRef(new Animated.Value(1)).current;
  const panelAnim     = useRef(new Animated.Value(0)).current;

  // Auto-scroll on new message
  useEffect(() => {
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
  }, [messages, busy]);

  // Panel slide-up animation
  useEffect(() => {
    Animated.timing(panelAnim, {
      toValue: open ? 1 : 0,
      duration: 300,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [open]);

  const handleFabPress = () => {
    Animated.sequence([
      Animated.timing(fabScaleAnim, { toValue: 0.88, duration: 80, useNativeDriver: true }),
      Animated.spring(fabScaleAnim, { toValue: 1, friction: 4, tension: 140, useNativeDriver: true }),
    ]).start();
    setOpen((v) => !v);
  };

  const onSend = async () => {
    const trimmed = question.trim();
    if (!trimmed || busy) return;

    setQuestion('');
    setBusy(true);
    setMessages((prev) => [...prev, { role: 'user', text: trimmed }]);

    try {
      const reply = await callOpenRouter(messages, trimmed);
      setMessages((prev) => [...prev, { role: 'bot', text: reply }]);
    } catch (err: any) {
      const raw = String(err?.message ?? err ?? '');
      let errMsg: string;
      if (raw.includes('401') || raw.includes('403')) {
        errMsg = 'Authentication error — the API key may be invalid or expired.';
      } else if (raw.includes('429')) {
        errMsg = 'Too many requests. Please wait a moment and try again.';
      } else if (raw.includes('500') || raw.includes('502') || raw.includes('503')) {
        errMsg = 'The AI service is temporarily unavailable. Please try again in a moment.';
      } else if (raw.includes('Empty response')) {
        errMsg = 'The AI returned an empty response. Please try rephrasing your question.';
      } else {
        errMsg = `Something went wrong: ${raw || 'unknown error'}. Please try again.`;
      }
      setMessages((prev) => [...prev, { role: 'bot', text: errMsg }]);
    } finally {
      setBusy(false);
    }
  };

  const panelTranslateY = panelAnim.interpolate({ inputRange: [0, 1], outputRange: [60, 0] });
  const panelOpacity    = panelAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 1] });

  if (!isPatient) return null;

  return (
    <>
      {/* ── Floating action button ──────────────────────────────────────── */}
      <Animated.View style={[ts.fabWrap, { transform: [{ scale: fabScaleAnim }] }]}>
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={handleFabPress}
          style={[ts.fab, open && ts.fabOpen]}
        >
          {open ? (
            <X size={20} color={COLORS.primary} strokeWidth={2.5} />
          ) : (
            <>
              <Image source={appIconForAll} style={ts.fabIcon} resizeMode="contain" />
              <View style={ts.fabDot} />
            </>
          )}
        </TouchableOpacity>
        {!open && <Text style={ts.fabLabel}>DermaBot</Text>}
      </Animated.View>

      {/* ── Chat panel ─────────────────────────────────────────────────── */}
      {open && (
        <View style={ts.overlay} pointerEvents="box-none">
          <Animated.View style={[ts.panelOuter, { opacity: panelOpacity, transform: [{ translateY: panelTranslateY }] }]}>
            <KeyboardAvoidingView
              behavior={Platform.OS === 'ios' ? 'padding' : undefined}
              style={ts.panel}
            >
              {/* Header */}
              <View style={ts.header}>
                <View style={ts.headerLeft}>
                  <Image source={appIconForAll} style={ts.headerIcon} resizeMode="contain" />
                  <View>
                    <Text style={ts.headerTitle}>DermaBot</Text>
                    <View style={ts.onlinePill}>
                      <View style={ts.onlineDot} />
                      <Text style={ts.onlineText}>AI · Online</Text>
                    </View>
                  </View>
                </View>
                <TouchableOpacity onPress={() => setOpen(false)} style={ts.closeBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <X size={18} color={COLORS.textSecondary} />
                </TouchableOpacity>
              </View>

              {/* Messages */}
              <ScrollView
                ref={scrollRef}
                style={ts.messages}
                contentContainerStyle={ts.messagesInner}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
              >
                {messages.map((m, idx) => (
                  <View key={idx} style={[ts.msgRow, m.role === 'user' ? ts.msgRowUser : ts.msgRowBot]}>
                    {m.role === 'bot' && (
                      <View style={ts.botAvatar}>
                        <Bot size={13} color={COLORS.primary} strokeWidth={2.5} />
                      </View>
                    )}
                    <View style={[ts.bubble, m.role === 'user' ? ts.bubbleUser : ts.bubbleBot]}>
                      <Text style={[ts.msgText, m.role === 'user' ? ts.msgTextUser : ts.msgTextBot]}>
                        {m.text}
                      </Text>
                    </View>
                  </View>
                ))}
                {busy && (
                  <View style={[ts.msgRow, ts.msgRowBot]}>
                    <View style={ts.botAvatar}>
                      <Bot size={13} color={COLORS.primary} strokeWidth={2.5} />
                    </View>
                    <View style={[ts.bubble, ts.bubbleBot, ts.typingBubble]}>
                      <TypingDots />
                    </View>
                  </View>
                )}
              </ScrollView>

              {/* Quick suggestions (only if no conversation yet) */}
              {messages.length === 1 && !busy && (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={ts.suggestionsRow}>
                  {[
                    'What is eczema?',
                    'Best routine for acne?',
                    'Is SPF important daily?',
                    'What does melanoma look like?',
                  ].map((s) => (
                    <TouchableOpacity key={s} style={ts.suggestionChip} onPress={() => { setQuestion(s); }}>
                      <Text style={ts.suggestionText}>{s}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              )}

              {/* Composer */}
              <View style={ts.composer}>
                <TextInput
                  style={ts.input}
                  value={question}
                  onChangeText={setQuestion}
                  placeholder="Ask about your skin..."
                  placeholderTextColor={COLORS.textMuted}
                  multiline
                  editable={!busy}
                  onSubmitEditing={() => void onSend()}
                  returnKeyType="send"
                  blurOnSubmit={false}
                />
                <TouchableOpacity
                  onPress={() => void onSend()}
                  disabled={busy || !question.trim()}
                  style={[ts.sendBtn, (busy || !question.trim()) && ts.sendBtnDisabled]}
                  activeOpacity={0.8}
                >
                  <Send size={17} color="#fff" strokeWidth={2.5} />
                </TouchableOpacity>
              </View>
            </KeyboardAvoidingView>
          </Animated.View>
        </View>
      )}
    </>
  );
}

const ts = StyleSheet.create({
  // FAB
  fabWrap:    { position: 'absolute', right: 16, bottom: 110, alignItems: 'center', zIndex: 50 },
  fab:        {
    width: 54, height: 54, borderRadius: 18,
    backgroundColor: COLORS.surface,
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 1.5, borderColor: COLORS.border,
    ...SHADOW.strong,
  },
  fabOpen:    { backgroundColor: COLORS.accentMuted, borderColor: COLORS.primary },
  fabIcon:    { width: 34, height: 34, borderRadius: 10 },
  fabDot:     {
    position: 'absolute', top: 10, right: 10,
    width: 9, height: 9, borderRadius: 5,
    backgroundColor: COLORS.low,
    borderWidth: 1.5, borderColor: '#fff',
  },
  fabLabel:   { fontSize: 9, fontWeight: '800', color: COLORS.primary, marginTop: 5, letterSpacing: 0.3 },

  // Overlay + panel
  overlay:    { position: 'absolute', left: 0, right: 0, bottom: 0, top: 0, justifyContent: 'flex-end', zIndex: 60, pointerEvents: 'box-none' as any },
  panelOuter: { margin: 12, marginBottom: Platform.OS === 'ios' ? 100 : 90 },
  panel:      {
    backgroundColor: '#fff',
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    height: 500,
    overflow: 'hidden',
    ...SHADOW.strong,
  },

  // Header
  header:      {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: COLORS.borderLight,
    backgroundColor: COLORS.surfaceElevated,
  },
  headerLeft:  { flexDirection: 'row', alignItems: 'center', gap: 10 },
  headerIcon:  { width: 36, height: 36, borderRadius: 10 },
  headerTitle: { fontSize: 15, fontWeight: '800', color: COLORS.primary },
  onlinePill:  { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 1 },
  onlineDot:   { width: 6, height: 6, borderRadius: 3, backgroundColor: COLORS.low },
  onlineText:  { fontSize: 10, fontWeight: '600', color: COLORS.low },
  closeBtn:    { padding: 4 },

  // Messages
  messages:        { flex: 1 },
  messagesInner:   { padding: 14, gap: 10, paddingBottom: 6 },
  msgRow:          { flexDirection: 'row', alignItems: 'flex-end', gap: 6 },
  msgRowUser:      { justifyContent: 'flex-end' },
  msgRowBot:       { justifyContent: 'flex-start' },
  botAvatar:       {
    width: 26, height: 26, borderRadius: 8,
    backgroundColor: COLORS.accentMuted,
    justifyContent: 'center', alignItems: 'center',
    flexShrink: 0,
  },
  bubble:          { maxWidth: '78%', paddingHorizontal: 13, paddingVertical: 10, borderRadius: 16 },
  bubbleUser:      { backgroundColor: COLORS.primary, borderBottomRightRadius: 4 },
  bubbleBot:       { backgroundColor: COLORS.surfaceElevated, borderWidth: 1, borderColor: COLORS.borderLight, borderBottomLeftRadius: 4 },
  typingBubble:    { paddingVertical: 12 },
  msgText:         { fontSize: 13, lineHeight: 19, fontWeight: '500' },
  msgTextUser:     { color: '#fff' },
  msgTextBot:      { color: COLORS.text },

  // Typing dots
  typingRow:   { flexDirection: 'row', gap: 5, alignItems: 'center', height: 16 },
  dot:         { width: 7, height: 7, borderRadius: 4, backgroundColor: COLORS.primary },

  // Suggestions
  suggestionsRow: { paddingHorizontal: 14, paddingVertical: 10, gap: 8 },
  suggestionChip: {
    paddingHorizontal: 12, paddingVertical: 7,
    backgroundColor: COLORS.accentMuted,
    borderRadius: RADIUS.pill,
    borderWidth: 1, borderColor: COLORS.borderLight,
  },
  suggestionText: { fontSize: 11, fontWeight: '700', color: COLORS.primary },

  // Composer
  composer: {
    flexDirection: 'row', alignItems: 'flex-end', gap: 8,
    padding: 12,
    borderTopWidth: 1, borderTopColor: COLORS.borderLight,
    backgroundColor: '#fff',
  },
  input: {
    flex: 1, minHeight: 42, maxHeight: 100,
    borderWidth: 1, borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    paddingHorizontal: 13, paddingVertical: 10,
    backgroundColor: COLORS.surfaceElevated,
    fontSize: 13, fontWeight: '500', color: COLORS.text,
  },
  sendBtn:         {
    width: 42, height: 42,
    borderRadius: 13,
    backgroundColor: COLORS.primary,
    justifyContent: 'center', alignItems: 'center',
  },
  sendBtnDisabled: { opacity: 0.4 },
});
