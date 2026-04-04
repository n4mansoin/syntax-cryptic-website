
'use client';

import { useState, useEffect } from 'react';

export interface Level {
  id: string;
  order: number;
  question: string;
  answer: string;
}

export interface Team {
  id: string;
  teamName: string;
  currentLevel: number;
  flagCount: number;
  penaltyUntil: string | null;
}

export interface Hint {
  id: string;
  levelId: string;
  hintText: string;
  isReleased: boolean;
  releasedAt: string | null;
}

export interface HintRequest {
  id: string;
  teamId: string;
  levelId: string;
  requestedAt: string;
}

const INITIAL_LEVELS: Level[] = [
  { id: 'lvl1', order: 1, question: "The first key is hidden in plain sight. What is the sum of 10 and 20?", answer: "30" },
  { id: 'lvl2', order: 2, question: "I speak without a mouth and hear without ears. I have no body, but I come alive with wind. What am I?", answer: "ECHO" },
  { id: 'lvl3', order: 3, question: "The more of this there is, the less you see. What is it?", answer: "DARKNESS" },
  { id: 'lvl4', order: 4, question: "I have keys, but no locks and space, and no rooms. You can enter, but never leave. What am I?", answer: "KEYBOARD" },
  { id: 'lvl5', order: 5, question: "What has a head and a tail but no body?", answer: "COIN" },
];

const STORAGE_KEYS = {
  LEVELS: 'intra_syntax_levels_v3',
  TEAMS: 'intra_syntax_teams_v3',
  HINTS: 'intra_syntax_hints_v3',
  HINT_REQUESTS: 'intra_syntax_hint_requests_v3',
};

export function useLocalStore() {
  const [levels, setLevels] = useState<Level[]>(INITIAL_LEVELS);
  const [teams, setTeams] = useState<Team[]>([]);
  const [hints, setHints] = useState<Hint[]>([]);
  const [hintRequests, setHintRequests] = useState<HintRequest[]>([]);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const load = (key: string, initial: any) => {
      const stored = localStorage.getItem(key);
      if (!stored) return initial;
      try {
        const parsed = JSON.parse(stored);
        return Array.isArray(parsed) && parsed.length > 0 ? parsed : initial;
      } catch {
        return initial;
      }
    };

    setLevels(load(STORAGE_KEYS.LEVELS, INITIAL_LEVELS));
    setTeams(load(STORAGE_KEYS.TEAMS, []));
    setHints(load(STORAGE_KEYS.HINTS, []));
    setHintRequests(load(STORAGE_KEYS.HINT_REQUESTS, []));
    setIsReady(true);
  }, []);

  const save = (key: string, data: any) => {
    localStorage.setItem(key, JSON.stringify(data));
  };

  const updateTeam = (teamId: string, updates: Partial<Team>) => {
    const newTeams = teams.map(t => t.id === teamId ? { ...t, ...updates } : t);
    setTeams(newTeams);
    save(STORAGE_KEYS.TEAMS, newTeams);
  };

  const addTeam = (team: Team) => {
    if (teams.some(t => t.id === team.id)) return;
    const newTeams = [...teams, team];
    setTeams(newTeams);
    save(STORAGE_KEYS.TEAMS, newTeams);
  };

  const addHintRequest = (request: Omit<HintRequest, 'id'>) => {
    const newRequest = { ...request, id: Math.random().toString(36).substr(2, 9) };
    const newRequests = [...hintRequests, newRequest];
    setHintRequests(newRequests);
    save(STORAGE_KEYS.HINT_REQUESTS, newRequests);
  };

  const addHint = (hint: Omit<Hint, 'id'>) => {
    const newHint = { ...hint, id: Math.random().toString(36).substr(2, 9) };
    const newHints = [...hints, newHint];
    setHints(newHints);
    save(STORAGE_KEYS.HINTS, newHints);
  };

  return {
    levels,
    teams,
    hints,
    hintRequests,
    isReady,
    updateTeam,
    addTeam,
    addHintRequest,
    addHint,
  };
}
