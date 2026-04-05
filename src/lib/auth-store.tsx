'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useStore } from '@/lib/local-store';

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
  loginTeam: (id: string, name: string) => void;
  loginAdmin: (id: string) => void;
  logout: () => void;
}

const STORAGE_KEY = 'cryptic_user';

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
        const parsed = JSON.parse(stored);
        
        if (parsed.adminId === 'admin-root') {
          setAuth({
            userType: 'admin',
            teamId: null,
            teamName: null,
            adminId: 'admin-root'
          });
        } else if (parsed.teamId) {
          const team = state.teams.find(t => t.id === parsed.teamId);
          if (team) {
            setAuth({
              userType: 'team',
              teamId: team.id,
              teamName: team.teamName,
              adminId: null,
            });
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

  const loginTeam = (id: string, name: string) => {
    const newState: AuthState = {
      userType: 'team',
      teamId: id,
      teamName: name,
      adminId: null,
    };
    setAuth(newState);
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ teamId: id }));
  };

  const loginAdmin = (id: string) => {
    const newState: AuthState = {
      userType: 'admin',
      teamId: null,
      teamName: null,
      adminId: id,
    };
    setAuth(newState);
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ adminId: id }));
  };

  const logout = () => {
    setAuth(INITIAL_STATE);
    localStorage.removeItem(STORAGE_KEY);
  };

  return (
    <AuthContext.Provider value={{ auth, loading, loginTeam, loginAdmin, logout }}>
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
