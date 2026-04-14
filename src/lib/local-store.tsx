
'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback, useRef } from 'react';
import initialLevels from '@/data/levels.json';
import initialTeams from '@/data/teams.json';

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

const STORAGE_KEY = 'cryptic_store_v14'; 
const SYNC_CHANNEL_NAME = 'cryptic-sync-v14';

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

  const loadInitialState = useCallback(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    let newState: StoreState;

    if (stored) {
      try {
        newState = JSON.parse(stored);
        // Always refresh levels from JSON to ensure latest questions/encryption
        newState.levels = initialLevels as Level[];
        
        if (!newState.teams || newState.teams.length === 0) {
          newState.teams = initialTeams as Team[];
        }
      } catch (e) {
        newState = {
          teams: initialTeams as Team[],
          levels: initialLevels as Level[],
          hints: [],
          attempts: [],
          flags: [],
        };
      }
    } else {
      newState = {
        teams: initialTeams as Team[],
        levels: initialLevels as Level[],
        hints: [],
        attempts: [],
        flags: [],
      };
    }

    setState(newState);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newState));
    setIsReady(true);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    if (!syncChannel.current) {
      syncChannel.current = new BroadcastChannel(SYNC_CHANNEL_NAME);
    }

    const handleMessage = (event: MessageEvent) => {
      if (event.data && event.data.type === 'STATE_UPDATE') {
        setState(event.data.payload);
      }
    };

    const handleStorage = (event: StorageEvent) => {
      if (event.key === STORAGE_KEY && event.newValue) {
        try {
          const parsed = JSON.parse(event.newValue);
          setState(parsed);
        } catch (e) { }
      }
    };

    syncChannel.current.onmessage = handleMessage;
    window.addEventListener('storage', handleStorage);

    loadInitialState();

    return () => {
      window.removeEventListener('storage', handleStorage);
      if (syncChannel.current) syncChannel.current.close();
    };
  }, [loadInitialState]);

  const updateStore = useCallback((updater: (prev: StoreState) => StoreState) => {
    setState(prev => {
      const next = updater(prev);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      if (syncChannel.current) {
        syncChannel.current.postMessage({ type: 'STATE_UPDATE', payload: next });
      }
      return next;
    });
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
