'use client';

import { useState, useEffect } from 'react';

export type UserType = 'team' | 'admin' | null;

interface AuthState {
  userType: UserType;
  teamId: string | null;
  teamName: string | null;
  adminId: string | null;
  is2FAVerified: boolean;
}

const STORAGE_KEY = 'intra_syntax_auth_v2';

export function useAuth() {
  const [auth, setAuth] = useState<AuthState>({
    userType: null,
    teamId: null,
    teamName: null,
    adminId: null,
    is2FAVerified: false,
  });

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        setAuth(JSON.parse(stored));
      } catch (e) {
        console.error("Failed to parse auth store", e);
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
      is2FAVerified: false,
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
      is2FAVerified: false,
    };
    setAuth(newState);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newState));
  };

  const verify2FA = () => {
    setAuth(prev => {
      const newState = { ...prev, is2FAVerified: true };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newState));
      return newState;
    });
  };

  const logout = () => {
    const newState = {
      userType: null,
      teamId: null,
      teamName: null,
      adminId: null,
      is2FAVerified: false,
    };
    setAuth(newState);
    localStorage.removeItem(STORAGE_KEY);
  };

  return { auth, loading, loginTeam, loginAdmin, verify2FA, logout };
}
