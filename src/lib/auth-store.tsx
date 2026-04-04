'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

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

const STORAGE_KEY = 'intra_syntax_auth_v5';

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

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        setAuth(JSON.parse(stored));
      } catch (e) {
        localStorage.removeItem(STORAGE_KEY);
      }
    }
    setLoading(false);
  }, []);

  const loginTeam = (id: string, name: string) => {
    const newState: AuthState = {
      userType: 'team',
      teamId: id,
      teamName: name,
      adminId: null,
    };
    setAuth(newState);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newState));
  };

  const loginAdmin = (id: string) => {
    const newState: AuthState = {
      userType: 'admin',
      teamId: null,
      teamName: null,
      adminId: id,
    };
    setAuth(newState);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newState));
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
