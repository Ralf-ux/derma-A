import { supabase } from './supabase/client';

export interface DailyTipsBroadcast {
  id: number;
  tip1_title: string | null;
  tip1_body: string | null;
  tip2_title: string | null;
  tip2_body: string | null;
  updated_at: string | null;
}

export async function fetchDailyTipsBroadcast(): Promise<DailyTipsBroadcast | null> {
  const { data, error } = await supabase.from('daily_tips_broadcast').select('*').eq('id', 1).maybeSingle();
  if (error) throw error;
  return data as DailyTipsBroadcast | null;
}

export async function saveDailyTipsBroadcast(payload: {
  tip1_title: string;
  tip1_body: string;
  tip2_title: string;
  tip2_body: string;
}) {
  const { error } = await supabase.from('daily_tips_broadcast').upsert(
    {
      id: 1,
      tip1_title: payload.tip1_title,
      tip1_body: payload.tip1_body,
      tip2_title: payload.tip2_title,
      tip2_body: payload.tip2_body,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'id' },
  );
  if (error) throw error;
}
