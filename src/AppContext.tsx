import React, { createContext, useContext, useState, useEffect } from 'react';
import type { Session } from '@supabase/supabase-js';
import type { UserProfile } from './db';
import { isSupabaseConfigured } from './lib/supabaseClient';
import { supabase } from './lib/supabaseClient';
import { buildAppUser, fetchProfile } from './lib/supabaseAuth';

type AppContextType = {
  user: UserProfile | null;
  setUser: (u: UserProfile | null) => void;
  activeScreen: string;
  setActiveScreen: (s: string) => void;
  isOnline: boolean;
  isBooting: boolean;
};

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [activeScreen, setActiveScreen] = useState('auth');
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [isBooting, setIsBooting] = useState(true);

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
          setUser(buildAppUser(session.user, profile));
          if (event === 'INITIAL_SESSION' || event === 'SIGNED_IN') {
            setActiveScreen((prev) => (prev === 'auth' ? 'home' : prev));
          }
        } else {
          setUser(null);
          setActiveScreen('auth');
        }
      } catch {
        setUser(null);
        setActiveScreen('auth');
      } finally {
        if (!cancelled) setIsBooting(false);
      }
    };

    void supabase.auth.getSession().then(({ data: { session } }) => {
      void applySession('INITIAL_SESSION', session);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      void applySession(event, session);
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
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
