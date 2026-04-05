
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
      // Load current state from localStorage
      const teams = JSON.parse(localStorage.getItem(STORAGE_KEYS.teams) || '[]') as Team[];
      const levels = JSON.parse(localStorage.getItem(STORAGE_KEYS.levels) || '[]') as Level[];
      const hints = JSON.parse(localStorage.getItem(STORAGE_KEYS.hints) || '[]') as Hint[];
      const attempts = JSON.parse(localStorage.getItem(STORAGE_KEYS.attempts) || '[]') as Attempt[];
      const flags = JSON.parse(localStorage.getItem(STORAGE_KEYS.flags) || '[]') as Flag[];

      const newState: StoreState = { teams, levels, hints, attempts, flags };

      // Ensure initial levels are present
      if (newState.levels.length === 0) {
        newState.levels = initialLevels as Level[];
        localStorage.setItem(STORAGE_KEYS.levels, JSON.stringify(newState.levels));
      }

      // Merge initial teams if they don't exist in local storage (handles new test accounts)
      const initialTeamsTyped = initialTeams as Team[];
      let teamsUpdated = false;
      initialTeamsTyped.forEach(it => {
        const existing = newState.teams.find(t => t.id === it.id);
        if (!existing) {
          newState.teams.push(it);
          teamsUpdated = true;
        } else if (existing.passwordHash !== it.passwordHash) {
          // Update password if it changed in the JSON (important for test accounts)
          existing.passwordHash = it.passwordHash;
          teamsUpdated = true;
        }
      });

      if (newState.teams.length === 0 || teamsUpdated) {
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
