'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { localApi, Team, Level, Hint } from '@/services/local-api';
import initialLevels from '@/data/levels.json';
import initialTeams from '@/data/teams.json';

interface StoreContextType {
  teams: Team[];
  levels: Level[];
  isReady: boolean;
  refresh: () => void;
}

const StoreContext = createContext<StoreContextType | undefined>(undefined);

export function LocalStoreProvider({ children }: { children: ReactNode }) {
  const [teams, setTeams] = useState<Team[]>([]);
  const [levels, setLevels] = useState<Level[]>([]);
  const [isReady, setIsReady] = useState(false);

  const refresh = () => {
    if (typeof window === 'undefined') return;
    const t = JSON.parse(localStorage.getItem('is_teams') || '[]');
    const l = JSON.parse(localStorage.getItem('is_levels') || '[]');
    setTeams(t);
    setLevels(l);
  };

  useEffect(() => {
    localApi.initializeData(initialLevels as Level[], initialTeams as Team[]);
    refresh();
    setIsReady(true);

    const interval = setInterval(refresh, 5000); // Sync every 5s
    return () => clearInterval(interval);
  }, []);

  return (
    <StoreContext.Provider value={{ teams, levels, isReady, refresh }}>
      {children}
    </StoreContext.Provider>
  );
}

export function useLocalStore() {
  const context = useContext(StoreContext);
  if (context === undefined) {
    throw new Error('useLocalStore must be used within a LocalStoreProvider');
  }
  return context;
}