
import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import type { Profile } from '@freshcart/types';
import { supabase } from '../lib/supabase';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

function safeJson(res: Response) {
  return res.text().then(text => {
    try { return JSON.parse(text); }
    catch { return {}; }
  });
}


interface AuthContextValue {
  session: Session | null;
  user: User | null;
  isAdmin: boolean;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setSession(data.session);
      setLoading(false);
    });

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setLoading(false);
    });

    return () => {
      mounted = false;
      authListener.subscription.unsubscribe();
    };
  }, []);

  // Look up the role for the current session's user — the session alone only proves
  // "logged in", not "admin"; AdminLayout gates on isAdmin, not just session.
  useEffect(() => {
    let mounted = true;
    if (!session?.user) {
      setProfile(null);
      return;
    }
    supabase
      .from('profiles')
      .select('*')
      .eq('id', session.user.id)
      .single()
      .then(({ data }) => {
        if (mounted) setProfile(data ?? null);
      });
    return () => {
      mounted = false;
    };
  }, [session?.user?.id]);

  const value = useMemo<AuthContextValue>(() => ({
    session,
    user: session?.user ?? null,
    isAdmin: profile?.role === 'admin',
    loading,
    async signIn(email, password) {
      const res = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await safeJson(res);
      if (!res.ok) {
        throw new Error(data.error || 'Login failed');
      }
      // Load the backend-issued tokens into the real supabase-js client so RLS-protected
      // queries made directly against Supabase are actually authenticated as this user.
      const { error } = await supabase.auth.setSession({
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
      });
      if (error) throw error;
    },
    async signUp(email, password) {
      const res = await fetch(`${API_URL}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await safeJson(res);
      if (!res.ok) {
        throw new Error(data.error || 'Registration failed');
      }
      // After successful registration, auto sign‑in the user
      const loginRes = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const loginData = await safeJson(loginRes);
      if (!loginRes.ok) {
        throw new Error(loginData.error || 'Auto login failed');
      }
      const { error } = await supabase.auth.setSession({
        access_token: loginData.session.access_token,
        refresh_token: loginData.session.refresh_token,
      });
      if (error) throw error;
    },
    async signInWithGoogle() {
      const { error } = await supabase.auth.signInWithOAuth({ provider: 'google' });
      if (error) throw error;
    },
    async signOut() {
      // Sign the real supabase-js client out first (covers both the Google OAuth path
      // and the setSession() calls above), then best-effort notify the backend.
      await supabase.auth.signOut();
      try {
        await fetch(`${API_URL}/api/auth/logout`, { method: 'POST' });
      } catch {
        // Backend logout is advisory only — the client-side session is already cleared.
      }
    },
  }), [loading, session, profile]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
