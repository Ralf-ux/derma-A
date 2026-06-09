import { Platform } from 'react-native';
import { db, type ScanRecord } from '../db';
import { isSupabaseConfigured } from './supabaseClient';
import { deleteSupabaseScan, uploadScanRow } from './supabaseScans';

export async function addPatientScan(
  record: Omit<ScanRecord, 'id'>,
  userId: string,
): Promise<number | string | undefined> {
  if (Platform.OS === 'web') {
    return db.scans.add({ ...record, patientId: userId });
  }

  if (isSupabaseConfigured()) {
    await uploadScanRow({ userId, record: { ...record, patientId: userId } });
    return undefined;
  }

  try {
    return await db.scans.add({ ...record, patientId: userId });
  } catch {
    return undefined;
  }
}

export async function updatePatientScan(
  id: ScanRecord['id'],
  patch: Partial<ScanRecord>,
): Promise<void> {
  if (id == null) return;

  if (Platform.OS === 'web' && typeof id === 'number') {
    await db.scans.update(id, patch);
    return;
  }

  if (typeof id === 'string' && isSupabaseConfigured()) {
    const { supabase } = await import('./supabase/client');
    const { error } = await supabase
      .from('scans')
      .update({
        infection_type: patch.type,
        severity_level: patch.severity,
        recommendations: patch.summary,
      })
      .eq('id', id);
    if (error) throw error;
    return;
  }

  if (typeof id === 'number') {
    await db.scans.update(id, patch);
  }
}

export async function removePatientScan(id: ScanRecord['id']): Promise<void> {
  if (id == null) return;

  if (typeof id === 'string' && isSupabaseConfigured()) {
    await deleteSupabaseScan(id);
    return;
  }

  if (typeof id === 'number') {
    await db.scans.delete(id);
  }
}
