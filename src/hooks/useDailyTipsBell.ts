import { useCallback, useEffect, useState } from 'react';
import { fetchDailyTipsBroadcast, type DailyTipsBroadcast } from '../lib/supabaseDailyTips';
import {
  getLastSeenTipsAt,
  isTipsUnread,
  markTipsSeen,
  tipsHaveContent,
} from '../lib/dailyTipsNotifications';
import { isSupabaseConfigured } from '../lib/supabaseClient';

export function useDailyTipsBell(userId: string | undefined) {
  const [tips, setTips] = useState<DailyTipsBroadcast | null>(null);
  const [lastSeenAt, setLastSeenAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    if (!userId || !isSupabaseConfigured()) {
      setTips(null);
      setLastSeenAt(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [row, seen] = await Promise.all([
        fetchDailyTipsBroadcast().catch(() => null),
        getLastSeenTipsAt(userId),
      ]);
      setTips(row);
      setLastSeenAt(seen);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    void reload();
    const interval = setInterval(() => void reload(), 60_000);
    return () => clearInterval(interval);
  }, [reload]);

  const hasUnread = !loading && isTipsUnread(tips, lastSeenAt);

  const markRead = useCallback(async () => {
    if (!userId || !tips?.updated_at) return;
    await markTipsSeen(userId, tips.updated_at);
    setLastSeenAt(tips.updated_at);
  }, [userId, tips?.updated_at]);

  return {
    tips,
    hasUnread,
    hasTips: tipsHaveContent(tips),
    loading,
    reload,
    markRead,
  };
}
