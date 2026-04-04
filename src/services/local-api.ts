'use client';

import { sha256, normalizeAnswer } from '@/utils/hash';
import { SECRET_KEY, ATTEMPT_LIMIT_PER_MINUTE, PENALTY_DURATION_MINUTES, FLAGS_UNTIL_PENALTY } from '@/utils/constants';

// Internal types
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

const STORAGE_KEYS = {
  TEAMS: 'is_teams',
  LEVELS: 'is_levels',
  HINTS: 'is_hints',
  ATTEMPTS: 'is_attempts',
  FLAGS: 'is_flags'
};

class LocalApiService {
  private getStore<T>(key: string, defaultValue: T): T {
    if (typeof window === 'undefined') return defaultValue;
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : defaultValue;
  }

  private saveStore(key: string, data: any) {
    if (typeof window === 'undefined') return;
    localStorage.setItem(key, JSON.stringify(data));
  }

  async loginTeam(teamName: string, password: string): Promise<Team | null> {
    const teams = this.getStore<Team[]>(STORAGE_KEYS.TEAMS, []);
    const normalizedName = teamName.trim();
    const normalizedPass = password.trim();
    
    const team = teams.find(t => 
      t.teamName.toLowerCase() === normalizedName.toLowerCase() && 
      t.password === normalizedPass
    );
    
    if (!team) return null;
    const { password: _, ...safeTeam } = team;
    return safeTeam as Team;
  }

  async submitAnswer(teamId: string, levelId: string, userInput: string): Promise<{ success: boolean; message: string }> {
    const teams = this.getStore<Team[]>(STORAGE_KEYS.TEAMS, []);
    const teamIndex = teams.findIndex(t => t.id === teamId);
    if (teamIndex === -1) return { success: false, message: "Team not found." };

    const team = teams[teamIndex];
    const now = new Date();

    // 1. Check Penalty
    if (team.penaltyUntil && new Date(team.penaltyUntil) > now) {
      return { 
        success: false, 
        message: `System lockout active. Try again after ${new Date(team.penaltyUntil).toLocaleTimeString()}.` 
      };
    }

    // 2. Rate Limiting (5 attempts in last 60s)
    const attempts = this.getStore<Attempt[]>(STORAGE_KEYS.ATTEMPTS, []);
    const oneMinuteAgo = new Date(now.getTime() - 60000);
    const recentAttempts = attempts.filter(a => a.teamId === teamId && new Date(a.timestamp) > oneMinuteAgo);

    if (recentAttempts.length >= ATTEMPT_LIMIT_PER_MINUTE) {
      this.flagTeam(teamId, "Rate limit breach");
      return { success: false, message: "Decryption rate too high. Caution advised." };
    }

    // 3. Hash and Compare
    const levels = this.getStore<Level[]>(STORAGE_KEYS.LEVELS, []);
    const level = levels.find(l => l.id === levelId);
    if (!level) return { success: false, message: "Level signal lost." };

    const normalized = normalizeAnswer(userInput);
    const inputHash = await sha256(level.salt + SECRET_KEY + normalized);
    const isCorrect = inputHash === level.answerHash;

    // 4. Log Attempt
    attempts.push({
      id: Math.random().toString(36).substr(2, 9),
      teamId,
      levelId,
      timestamp: now.toISOString(),
      isCorrect
    });
    this.saveStore(STORAGE_KEYS.ATTEMPTS, attempts);

    if (isCorrect) {
      team.currentLevel += 1;
      team.lastSolvedAt = now.toISOString();
      teams[teamIndex] = team;
      this.saveStore(STORAGE_KEYS.TEAMS, teams);
      return { success: true, message: "Decryption successful. Proceeding." };
    }

    return { success: false, message: "Decryption failed. Signal incorrect." };
  }

  getLeaderboard(): Team[] {
    const teams = this.getStore<Team[]>(STORAGE_KEYS.TEAMS, []);
    return [...teams].sort((a, b) => {
      if (b.currentLevel !== a.currentLevel) return b.currentLevel - a.currentLevel;
      if (!a.lastSolvedAt) return 1;
      if (!b.lastSolvedAt) return -1;
      return new Date(a.lastSolvedAt).getTime() - new Date(b.lastSolvedAt).getTime();
    });
  }

  getHints(levelId: string): Hint[] {
    const hints = this.getStore<Hint[]>(STORAGE_KEYS.HINTS, []);
    return hints.filter(h => h.levelId === levelId && h.isReleased);
  }

  // Admin Actions
  releaseHint(levelId: string, hintText: string) {
    const hints = this.getStore<Hint[]>(STORAGE_KEYS.HINTS, []);
    hints.push({
      id: Math.random().toString(36).substr(2, 9),
      levelId,
      hintText,
      isReleased: true,
      releasedAt: new Date().toISOString()
    });
    this.saveStore(STORAGE_KEYS.HINTS, hints);
  }

  flagTeam(teamId: string, reason: string = "Manual Admin Flag") {
    const flags = this.getStore<Flag[]>(STORAGE_KEYS.FLAGS, []);
    const now = new Date();
    flags.push({
      id: Math.random().toString(36).substr(2, 9),
      teamId,
      reason,
      timestamp: now.toISOString()
    });
    this.saveStore(STORAGE_KEYS.FLAGS, flags);

    const teams = this.getStore<Team[]>(STORAGE_KEYS.TEAMS, []);
    const teamIndex = teams.findIndex(t => t.id === teamId);
    if (teamIndex !== -1) {
      const team = teams[teamIndex];
      team.flagCount += 1;
      
      if (team.flagCount >= FLAGS_UNTIL_PENALTY) {
        team.penaltyUntil = new Date(now.getTime() + PENALTY_DURATION_MINUTES * 60000).toISOString();
        team.flagCount = 0;
      }
      
      teams[teamIndex] = team;
      this.saveStore(STORAGE_KEYS.TEAMS, teams);
    }
  }

  applyPenalty(teamId: string) {
    const teams = this.getStore<Team[]>(STORAGE_KEYS.TEAMS, []);
    const teamIndex = teams.findIndex(t => t.id === teamId);
    if (teamIndex !== -1) {
      teams[teamIndex].penaltyUntil = new Date(Date.now() + PENALTY_DURATION_MINUTES * 60000).toISOString();
      this.saveStore(STORAGE_KEYS.TEAMS, teams);
    }
  }

  initializeData(initialLevels: Level[], initialTeams: Team[]) {
    if (!localStorage.getItem(STORAGE_KEYS.LEVELS)) {
      this.saveStore(STORAGE_KEYS.LEVELS, initialLevels);
    }
    
    const existingTeams = this.getStore<Team[]>(STORAGE_KEYS.TEAMS, []);
    let modified = false;

    initialTeams.forEach(initialTeam => {
      const index = existingTeams.findIndex(t => t.teamName === initialTeam.teamName);
      if (index === -1) {
        existingTeams.push(initialTeam);
        modified = true;
      } else {
        if (existingTeams[index].password !== initialTeam.password) {
          existingTeams[index].password = initialTeam.password;
          modified = true;
        }
      }
    });

    if (modified) {
      this.saveStore(STORAGE_KEYS.TEAMS, existingTeams);
    }
  }
}

export const localApi = new LocalApiService();
