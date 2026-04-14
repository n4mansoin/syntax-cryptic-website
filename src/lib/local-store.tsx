'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';

export interface Team {
  id: string;
  teamName: string;
  password: string;
  currentLevel: number;
  flagCount: number;
  penaltyUntil: string | null;
  lastSolvedAt: string | null;
}

export interface Level {
  id: string;
  order: number;
  question: string;
  encryptedAnswer: string;
  salt: string;
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
  const [state, setState] = useState<StoreState>({
    teams: [],
    levels: [],
    hints: [],
    attempts: [],
    flags: [],
  });

  // Fetch Levels (Ordered)
  const levelsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'levels'), orderBy('order', 'asc'));
  }, [firestore]);
  const { data: levels, isLoading: levelsLoading } = useCollection<Level>(levelsQuery);

  // Fetch Teams
  const teamsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return collection(firestore, 'teams');
  }, [firestore]);
  const { data: teams, isLoading: teamsLoading } = useCollection<Team>(teamsQuery);

  // Fetch Flags
  const flagsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return collection(firestore, 'flags');
  }, [firestore]);
  const { data: flags, isLoading: flagsLoading } = useCollection<Flag>(flagsQuery);

  // Hints (We listen for all released hints globally for now)
  useEffect(() => {
    if (!firestore) return;
    const unsub = onSnapshot(collection(firestore, 'hints'), (snapshot) => {
      const hintData = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Hint));
      setState(prev => ({ ...prev, hints: hintData }));
    });
    return () => unsub();
  }, [firestore]);

  // Attempts (For the current team, this would be handled contextually in pages, 
  // but for the global admin state we listen for updates)
  useEffect(() => {
    if (!firestore) return;
    const unsub = onSnapshot(collection(firestore, 'attempts'), (snapshot) => {
      const attemptData = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Attempt));
      setState(prev => ({ ...prev, attempts: attemptData }));
    });
    return () => unsub();
  }, [firestore]);

  useEffect(() => {
    setState(prev => ({
      ...prev,
      levels: levels || [],
      teams: teams || [],
      flags: flags || [],
    }));
  }, [levels, teams, flags]);

  const isReady = !levelsLoading && !teamsLoading && !flagsLoading;

  // Since we are now cloud-backed, we don't need a local updater function for global state.
  // Mutations are handled directly via Firestore in local-api.ts.
  const updateStore = useCallback(() => {
    console.warn('updateStore called on cloud-backed RealtimeSyncEngine. Mutations should occur via Firestore directly.');
  }, []);

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
