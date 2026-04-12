
'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback, useRef } from 'react';
import initialLevels from '@/data/levels.json';
import initialTeams from '@/data/teams.json';

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
  answer: string;
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
  updateStore: <K extends keyof StoreState>(key: K, data: StoreState[K], broadcast?: boolean) => void;
}

const StoreContext = createContext<StoreContextType | undefined>(undefined);

const STORAGE_KEYS: Record<keyof StoreState, string> = {
  teams: 'is_teams_v5',
  levels: 'is_levels_v5',
  hints: 'is_hints_v5',
  attempts: 'is_attempts_v5',
  flags: 'is_flags_v5',
};

const SYNC_CHANNEL_NAME = 'intra_syntax_global_sync_v7';

export function RealtimeSyncEngine({ children }: { children: ReactNode }) {
  const [state, setState] = useState<StoreState>({
    teams: [],
    levels: [],
    hints: [],
    attempts: [],
    flags: [],
  });
  const [isReady, setIsReady] = useState(false);
  const syncChannel = useRef<BroadcastChannel | null>(null);

  const loadState = useCallback(() => {
    const rawTeams = localStorage.getItem(STORAGE_KEYS.teams);
    const rawLevels = localStorage.getItem(STORAGE_KEYS.levels);
    const rawHints = localStorage.getItem(STORAGE_KEYS.hints);
    const rawAttempts = localStorage.getItem(STORAGE_KEYS.attempts);
    const rawFlags = localStorage.getItem(STORAGE_KEYS.flags);

    const newState: StoreState = {
      teams: JSON.parse(rawTeams || '[]'),
      levels: JSON.parse(rawLevels || '[]'),
      hints: JSON.parse(rawHints || '[]'),
      attempts: JSON.parse(rawAttempts || '[]'),
      flags: JSON.parse(rawFlags || '[]'),
    };

    // Force-Sync from JSON definitions
    newState.levels = initialLevels as Level[];
    const initialTeamsTyped = initialTeams as Team[];
    
    let storeNeedsUpdate = false;
    initialTeamsTyped.forEach(it => {
      const existingIndex = newState.teams.findIndex(t => t.id === it.id);
      if (existingIndex === -1) {
        newState.teams.push(it);
        storeNeedsUpdate = true;
      } else {
        if (newState.teams[existingIndex].password !== it.password) {
          newState.teams[existingIndex].password = it.password;
          storeNeedsUpdate = true;
        }
        if (newState.teams[existingIndex].teamName !== it.teamName) {
          newState.teams[existingIndex].teamName = it.teamName;
          storeNeedsUpdate = true;
        }
      }
    });

    localStorage.setItem(STORAGE_KEYS.levels, JSON.stringify(newState.levels));
    if (storeNeedsUpdate) {
      localStorage.setItem(STORAGE_KEYS.teams, JSON.stringify(newState.teams));
    }

    setState(newState);
    setIsReady(true);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    if (!syncChannel.current) {
      syncChannel.current = new BroadcastChannel(SYNC_CHANNEL_NAME);
    }

    const handleMessage = (event: MessageEvent) => {
      const { key, data } = event.data;
      if (key && data && STORAGE_KEYS[key as keyof StoreState]) {
        setState(prev => ({ ...prev, [key]: data }));
      }
    };

    const handleStorage = (event: StorageEvent) => {
      const key = (Object.keys(STORAGE_KEYS) as Array<keyof StoreState>).find(
        k => STORAGE_KEYS[k] === event.key
      );
      if (key && event.newValue) {
        try {
          const parsed = JSON.parse(event.newValue);
          setState(prev => ({ ...prev, [key]: parsed }));
        } catch (e) { }
      }
    };

    syncChannel.current.onmessage = handleMessage;
    window.addEventListener('storage', handleStorage);

    loadState();

    return () => {
      window.removeEventListener('storage', handleStorage);
    };
  }, [loadState]);

  const updateStore = useCallback(<K extends keyof StoreState>(key: K, data: StoreState[K], broadcast = true) => {
    setState(prev => ({ ...prev, [key]: data }));
    localStorage.setItem(STORAGE_KEYS[key], JSON.stringify(data));
    if (broadcast && syncChannel.current) {
      syncChannel.current.postMessage({ key, data });
    }
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
