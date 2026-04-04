'use client';

import { useState, useEffect } from 'react';

export type UserType = 'team' | 'admin' | null;

interface AuthState {
  userType: UserType;
  teamId: string | null;
  teamName: string | null;
  adminId: string | null;
}

const STORAGE_KEY = 'intra_syntax_auth_v4';

const INITIAL_STATE: AuthState = {
  userType: null,
  teamId: null,
  teamName: null,
  adminId: null,
};

export function useAuth() {
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
    const newState = {
      userType: 'team' as const,
      teamId: id,
      teamName: name,
      adminId: null,
    };
    setAuth(newState);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newState));
  };

  const loginAdmin = (id: string) => {
    const newState = {
      userType: 'admin' as const,
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

  return { auth, loading, loginTeam, loginAdmin, logout };
}
