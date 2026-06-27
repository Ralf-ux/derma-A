import { Platform } from 'react-native';
import type { UserProfile } from './types/user';

export type { UserProfile } from './types/user';

export interface ScanRecord {
  id?: number | string;
  type: string;
  location: string;
  confidence: number;
  summary: string;
  imageData?: string; // base64 string or storage URL
  timestamp: Date | string;
  isSynced: boolean | number;
  severity: 'low' | 'medium' | 'high';
  patientId?: string;
  /** Serialised JSON of QuestionnaireAnswer[] — stored as text in SQLite/IndexedDB */
  questionnaireAnswers?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// WEB — Dexie (IndexedDB) with full reactivity for useLiveQuery
// ─────────────────────────────────────────────────────────────────────────────
let db: any;

if (Platform.OS === 'web') {
  // Dynamic import so Expo/Hermes never parses Dexie (it won't exist in native bundle)
  const DexieModule = require('dexie');
  const DexieClass = DexieModule.default ?? DexieModule.Dexie ?? DexieModule;

  class DermaDB extends DexieClass {
    scans!: import('dexie').Table<ScanRecord, number>;
    users!: import('dexie').Table<UserProfile, string>;

    constructor() {
      super('DermaDB');
      this.version(1).stores({
        scans: '++id, patientId, timestamp, severity, isSynced',
        users: 'id, email, role',
      });
    }
  }

  db = new DermaDB();
} else {
  // ───────────────────────────────────────────────────────────────────────────
  // NATIVE — expo-sqlite (Hermes-compatible, mirrors the Dexie interface)
  // ───────────────────────────────────────────────────────────────────────────
  const SQLite = require('expo-sqlite');
  const nativeDb = SQLite.openDatabaseSync('DermaDB.db');

  nativeDb.execSync(`
    CREATE TABLE IF NOT EXISTS scans (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      patientId TEXT,
      timestamp TEXT,
      severity TEXT,
      isSynced INTEGER DEFAULT 0,
      type TEXT NOT NULL,
      location TEXT,
      confidence REAL,
      summary TEXT,
      imageData TEXT,
      questionnaireAnswers TEXT
    );

    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT,
      role TEXT,
      raw_data TEXT
    );
  `);

  // Migrate existing databases that were created before questionnaireAnswers was added
  try {
    nativeDb.execSync(`ALTER TABLE scans ADD COLUMN questionnaireAnswers TEXT;`);
  } catch { /* column already exists — safe to ignore */ }

  db = {
    // === SCANS ===
    scans: {
      add: async (record: ScanRecord): Promise<number> => {
        const timestampStr =
          record.timestamp instanceof Date
            ? record.timestamp.toISOString()
            : record.timestamp;
        const result = nativeDb.runSync(
          `INSERT INTO scans (type, location, confidence, summary, imageData, timestamp, patientId, isSynced, severity, questionnaireAnswers)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
          [
            record.type,
            record.location,
            record.confidence,
            record.summary,
            record.imageData || '',
            timestampStr,
            record.patientId ?? null,
            record.isSynced ? 1 : 0,
            record.severity,
            record.questionnaireAnswers ?? null,
          ],
        );
        return result.lastInsertRowId;
      },

      update: async (id: number | string, changes: Partial<ScanRecord>): Promise<void> => {
        const numericId = typeof id === 'string' ? parseInt(id, 10) : id;
        if (isNaN(numericId)) return;

        const setClauses: string[] = [];
        const values: any[] = [];

        if (changes.type      !== undefined) { setClauses.push('type = ?');       values.push(changes.type); }
        if (changes.location  !== undefined) { setClauses.push('location = ?');   values.push(changes.location); }
        if (changes.confidence!== undefined) { setClauses.push('confidence = ?'); values.push(changes.confidence); }
        if (changes.summary   !== undefined) { setClauses.push('summary = ?');    values.push(changes.summary); }
        if (changes.imageData !== undefined) { setClauses.push('imageData = ?');  values.push(changes.imageData); }
        if (changes.severity  !== undefined) { setClauses.push('severity = ?');   values.push(changes.severity); }
        if (changes.patientId !== undefined) { setClauses.push('patientId = ?');  values.push(changes.patientId); }
        if (changes.isSynced  !== undefined) { setClauses.push('isSynced = ?');   values.push(changes.isSynced ? 1 : 0); }
        if (changes.questionnaireAnswers !== undefined) { setClauses.push('questionnaireAnswers = ?'); values.push(changes.questionnaireAnswers); }
        if (setClauses.length === 0) return;
        values.push(numericId);
        nativeDb.runSync(
          `UPDATE scans SET ${setClauses.join(', ')} WHERE id = ?;`,
          values,
        );
      },

      delete: async (id: number | string): Promise<void> => {
        const numericId = typeof id === 'string' ? parseInt(id, 10) : id;
        if (isNaN(numericId)) return;
        nativeDb.runSync(`DELETE FROM scans WHERE id = ?;`, [numericId]);
      },

      toArray: async (): Promise<ScanRecord[]> => {
        const rows = nativeDb.getAllSync<any>(`SELECT * FROM scans ORDER BY id DESC;`);
        return rows.map((row: any) => ({
          ...row,
          timestamp: new Date(row.timestamp),
          isSynced: row.isSynced === 1,
        }));
      },
    },

    // === USERS ===
    users: {
      add: async (user: UserProfile): Promise<string> => {
        nativeDb.runSync(
          `INSERT OR REPLACE INTO users (id, email, role, raw_data) VALUES (?, ?, ?, ?);`,
          [user.id, user.email || '', user.role || '', JSON.stringify(user)],
        );
        return user.id;
      },

      get: async (id: string): Promise<UserProfile | undefined> => {
        const row = nativeDb.getFirstSync<any>(
          `SELECT raw_data FROM users WHERE id = ?;`,
          [id],
        );
        if (!row) return undefined;
        return JSON.parse(row.raw_data);
      },

      update: async (id: string, changes: Partial<UserProfile>): Promise<void> => {
        const existing = nativeDb.getFirstSync<any>(
          `SELECT raw_data FROM users WHERE id = ?;`,
          [id],
        );
        if (existing) {
          const updated = { ...JSON.parse(existing.raw_data), ...changes };
          nativeDb.runSync(
            `UPDATE users SET email = ?, role = ?, raw_data = ? WHERE id = ?;`,
            [updated.email || '', updated.role || '', JSON.stringify(updated), id],
          );
        }
      },

      delete: async (id: string): Promise<void> => {
        nativeDb.runSync(`DELETE FROM users WHERE id = ?;`, [id]);
      },
    },
  };
}

export { db };
