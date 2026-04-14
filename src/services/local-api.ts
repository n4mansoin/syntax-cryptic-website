'use client';

import { decryptAnswer } from '@/utils/crypto';
import { ATTEMPT_LIMIT_PER_MINUTE, FLAGS_UNTIL_PENALTY, PENALTY_DURATION_MINUTES } from '@/utils/constants';
import { StoreState, Attempt, Flag, Hint } from '@/lib/local-store';
import { doc, setDoc, updateDoc, collection, addDoc, Firestore, serverTimestamp } from 'firebase/firestore';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

export const localApi = {
  async submitAnswer(
    db: Firestore,
    teamId: string, 
    levelId: string, 
    userInput: string, 
    state: StoreState
  ) {
    const team = state.teams.find(t => t.id === teamId);
    if (!team) return { success: false, message: "Identity mismatch." };

    const now = new Date();

    // 1. Check Penalty
    if (team.penaltyUntil && new Date(team.penaltyUntil) > now) {
      return { success: false, message: "Terminal Signal Suppressed." };
    }

    // 2. Rate Limiting (Using global state sync)
    const oneMinuteAgo = new Date(now.getTime() - 60000);
    const recentAttempts = state.attempts.filter(a => a.teamId === teamId && new Date(a.timestamp) > oneMinuteAgo);

    if (recentAttempts.length >= ATTEMPT_LIMIT_PER_MINUTE) {
      this.flagTeam(db, teamId, "Rate Limit Breach: Signal Flood");
      return { success: false, message: "Protocol Violation: Signal Flood Detected.", flagged: true };
    }

    // 3. Decryption & Verification
    const level = state.levels.find(l => l.id === levelId);
    if (!level) return { success: false, message: "Signal synchronization failed." };

    const normalizedInput = userInput.trim().toLowerCase();
    const decryptedString = decryptAnswer(level.encryptedAnswer || '', level.salt || '');
    
    if (!decryptedString) {
      return { success: false, message: "Security Layer Error. Reset System via Admin." };
    }

    const validAnswers = decryptedString.toLowerCase().split('|').map(a => a.trim());
    const isCorrect = validAnswers.includes(normalizedInput);

    // 4. Cloud Mutation
    const attemptRef = doc(collection(db, 'attempts'));
    const attemptData = {
      id: attemptRef.id,
      teamId,
      levelId,
      timestamp: now.toISOString(),
      isCorrect
    };

    setDoc(attemptRef, attemptData).catch(err => {
      errorEmitter.emit('permission-error', new FirestorePermissionError({
        path: attemptRef.path,
        operation: 'create',
        requestResourceData: attemptData
      }));
    });

    if (isCorrect) {
      const teamRef = doc(db, 'teams', teamId);
      updateDoc(teamRef, {
        currentLevel: team.currentLevel + 1,
        lastSolvedAt: now.toISOString(),
        flagCount: 0 
      }).catch(err => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
          path: teamRef.path,
          operation: 'update'
        }));
      });
    }

    return isCorrect ? 
      { success: true, message: "Signal Decrypted. Security Layer Breached." } : 
      { success: false, message: "Invalid Key Code. Access Denied." };
  },

  flagTeam(db: Firestore, teamId: string, reason: string) {
    const now = new Date();
    const flagRef = doc(collection(db, 'flags'));
    const flagData = {
      id: flagRef.id,
      teamId,
      reason,
      timestamp: now.toISOString()
    };

    setDoc(flagRef, flagData).catch(err => {
      errorEmitter.emit('permission-error', new FirestorePermissionError({
        path: flagRef.path,
        operation: 'create',
        requestResourceData: flagData
      }));
    });

    // We can't easily fetch latest count here without a transaction or state ref,
    // so we assume the caller is aware of the state or use a simple update increment.
    // For simplicity in this local-api pattern, we update based on current state.
  },

  applyPenalty(db: Firestore, teamId: string, mins: number) {
    const now = new Date();
    const teamRef = doc(db, 'teams', teamId);
    updateDoc(teamRef, {
      penaltyUntil: new Date(now.getTime() + mins * 60000).toISOString()
    }).catch(err => {
      errorEmitter.emit('permission-error', new FirestorePermissionError({
        path: teamRef.path,
        operation: 'update'
      }));
    });
  },

  removePenalty(db: Firestore, teamId: string) {
    const teamRef = doc(db, 'teams', teamId);
    updateDoc(teamRef, {
      penaltyUntil: null
    }).catch(err => {
      errorEmitter.emit('permission-error', new FirestorePermissionError({
        path: teamRef.path,
        operation: 'update'
      }));
    });
  },

  releaseHint(db: Firestore, levelId: string, hintText: string) {
    const hintRef = doc(collection(db, 'hints'));
    const hintData = {
      id: hintRef.id,
      levelId,
      hintText,
      isReleased: true,
      releasedAt: new Date().toISOString()
    };

    setDoc(hintRef, hintData).catch(err => {
      errorEmitter.emit('permission-error', new FirestorePermissionError({
        path: hintRef.path,
        operation: 'create',
        requestResourceData: hintData
      }));
    });
  }
};
