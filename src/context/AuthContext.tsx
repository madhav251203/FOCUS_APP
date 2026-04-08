import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { Session, User as SupabaseUser } from '@supabase/supabase-js';
import { supabase } from '../services/supabase';
import { userService } from '../services/user';
import { User } from '../types';

interface AuthContextType {
  session: Session | null;
  user: User | null;
  supabaseUser: SupabaseUser | null;
  isLoading: boolean;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  supabaseUser: null,
  isLoading: true,
  refreshUser: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [supabaseUser, setSupabaseUser] = useState<SupabaseUser | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadUserProfile = useCallback(async (userId: string, email: string) => {
    let profile = await userService.getProfile(userId);
    if (!profile) {
      profile = await userService.createProfile(userId, email, email.split('@')[0]);
    }
    setUser(profile);
  }, []);

  const refreshUser = useCallback(async () => {
    if (supabaseUser) {
      const profile = await userService.getProfile(supabaseUser.id);
      setUser(profile);
    }
  }, [supabaseUser]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: currentSession } }) => {
      setSession(currentSession);
      setSupabaseUser(currentSession?.user ?? null);
      if (currentSession?.user) {
        loadUserProfile(currentSession.user.id, currentSession.user.email || '');
      }
      setIsLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      setSupabaseUser(newSession?.user ?? null);
      if (newSession?.user) {
        loadUserProfile(newSession.user.id, newSession.user.email || '');
      } else {
        setUser(null);
      }
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [loadUserProfile]);

  return (
    <AuthContext.Provider value={{ session, user, supabaseUser, isLoading, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
