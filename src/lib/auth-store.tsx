'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuth as useFirebaseAuth, useUser } from '@/firebase';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signInAnonymously,
  signOut 
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { useFirestore } from '@/firebase';

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
  loginAdmin: (username: string, passwordPlain: string) => Promise<boolean>;
  logout: () => void;
}

const STORAGE_KEY = 'intra_syntax_global_auth_v5';
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
  const db = useFirestore();
  const { user, isUserLoading } = useUser();

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

  useEffect(() => {
    if (!isUserLoading && !user && firebaseAuth) {
      signInAnonymously(firebaseAuth).catch(err => console.error("Silent sign-in failed", err));
    }
  }, [user, isUserLoading, firebaseAuth]);

  const login = async (teamName: string, passwordPlain: string) => {
    if (!firebaseAuth || !db) return false;
    const normalizedName = teamName.trim().toLowerCase();
    const email = `${normalizedName}@intra-syntax.com`;
    const password = passwordPlain.trim();

    try {
      let userCredential;
      try {
        userCredential = await signInWithEmailAndPassword(firebaseAuth, email, password);
      } catch (err: any) {
        // Handle both invalid-credential and user-not-found for auto-provisioning
        if (err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential' || err.code === 'auth/invalid-email') {
          userCredential = await createUserWithEmailAndPassword(firebaseAuth, email, password);
        } else {
          throw err;
        }
      }

      const teamId = userCredential.user.uid;
      const teamRef = doc(db, 'teams', teamId);
      const teamSnap = await getDoc(teamRef);
      
      if (!teamSnap.exists()) {
        await setDoc(teamRef, {
          teamName,
          currentLevel: 1,
          flagCount: 0,
          penaltyUntil: null,
          lastSolvedAt: null
        });
      }

      const newState: AuthState = { userType: 'team', teamId, teamName, adminId: null };
      setAuth(newState);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newState));
      return true;
    } catch (err) {
      console.error("Login failed", err);
      return false;
    }
  };

  const loginAdmin = async (username: string, passwordPlain: string) => {
    if (!firebaseAuth || !db) return false;
    const email = `${username.toLowerCase()}@intra-syntax.com`;
    const password = passwordPlain.trim();

    try {
      let userCredential;
      try {
        userCredential = await signInWithEmailAndPassword(firebaseAuth, email, password);
      } catch (err: any) {
        if (err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential') {
          userCredential = await createUserWithEmailAndPassword(firebaseAuth, email, password);
        } else {
          throw err;
        }
      }

      const adminId = userCredential.user.uid;
      const roleRef = doc(db, 'admin_roles', adminId);
      const roleSnap = await getDoc(roleRef);
      
      if (!roleSnap.exists()) {
        await setDoc(roleRef, { username, role: 'admin' }, { merge: true });
      }

      const newState: AuthState = { userType: 'admin', teamId: null, teamName: null, adminId };
      setAuth(newState);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newState));
      return true;
    } catch (err) {
      console.error("Admin login failed", err);
      return false;
    }
  };

  const logout = () => {
    if (firebaseAuth) signOut(firebaseAuth);
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
