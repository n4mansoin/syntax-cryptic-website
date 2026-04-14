'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuth as useFirebaseAuth, useUser } from '@/firebase';
import { signInAnonymously } from 'firebase/auth';

export type UserType = 'team' | 'admin' | null;

interface AuthState {
  userType: UserType;
  teamId: string | null;
  teamName: string | null;
  adminId: string | null;
}

interface AuthContextType {
  auth: AuthState;
  loading: boolean;
  login: (teamName: string, passwordPlain: string) => Promise<boolean>;
  loginAdmin: (id: string) => void;
  logout: () => void;
}

const STORAGE_KEY = 'cryptic_user_session_v14';
const INITIAL_STATE: AuthState = {
  userType: null,
  teamId: null,
  teamName: null,
  adminId: null,
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [auth, setAuth] = useState<AuthState>(INITIAL_STATE);
  const [loading, setLoading] = useState(true);
  const firebaseAuth = useFirebaseAuth();
  const { user, isUserLoading } = useUser();

  // Handle Firebase Anonymous Login on mount
  useEffect(() => {
    if (!isUserLoading && !user && firebaseAuth) {
      signInAnonymously(firebaseAuth).catch(err => console.error("Firebase Anonymous Auth failed", err));
    }
  }, [user, isUserLoading, firebaseAuth]);

  // Handle local session restore
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const session = JSON.parse(stored);
        if (session.adminId) {
          setAuth({ userType: 'admin', teamId: null, teamName: null, adminId: session.adminId });
        } else if (session.teamId) {
          setAuth({ userType: 'team', teamId: session.teamId, teamName: session.teamName || 'Team', adminId: null });
        }
      } catch (e) {
        localStorage.removeItem(STORAGE_KEY);
      }
    }
    setLoading(false);
  }, []);

  const login = async (teamName: string, passwordPlain: string) => {
    const normalizedName = teamName.trim().toLowerCase();
    
    // Admin backdoor
    if (normalizedName === 'admin' && passwordPlain.trim() === 'qawsedrftg') {
      loginAdmin('admin-root');
      return true;
    }

    // In a real app we would check credentials against Firestore here
    // For now we assume pre-defined logic or previous team check
    const teamId = `team-${normalizedName.replace(/\s+/g, '-')}`;
    const newState: AuthState = { userType: 'team', teamId, teamName, adminId: null };
    setAuth(newState);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newState));
    return true;
  };

  const loginAdmin = (id: string) => {
    const newState: AuthState = { userType: 'admin', teamId: null, teamName: null, adminId: id };
    setAuth(newState);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newState));
  };

  const logout = () => {
    setAuth(INITIAL_STATE);
    localStorage.removeItem(STORAGE_KEY);
  };

  return (
    <AuthContext.Provider value={{ auth, loading: loading || isUserLoading, login, loginAdmin, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
