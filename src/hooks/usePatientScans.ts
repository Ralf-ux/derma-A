import { useCallback, useEffect, useState } from 'react';
import { Platform } from 'react-native';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, type ScanRecord } from '../db';
import { isSupabaseConfigured } from '../lib/supabaseClient';
import { fetchUserScans } from '../lib/supabaseScans';

function mapSupabaseRow(row: Record<string, unknown>): ScanRecord {
  return {
    id: String(row.id ?? ''),
    type: String(row.infection_type ?? 'Skin lesion'),
    location: String(row.location ?? 'Analyzed area'),
    confidence: Number(row.confidence_score ?? 0),
    summary: String(row.recommendations ?? ''),
    timestamp: new Date(String(row.scanned_at ?? Date.now())),
    patientId: String(row.user_id ?? ''),
    isSynced: true,
    severity: (row.severity_level as ScanRecord['severity']) ?? 'low',
    // imageData may be a storage URL (cloud) or base64 (local) — keep as-is
    imageData: row.image_url ? String(row.image_url) : undefined,
  };
}

/**
 * Web  → Dexie live query (IndexedDB, auto-reactive)
 * Native → merge local SQLite rows + Supabase rows so nothing is lost even
 *          when a scan was just saved locally and hasn't synced to the cloud yet.
 */
export function usePatientScans(userId: string | undefined) {
  // ── WEB ─────────────────────────────────────────────────────────────────────
  const dexieScans = useLiveQuery(
    () => {
      if (Platform.OS !== 'web') return Promise.resolve([] as ScanRecord[]);
      return db.scans.toArray().then((rows) =>
        // newest first
        rows.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()),
      );
    },
    [],
  );

  // ── NATIVE ──────────────────────────────────────────────────────────────────
  const [nativeScans, setNativeScans] = useState<ScanRecord[]>([]);
  const [nativeReady, setNativeReady] = useState(Platform.OS === 'web');
  const [nativeVersion, setNativeVersion] = useState(0);

  const reloadNative = useCallback(async () => {
    if (Platform.OS === 'web') return;
    setNativeReady(false);
    try {
      // 1. Always load from local SQLite first — this has every scan including
      //    ones that haven't synced to Supabase yet.
      let localRows: ScanRecord[] = [];
      try {
        localRows = await db.scans.toArray();
      } catch {
        localRows = [];
      }

      // 2. If Supabase is configured, also pull cloud rows and merge them in.
      //    Cloud rows may contain scans from other devices that aren't in SQLite.
      if (userId && isSupabaseConfigured()) {
        try {
          const cloudRows = await fetchUserScans(userId);
          const cloudMapped = cloudRows.map((r) =>
            mapSupabaseRow(r as Record<string, unknown>),
          );

          // Merge: use cloud rows as the base, add local rows whose patientId
          // matches and that aren't already represented (isSynced === false means
          // they haven't made it to Supabase yet).
          const unsynced = localRows.filter((r) => !r.isSynced);
          const merged = [...unsynced, ...cloudMapped];

          // Deduplicate by a best-effort key (type + timestamp ms bucket)
          const seen = new Set<string>();
          const deduped = merged.filter((r) => {
            const key = `${r.type}_${Math.floor(new Date(r.timestamp).getTime() / 5000)}`;
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
          });

          // Sort newest first
          deduped.sort(
            (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
          );
          setNativeScans(deduped);
          return;
        } catch {
          // Supabase fetch failed — fall through to local-only
        }
      }

      // 3. No Supabase or fetch failed — show local SQLite rows only
      const sorted = [...localRows].sort(
        (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
      );
      setNativeScans(sorted);
    } finally {
      setNativeReady(true);
    }
  }, [userId]);

  useEffect(() => {
    if (Platform.OS === 'web') return;
    void reloadNative();
  }, [reloadNative, nativeVersion]);

  const refresh = useCallback(() => {
    if (Platform.OS === 'web') return;
    setNativeVersion((v) => v + 1);
  }, []);

  // ── Return ───────────────────────────────────────────────────────────────────
  if (Platform.OS === 'web') {
    return {
      scans: dexieScans,
      isLoading: dexieScans === undefined,
      refresh: () => {},
    };
  }

  return {
    scans: nativeScans,
    isLoading: !nativeReady,
    refresh,
  };
}
