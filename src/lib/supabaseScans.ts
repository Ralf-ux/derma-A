import { supabase } from './supabaseClient';
import type { ScanRecord } from '../db';

export async function uploadScanRow(params: {
  userId: string;
  record: ScanRecord;
  imageFile?: File;
}) {
  const { userId, record, imageFile } = params;

  let imageUrl: string | null = null;

  if (imageFile) {
    const filePath = `${userId}/${Date.now()}.jpg`;
    const { data: fileData, error: uploadError } = await supabase.storage
      .from('skin-scans')
      .upload(filePath, imageFile, { contentType: 'image/jpeg', upsert: false });

    if (uploadError) throw uploadError;

    const { data: publicData } = supabase.storage
      .from('skin-scans')
      .getPublicUrl(fileData.path);

    imageUrl = publicData.publicUrl;
  }

  const { error } = await supabase.from('scans').insert({
    user_id: userId,
    image_url: imageUrl,
    infection_type: record.type,
    severity_level: record.severity,
    confidence_score: record.confidence,
    recommendations: record.summary,
    scanned_at: record.timestamp.toISOString(),
  });

  if (error) throw error;
}

export async function fetchUserScans(userId: string) {
  const { data, error } = await supabase
    .from('scans')
    .select('*')
    .eq('user_id', userId)
    .order('scanned_at', { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function deleteSupabaseScan(scanId: string) {
  const { error } = await supabase.from('scans').delete().eq('id', scanId);
  if (error) throw error;
}

// Admin queries
export async function fetchAdminStats() {
  const [scansRes, profilesRes] = await Promise.all([
    supabase.from('scans').select('severity_level, user_id'),
    supabase.from('profiles').select('id, sex, location, first_name, last_name, contact'),
  ]);

  const scans = scansRes.data ?? [];
  const profiles = profilesRes.data ?? [];

  const totalScans = scans.length;
  const totalPatients = new Set(scans.map((s: any) => s.user_id)).size;
  const infected = scans.filter((s: any) => s.severity_level !== 'low').length;
  const severelyInfected = scans.filter((s: any) => s.severity_level === 'high').length;

  // Zone breakdown
  const zoneMap: Record<string, number> = {};
  for (const p of profiles) {
    if (p.location) {
      zoneMap[p.location] = (zoneMap[p.location] ?? 0) + 1;
    }
  }

  // Sex breakdown
  const sexMap: Record<string, number> = { male: 0, female: 0, other: 0 };
  for (const p of profiles) {
    if (p.sex) sexMap[p.sex] = (sexMap[p.sex] ?? 0) + 1;
  }

  return {
    totalScans,
    totalPatients,
    infected,
    severelyInfected,
    zoneMap,
    sexMap,
    profiles,
  };
}
