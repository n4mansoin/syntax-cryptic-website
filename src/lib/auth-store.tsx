'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useStore } from '@/lib/local-store';
import { sha256 } from '@/utils/hash';
import { SECRET_KEY } from '@/utils/constants';

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

const STORAGE_KEY = 'cryptic_user_session_v10';
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
  const { state, isReady } = useStore();

  useEffect(() => {
    if (!isReady) return;

    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const session = JSON.parse(stored);
        if (session.adminId) {
          setAuth({ userType: 'admin', teamId: null, teamName: null, adminId: session.adminId });
        } else if (session.teamId) {
          const team = state.teams.find(t => t.id === session.teamId);
          if (team) {
            setAuth({ userType: 'team', teamId: team.id, teamName: team.teamName, adminId: null });
          } else {
            localStorage.removeItem(STORAGE_KEY);
          }
        }
      } catch (e) {
        localStorage.removeItem(STORAGE_KEY);
      }
    }
    setLoading(false);
  }, [isReady, state.teams]);

  const login = async (teamName: string, passwordPlain: string) => {
    const normalizedName = teamName.trim().toLowerCase();
    const passwordHash = await sha256(SECRET_KEY + passwordPlain.trim());

    // Admin backdoor
    if (normalizedName === 'admin' && passwordPlain.trim() === 'qawsedrftg') {
      loginAdmin('admin-root');
      return true;
    }

    const team = state.teams.find(t => 
      t.teamName.toLowerCase().trim() === normalizedName && 
      t.passwordHash === passwordHash
    );

    if (team) {
      const newState: AuthState = { userType: 'team', teamId: team.id, teamName: team.teamName, adminId: null };
      setAuth(newState);
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ teamId: team.id }));
      return true;
    }
    return false;
  };

  const loginAdmin = (id: string) => {
    const newState: AuthState = { userType: 'admin', teamId: null, teamName: null, adminId: id };
    setAuth(newState);
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ adminId: id }));
  };

  const logout = () => {
    setAuth(INITIAL_STATE);
    localStorage.removeItem(STORAGE_KEY);
  };

  return (
    <AuthContext.Provider value={{ auth, loading, login, loginAdmin, logout }}>
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
