import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { AppState, AppStateStatus, Platform } from 'react-native';
import type { Session } from '@supabase/supabase-js';
import type { UserProfile } from './types/user';
import { isSupabaseConfigured, supabase } from './lib/supabase/client';
import { buildAppUser, fetchProfile, usersEqual } from './lib/supabase/auth';

type AppContextType = {
  user: UserProfile | null;
  setUser: React.Dispatch<React.SetStateAction<UserProfile | null>>;
  activeScreen: string;
  setActiveScreen: (s: string) => void;
  isOnline: boolean;
  isBooting: boolean;
};

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [activeScreen, setActiveScreen] = useState('auth');
  const [isOnline, setIsOnline] = useState(
    Platform.OS === 'web' ? navigator.onLine : true
  );
  const [isBooting, setIsBooting] = useState(true);
  const bootstrappedRef = useRef(false);

  // ── Network status ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const handleOnline  = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online',  handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online',  handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    if (!isSupabaseConfigured()) {
      setIsBooting(false);
      return;
    }

    let cancelled = false;

    const applySession = async (event: string, session: Session | null) => {
      if (cancelled) return;
      try {
        if (session?.user) {
          const profile = await fetchProfile(session.user.id).catch(() => null);
          const appUser = buildAppUser(session.user, profile);
          setUser((prev) => (usersEqual(prev, appUser) ? prev : appUser));

          if (
            (event === 'INITIAL_SESSION' || event === 'SIGNED_IN') &&
            !bootstrappedRef.current
          ) {
            bootstrappedRef.current = true;
            setActiveScreen((prev) => {
              if (prev !== 'auth') return prev;
              return appUser.role === 'admin' ? 'admin' : 'home';
            });
          }
        } else {
          bootstrappedRef.current = false;
          setUser(null);
          setActiveScreen('auth');
        }
      } catch {
        bootstrappedRef.current = false;
        setUser(null);
        setActiveScreen('auth');
      } finally {
        if (!cancelled) setIsBooting(false);
      }
    };

    void supabase.auth.getSession().then(({ data: { session } }) => {
      void applySession('INITIAL_SESSION', session);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      // INITIAL_SESSION is handled by getSession() above — handling it twice causes update storms.
      if (event === 'INITIAL_SESSION') return;
      void applySession(event, session);
    });

    const refreshSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      await applySession('PROFILE_REFRESH', session);
    };

    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active') {
        void refreshSession();
      }
    };

    const subscription2 = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      cancelled = true;
      subscription.unsubscribe();
      subscription2.remove();
    };
  }, []);

  return (
    <AppContext.Provider value={{ user, setUser, activeScreen, setActiveScreen, isOnline, isBooting }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within AppProvider');
  return context;
};
