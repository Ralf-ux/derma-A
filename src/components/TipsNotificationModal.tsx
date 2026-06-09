import React from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { X, Sparkles } from 'lucide-react-native';
import { COLORS, SHADOW, RADIUS } from '../styles';
import type { DailyTipsBroadcast } from '../lib/supabaseDailyTips';
import { tipsHaveContent } from '../lib/dailyTipsNotifications';

type Props = {
  visible: boolean;
  tips: DailyTipsBroadcast | null;
  onClose: () => void;
};

export default function TipsNotificationModal({ visible, tips, onClose }: Props) {
  const items = [
    tips?.tip1_title?.trim() || tips?.tip1_body?.trim()
      ? { title: tips?.tip1_title?.trim() || 'Tip 1', body: tips?.tip1_body?.trim() || '' }
      : null,
    tips?.tip2_title?.trim() || tips?.tip2_body?.trim()
      ? { title: tips?.tip2_title?.trim() || 'Tip 2', body: tips?.tip2_body?.trim() || '' }
      : null,
  ].filter(Boolean) as { title: string; body: string }[];

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <View style={styles.iconWrap}>
                <Sparkles size={18} color={COLORS.primary} />
              </View>
              <Text style={styles.title}>Daily care tips</Text>
            </View>
            <TouchableOpacity onPress={onClose} hitSlop={12} style={styles.closeBtn}>
              <X size={20} color="#6b7280" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
            {!tipsHaveContent(tips) ? (
              <Text style={styles.empty}>No tips published yet. Check back later.</Text>
            ) : (
              items.map((item, i) => (
                <View key={i} style={styles.tipBlock}>
                  <Text style={styles.tipTitle}>{item.title}</Text>
                  <Text style={styles.tipBody}>{item.body}</Text>
                </View>
              ))
            )}
          </ScrollView>

          <TouchableOpacity style={styles.doneBtn} onPress={onClose} activeOpacity={0.88}>
            <Text style={styles.doneBtnText}>Got it</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    padding: 20,
    maxHeight: '80%',
    ...SHADOW.card,
  },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: 'rgba(0, 77, 64, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: { fontSize: 17, fontWeight: '700', color: COLORS.text },
  closeBtn: { padding: 4 },
  scroll: { maxHeight: 320 },
  empty: { fontSize: 14, color: COLORS.textSecondary, lineHeight: 21 },
  tipBlock: {
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.md,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  tipTitle: { fontSize: 14, fontWeight: '700', color: COLORS.primary, marginBottom: 6 },
  tipBody: { fontSize: 13, color: COLORS.textSecondary, lineHeight: 20 },
  doneBtn: {
    marginTop: 16,
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.md,
    paddingVertical: 14,
    alignItems: 'center',
  },
  doneBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
