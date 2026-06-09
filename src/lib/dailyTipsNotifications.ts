import AsyncStorage from '@react-native-async-storage/async-storage';
import type { DailyTipsBroadcast } from './supabaseDailyTips';

const STORAGE_PREFIX = '@derma/tips_seen/';

export function tipsHaveContent(row: DailyTipsBroadcast | null | undefined): boolean {
  if (!row) return false;
  return Boolean(
    row.tip1_title?.trim() ||
      row.tip1_body?.trim() ||
      row.tip2_title?.trim() ||
      row.tip2_body?.trim(),
  );
}

function storageKey(userId: string): string {
  return `${STORAGE_PREFIX}${userId}`;
}

export async function getLastSeenTipsAt(userId: string): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(storageKey(userId));
  } catch {
    return null;
  }
}

export async function markTipsSeen(userId: string, updatedAt: string | null): Promise<void> {
  if (!updatedAt) return;
  try {
    await AsyncStorage.setItem(storageKey(userId), updatedAt);
  } catch {
    // ignore storage errors
  }
}

export function isTipsUnread(
  row: DailyTipsBroadcast | null | undefined,
  lastSeenAt: string | null,
): boolean {
  if (!tipsHaveContent(row) || !row?.updated_at) return false;
  if (!lastSeenAt) return true;
  return new Date(row.updated_at).getTime() > new Date(lastSeenAt).getTime();
}
