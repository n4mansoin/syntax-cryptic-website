'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import initialLevels from '@/data/levels.json';
import initialTeams from '@/data/teams.json';

export interface Team {
  id: string;
  teamName: string;
  passwordHash?: string;
  currentLevel: number;
  flagCount: number;
  penaltyUntil: string | null;
  lastSolvedAt: string | null;
}

export interface Level {
  id: string;
  order: number;
  question: string;
  answerHash: string;
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
  teams: 'is_teams',
  levels: 'is_levels',
  hints: 'is_hints',
  attempts: 'is_attempts',
  flags: 'is_flags',
};

export function RealtimeSyncEngine({ children }: { children: ReactNode }) {
  const [state, setState] = useState<StoreState>({
    teams: [],
    levels: [],
    hints: [],
    attempts: [],
    flags: [],
  });
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const channel = new BroadcastChannel('intra_syntax_sync');
    
    const handleMessage = (event: MessageEvent) => {
      const { key, data } = event.data;
      if (key && data && STORAGE_KEYS[key as keyof StoreState]) {
        setState(prev => ({ ...prev, [key]: data }));
      }
    };

    channel.onmessage = handleMessage;

    const loadState = () => {
      const newState: StoreState = {
        teams: JSON.parse(localStorage.getItem(STORAGE_KEYS.teams) || '[]'),
        levels: JSON.parse(localStorage.getItem(STORAGE_KEYS.levels) || '[]'),
        hints: JSON.parse(localStorage.getItem(STORAGE_KEYS.hints) || '[]'),
        attempts: JSON.parse(localStorage.getItem(STORAGE_KEYS.attempts) || '[]'),
        flags: JSON.parse(localStorage.getItem(STORAGE_KEYS.flags) || '[]'),
      };

      if (newState.levels.length === 0) {
        newState.levels = initialLevels as Level[];
        localStorage.setItem(STORAGE_KEYS.levels, JSON.stringify(newState.levels));
      }
      if (newState.teams.length === 0) {
        newState.teams = initialTeams as Team[];
        localStorage.setItem(STORAGE_KEYS.teams, JSON.stringify(newState.teams));
      }

      setState(newState);
      setIsReady(true);
    };

    loadState();

    return () => {
      channel.close();
    };
  }, []);

  const updateStore = useCallback(<K extends keyof StoreState>(key: K, data: StoreState[K], broadcast = true) => {
    setState(prev => ({ ...prev, [key]: data }));
    localStorage.setItem(STORAGE_KEYS[key], JSON.stringify(data));
    
    if (broadcast) {
      const channel = new BroadcastChannel('intra_syntax_sync');
      channel.postMessage({ key, data });
      channel.close();
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