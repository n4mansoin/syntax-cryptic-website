
'use client';

import { sha256, normalizeAnswer } from '@/utils/hash';
import { SECRET_KEY, ATTEMPT_LIMIT_PER_MINUTE, PENALTY_DURATION_MINUTES, FLAGS_UNTIL_PENALTY } from '@/utils/constants';
import { StoreState, Team, Level, Attempt, Flag } from '@/lib/local-store';

/**
 * Service Layer for INTRA SYNTAX CRYPTIC.
 * Refactored to operate on centralized state via updateStore pipeline.
 */
interface StoreContext {
  state: StoreState;
  updateStore: <K extends keyof StoreState>(key: K, data: StoreState[K], broadcast?: boolean) => void;
}

export const localApi = {
  /**
   * Authenticates a team or administrator.
   */
  async loginTeam(teamName: string, password: string, state: StoreState): Promise<Team | null> {
    const normalizedName = teamName.trim();
    const normalizedPass = password.trim();
    
    // Admin Root Override
    if (normalizedName === 'admin' && normalizedPass === 'qawsedrftg') {
      return { 
        id: 'admin-root', 
        teamName: 'admin', 
        currentLevel: 0, 
        flagCount: 0, 
        penaltyUntil: null, 
        lastSolvedAt: null 
      } as Team;
    }

    const team = state.teams.find(t => 
      t.teamName.toLowerCase() === normalizedName.toLowerCase() && 
      t.password === normalizedPass
    );
    
    return team || null;
  },

  /**
   * Processes a decryption attempt with security enforcement.
   */
  async submitAnswer(teamId: string, levelId: string, userInput: string, { state, updateStore }: StoreContext) {
    // 0. Fetch latest teams to avoid stale state in rapid successions
    const teams = [...state.teams];
    const teamIndex = teams.findIndex(t => t.id === teamId);
    if (teamIndex === -1) return { success: false, message: "Team not found." };

    const team = { ...teams[teamIndex] };
    const now = new Date();

    // 1. Check Penalty Status (Strict enforcement)
    if (team.penaltyUntil) {
      const penaltyDate = new Date(team.penaltyUntil);
      if (penaltyDate.getTime() > now.getTime()) {
        return { 
          success: false, 
          message: `System lockout active. Decryption disabled. Wait for timer.` 
        };
      }
    }

    // 2. Rate Limiting Enforcement (Global per team)
    const attempts = [...state.attempts];
    const oneMinuteAgo = new Date(now.getTime() - 60000);
    const recentAttempts = attempts.filter(a => a.teamId === teamId && new Date(a.timestamp) > oneMinuteAgo);

    if (recentAttempts.length >= ATTEMPT_LIMIT_PER_MINUTE) {
      this.flagTeam(teamId, "High-frequency decryption attempt (Rate Limit Breach)", { state, updateStore });
      return { 
        success: false, 
        message: "Protocol Violation: Decryption rate too high. Account flagged.", 
        flagged: true 
      };
    }

    // 3. Security Check: Hashing and Comparison
    const level = state.levels.find(l => l.id === levelId);
    if (!level) return { success: false, message: "Level signal lost." };

    const normalized = normalizeAnswer(userInput);
    const inputHash = await sha256(level.salt + SECRET_KEY + normalized);
    const isCorrect = inputHash === level.answerHash;

    // 4. Record Attempt
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
      return { success: true, message: "Decryption successful. Proceeding to next node." };
    }

    return { success: false, message: "Decryption failed. Signal incorrect." };
  },

  /**
   * Flags a team and handles automatic 60-minute lockout thresholds.
   */
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
      
      // Threshold check: 3 flags = 60 minute penalty
      if (team.flagCount >= FLAGS_UNTIL_PENALTY) {
        team.penaltyUntil = new Date(now.getTime() + PENALTY_DURATION_MINUTES * 60000).toISOString();
        team.flagCount = 0; 
      }
      
      teams[teamIndex] = team;
      updateStore('teams', teams);
    }
  },

  /**
   * Releases a cryptic hint for a specific level.
   */
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

  /**
   * Applies a manual time penalty to a team.
   */
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

  /**
   * Overrides and removes an active time penalty.
   */
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
