import { supabase } from './supabaseClient';
import type { ScanRecord } from '../db';

export async function uploadScanRow(params: {
  userId: string;
  record: ScanRecord;
}) {
  const { userId, record } = params;

  const { error } = await supabase.from('scans').insert({
    user_id: userId,
    label: record.type,
    confidence: record.confidence,
    scanned_at: record.timestamp.toISOString(),
    image_url: null,
    description: record.summary,
  });

  if (error) throw error;
}

