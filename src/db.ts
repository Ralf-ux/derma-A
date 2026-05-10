import Dexie, { type Table } from 'dexie';

export interface ScanRecord {
  id?: number;
  type: string;
  location: string;
  confidence: number;
  summary: string;
  imageData?: string; // Base64 or Blob
  timestamp: Date;
  patientId: string;
  isSynced: boolean;
  severity: 'low' | 'medium' | 'high';
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: 'patient' | 'doctor';
  biometricEnabled: boolean;
}

export class DermaDatabase extends Dexie {
  scans!: Table<ScanRecord>;
  users!: Table<UserProfile>;

  constructor() {
    super('DermaDB');
    this.version(1).stores({
      scans: '++id, patientId, timestamp, severity, isSynced',
      users: 'id, email, role'
    });
  }
}

export const db = new DermaDatabase();
