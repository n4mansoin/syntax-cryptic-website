
'use client';

import { sha256, normalizeAnswer } from '@/utils/hash';
import { SECRET_KEY, ATTEMPT_LIMIT_PER_MINUTE, PENALTY_DURATION_MINUTES, FLAGS_UNTIL_PENALTY } from '@/utils/constants';
import { StoreState, Team, Level, Attempt, Flag } from '@/lib/local-store';

interface StoreContext {
  state: StoreState;
  updateStore: <K extends keyof StoreState>(key: K, data: StoreState[K], broadcast?: boolean) => void;
}

export const localApi = {
  async loginTeam(teamName: string, password: string, state: StoreState): Promise<Team | null> {
    const cleanName = teamName.trim().toLowerCase();
    const cleanPassword = password.trim();
    
    // Admin Root Credentials
    if (cleanName === 'admin' && cleanPassword === 'qawsedrftg') {
      return { 
        id: 'admin-root', 
        teamName: 'admin', 
        currentLevel: 0, 
        flagCount: 0, 
        penaltyUntil: null, 
        lastSolvedAt: null 
      } as Team;
    }

    const inputHash = await sha256(SECRET_KEY + cleanPassword);
    
    console.log(`[AUTH] Verifying Identity: ${cleanName}`);
    
    const team = state.teams.find(t => 
      t.teamName.toLowerCase() === cleanName && 
      t.passwordHash === inputHash
    );
    
    if (team) {
      console.log("[AUTH] Signal Verified.");
    } else {
      console.warn("[AUTH] Authentication Failed. Signal Rejected.");
    }
    
    return team || null;
  },

  async submitAnswer(teamId: string, levelId: string, userInput: string, { state, updateStore }: StoreContext) {
    const teams = [...state.teams];
    const teamIndex = teams.findIndex(t => t.id === teamId);
    if (teamIndex === -1) return { success: false, message: "Team identity lost." };

    const team = { ...teams[teamIndex] };
    const now = new Date();

    // Re-verify penalty with fresh server-time logic
    if (team.penaltyUntil && new Date(team.penaltyUntil) > now) {
      return { success: false, message: "System lockout active. Terminal suppressed." };
    }

    const attempts = [...state.attempts];
    const oneMinuteAgo = new Date(now.getTime() - 60000);
    const recentAttempts = attempts.filter(a => a.teamId === teamId && new Date(a.timestamp) > oneMinuteAgo);

    if (recentAttempts.length >= ATTEMPT_LIMIT_PER_MINUTE) {
      this.flagTeam(teamId, "Protocol Violation: High-frequency decryption attempt", { state, updateStore });
      return { success: false, message: "Rate limit breach. Account flagged.", flagged: true };
    }

    const level = state.levels.find(l => l.id === levelId);
    if (!level) return { success: false, message: "Signal synchronization failure." };

    const normalized = normalizeAnswer(userInput);
    const inputHash = await sha256(level.salt + SECRET_KEY + normalized);
    const isCorrect = inputHash === level.answerHash;

    const newAttempt: Attempt = {
      id: Math.random().toString(36).substr(2, 9),
      teamId,
      levelId,
      timestamp: now.toISOString(),
      isCorrect
    };
    attempts.push(newAttempt);
    updateStore('attempts', attempts);

    if (isCorrect) {
      team.currentLevel += 1;
      team.lastSolvedAt = now.toISOString();
      teams[teamIndex] = team;
      updateStore('teams', teams);
      return { success: true, message: "Decryption successful. Node breached." };
    }

    return { success: false, message: "Decryption failed. Signal rejected." };
  },

  flagTeam(teamId: string, reason: string, { state, updateStore }: StoreContext) {
    const flags = [...state.flags];
    const now = new Date();
    flags.push({
      id: Math.random().toString(36).substr(2, 9),
      teamId,
      reason,
      timestamp: now.toISOString()
    });
    updateStore('flags', flags);

    const teams = [...state.teams];
    const teamIndex = teams.findIndex(t => t.id === teamId);
    if (teamIndex !== -1) {
      const team = { ...teams[teamIndex] };
      team.flagCount += 1;
      // Auto-lockout after 3 flags
      if (team.flagCount >= FLAGS_UNTIL_PENALTY) {
        team.penaltyUntil = new Date(now.getTime() + PENALTY_DURATION_MINUTES * 60000).toISOString();
        team.flagCount = 0; 
      }
      teams[teamIndex] = team;
      updateStore('teams', teams);
    }
  },

  releaseHint(levelId: string, hintText: string, { state, updateStore }: StoreContext) {
    const hints = [...state.hints];
    hints.push({
      id: Math.random().toString(36).substr(2, 9),
      levelId,
      hintText,
      isReleased: true,
      releasedAt: new Date().toISOString()
    });
    updateStore('hints', hints);
  },

  applyPenalty(teamId: string, durationMinutes: number, { state, updateStore }: StoreContext) {
    const teams = [...state.teams];
    const teamIndex = teams.findIndex(t => t.id === teamId);
    if (teamIndex !== -1) {
      const team = { ...teams[teamIndex] };
      team.penaltyUntil = new Date(Date.now() + durationMinutes * 60000).toISOString();
      teams[teamIndex] = team;
      updateStore('teams', teams);
    }
  },

  removePenalty(teamId: string, { state, updateStore }: StoreContext) {
    const teams = [...state.teams];
    const teamIndex = teams.findIndex(t => t.id === teamId);
    if (teamIndex !== -1) {
      const team = { ...teams[teamIndex] };
      team.penaltyUntil = null;
      teams[teamIndex] = team;
      updateStore('teams', teams);
    }
  }
};
