'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { useFirestore, useCollection, useMemoFirebase, useUser } from '@/firebase';
import { collection, query, orderBy, onSnapshot, collectionGroup, where } from 'firebase/firestore';
import { useAuth } from '@/lib/auth-store';

export interface Team {
  id: string;
  teamName: string;
  password?: string;
  currentLevel: number;
  flagCount: number;
  penaltyUntil: string | null;
  lastSolvedAt: string | null;
}

export interface Level {
  id: string;
  order: number;
  question: string;
  correctAnswer: string;
}

export interface Hint {
  id: string;
  levelId: string;
  hintText: string;
  isReleased: boolean;
  releasedAt: string | null;
}

export interface Attempt {
  id: string;
  teamId: string;
  levelId: string;
  timestamp: string;
  isCorrect: boolean;
  ip?: string;
}

export interface Flag {
  id: string;
  teamId: string;
  reason: string;
  timestamp: string;
}

export interface StoreState {
  teams: Team[];
  levels: Level[];
  hints: Hint[];
  attempts: Attempt[];
  flags: Flag[];
}

interface StoreContextType {
  state: StoreState;
  isReady: boolean;
  updateStore: (updater: (prev: StoreState) => StoreState) => void;
}

const StoreContext = createContext<StoreContextType | undefined>(undefined);

export function RealtimeSyncEngine({ children }: { children: ReactNode }) {
  const firestore = useFirestore();
  const { auth } = useAuth();
  const { user } = useUser();
  const [state, setState] = useState<StoreState>({
    teams: [],
    levels: [],
    hints: [],
    attempts: [],
    flags: [],
  });

  // Level listener (Global)
  const levelsQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(collection(firestore, 'levels'), orderBy('order', 'asc'));
  }, [firestore, !!user]);
  const { data: levels, isLoading: levelsLoading } = useCollection<Level>(levelsQuery);

  // Team listener (Global)
  const teamsQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return collection(firestore, 'teams');
  }, [firestore, !!user]);
  const { data: teams, isLoading: teamsLoading } = useCollection<Team>(teamsQuery);

  // Flag listener (STRICT ADMIN ONLY)
  const flagsQuery = useMemoFirebase(() => {
    if (!firestore || !user || auth.userType !== 'admin') return null;
    return collection(firestore, 'flags');
  }, [firestore, !!user, auth.userType]);
  const { data: flags, isLoading: flagsLoading } = useCollection<Flag>(flagsQuery);

  // Hint listener (Conditional based on role)
  useEffect(() => {
    if (!firestore || !user) return;
    
    let hintQuery;
    if (auth.userType === 'admin') {
      hintQuery = collectionGroup(firestore, 'hints');
    } else {
      hintQuery = query(collectionGroup(firestore, 'hints'), where('isReleased', '==', true));
    }

    const unsub = onSnapshot(hintQuery, (snapshot) => {
      const hintData = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Hint));
      setState(prev => ({ ...prev, hints: hintData }));
    }, (err) => {
      if (err.code !== 'permission-denied') console.warn("Hints listener error", err);
    });

    return () => unsub();
  }, [firestore, !!user, auth.userType]);

  // Attempt listener (ADMIN ONLY)
  useEffect(() => {
    if (!firestore || !user || auth.userType !== 'admin') return;
    
    const attemptsQuery = collectionGroup(firestore, 'attempts');
    const unsub = onSnapshot(attemptsQuery, (snapshot) => {
      const attemptData = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Attempt));
      setState(prev => ({ ...prev, attempts: attemptData }));
    }, (err) => {
      if (err.code !== 'permission-denied') console.warn("Attempts listener error", err);
    });

    return () => unsub();
  }, [firestore, !!user, auth.userType]);

  useEffect(() => {
    setState(prev => ({
      ...prev,
      levels: levels || [],
      teams: teams || [],
      flags: flags || [],
    }));
  }, [levels, teams, flags]);

  // Logic: isReady should be true even if user is null (for login page)
  // useCollection returns isLoading: false when query is null.
  const isReady = !levelsLoading && !teamsLoading;

  const updateStore = useCallback(() => {}, []);

  return (
    <StoreContext.Provider value={{ state, isReady, updateStore }}>
      {children}
    </StoreContext.Provider>
  );
}

export function useStore() {
  const context = useContext(StoreContext);
  if (context === undefined) {
    throw new Error('useStore must be used within a RealtimeSyncEngine');
  }
  return context;
}
