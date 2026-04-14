
'use client';

import { decryptAnswer } from '@/utils/crypto';
import { ATTEMPT_LIMIT_PER_MINUTE, FLAGS_UNTIL_PENALTY, PENALTY_DURATION_MINUTES } from '@/utils/constants';
import { StoreState, Attempt, Flag } from '@/lib/local-store';

export const localApi = {
  async submitAnswer(teamId: string, levelId: string, userInput: string, state: StoreState, updateStore: (updater: (prev: StoreState) => StoreState) => void) {
    const team = state.teams.find(t => t.id === teamId);
    if (!team) return { success: false, message: "Identity mismatch." };

    const now = new Date();

    // 1. Check Penalty
    if (team.penaltyUntil && new Date(team.penaltyUntil) > now) {
      return { success: false, message: "Terminal Signal Suppressed." };
    }

    // 2. Rate Limiting
    const oneMinuteAgo = new Date(now.getTime() - 60000);
    const recentAttempts = state.attempts.filter(a => a.teamId === teamId && new Date(a.timestamp) > oneMinuteAgo);

    if (recentAttempts.length >= ATTEMPT_LIMIT_PER_MINUTE) {
      this.flagTeam(teamId, "Rate Limit Breach: Signal Flood", updateStore);
      return { success: false, message: "Protocol Violation: Signal Flood Detected.", flagged: true };
    }

    // 3. Decryption & Verification
    const level = state.levels.find(l => l.id === levelId);
    if (!level) return { success: false, message: "Signal synchronization failed." };

    const normalizedInput = userInput.trim().toLowerCase();
    
    // Decrypt at runtime for validation
    const decryptedString = decryptAnswer(level.encryptedAnswer, level.salt);
    
    // Support multi-answer delimited by |
    const possibleAnswers = decryptedString.split('|').map(a => a.trim().toLowerCase());
    
    // Check if input matches any valid decryption
    const isCorrect = possibleAnswers.includes(normalizedInput);

    // 4. Update Store (Atomic update)
    updateStore(prev => {
      const next = { ...prev };
      
      // Log attempt
      const newAttempt: Attempt = {
        id: Math.random().toString(36).substr(2, 9),
        teamId,
        levelId,
        timestamp: now.toISOString(),
        isCorrect
      };
      next.attempts = [...next.attempts, newAttempt];

      // Update Team Progress
      if (isCorrect) {
        next.teams = next.teams.map(t => t.id === teamId ? {
          ...t,
          currentLevel: t.currentLevel + 1,
          lastSolvedAt: now.toISOString(),
          flagCount: 0 
        } : t);
      }

      return next;
    });

    return isCorrect ? 
      { success: true, message: "Signal Decrypted. Security Layer Breached." } : 
      { success: false, message: "Invalid Key Code. Access Denied." };
  },

  flagTeam(teamId: string, reason: string, updateStore: (updater: (prev: StoreState) => StoreState) => void) {
    const now = new Date();
    updateStore(prev => {
      const next = { ...prev };
      
      const newFlag: Flag = {
        id: Math.random().toString(36).substr(2, 9),
        teamId,
        reason,
        timestamp: now.toISOString()
      };
      next.flags = [...next.flags, newFlag];

      next.teams = next.teams.map(t => {
        if (t.id !== teamId) return t;
        const newFlagCount = t.flagCount + 1;
        if (newFlagCount >= FLAGS_UNTIL_PENALTY) {
          return {
            ...t,
            flagCount: 0,
            penaltyUntil: new Date(now.getTime() + PENALTY_DURATION_MINUTES * 60000).toISOString()
          };
        }
        return { ...t, flagCount: newFlagCount };
      });

      return next;
    });
  },

  applyPenalty(teamId: string, mins: number, { updateStore }: any) {
    const now = new Date();
    updateStore((prev: any) => ({
      ...prev,
      teams: prev.teams.map((t: any) => t.id === teamId ? {
        ...t,
        penaltyUntil: new Date(now.getTime() + mins * 60000).toISOString()
      } : t)
    }));
  },

  removePenalty(teamId: string, { updateStore }: any) {
    updateStore((prev: any) => ({
      ...prev,
      teams: prev.teams.map((t: any) => t.id === teamId ? {
        ...t,
        penaltyUntil: null
      } : t)
    }));
  },

  releaseHint(levelId: string, hintText: string, { updateStore }: any) {
    updateStore((prev: any) => {
      const next = { ...prev };
      const newHint = {
        id: Math.random().toString(36).substr(2, 9),
        levelId,
        hintText,
        isReleased: true,
        releasedAt: new Date().toISOString()
      };
      next.hints = [...next.hints, newHint];
      return next;
    });
  }
};
