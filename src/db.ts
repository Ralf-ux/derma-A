import Dexie, { type Table } from 'dexie';

export interface ScanRecord {
  id?: number;
  type: string;
  location: string;
  confidence: number;
  summary: string;
  imageData?: string; // Base64 or Blob URL
  timestamp: Date;
  patientId: string;
  isSynced: boolean;
  severity: 'low' | 'medium' | 'high';
}

export interface UserProfile {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  sex: 'male' | 'female' | 'other';
  location: string;
  contact: string;
  role: 'patient' | 'admin';
  biometricEnabled: boolean;
  /** Public URL from Supabase Storage `avatars` bucket */
  avatarUrl?: string;
}

export class DermaDatabase extends Dexie {
  scans!: Table<ScanRecord>;
  users!: Table<UserProfile>;

  constructor() {
    super('DermaDB');
    this.version(2).stores({
      scans: '++id, patientId, timestamp, severity, isSynced',
      users: 'id, email, role'
    });
  }
}

export const db = new DermaDatabase();
