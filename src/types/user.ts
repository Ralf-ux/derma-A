/** App-level user profile (no Dexie / Supabase imports). */
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
  avatarUrl?: string;
}
