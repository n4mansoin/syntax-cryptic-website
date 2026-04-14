'use client';

import { ATTEMPT_LIMIT_PER_MINUTE } from '@/utils/constants';
import { StoreState } from '@/lib/local-store';
import { doc, setDoc, updateDoc, collection, Firestore, getDoc } from 'firebase/firestore';
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
    const now = new Date();
    
    // 1. Fetch source-of-truth data directly from Firestore for verification
    const teamRef = doc(db, 'teams', teamId);
    const levelRef = doc(db, 'levels', levelId);
    
    const [teamSnap, levelSnap] = await Promise.all([
      getDoc(teamRef),
      getDoc(levelRef)
    ]);

    if (!teamSnap.exists()) return { success: false, message: "Identity mismatch. Please re-login." };
    if (!levelSnap.exists()) return { success: false, message: "Level data synchronization failed." };

    const team = teamSnap.data();
    const level = levelSnap.data();

    // 2. Check Penalty
    if (team.penaltyUntil && new Date(team.penaltyUntil) > now) {
      return { success: false, message: "Terminal Signal Suppressed." };
    }

    // 3. Rate Limiting (Using state for historical attempts is fine)
    const oneMinuteAgo = new Date(now.getTime() - 60000);
    const recentAttempts = state.attempts.filter(a => a.teamId === teamId && new Date(a.timestamp) > oneMinuteAgo);

    if (recentAttempts.length >= ATTEMPT_LIMIT_PER_MINUTE) {
      localApi.flagTeam(db, teamId, "Rate Limit Breach: Signal Flood");
      return { success: false, message: "Protocol Violation: Signal Flood Detected.", flagged: true };
    }

    // 4. Verification Logic
    const normalizedInput = userInput.trim().toLowerCase();
    const validAnswers = (level.correctAnswer || "")
      .toLowerCase()
      .split('|')
      .map((a: string) => a.trim())
      .filter((a: string) => a.length > 0);

    const isCorrect = validAnswers.includes(normalizedInput);

    // 5. Cloud Mutation - Correct sub-collection path
    const attemptRef = doc(collection(db, 'teams', teamId, 'attempts'));
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
      updateDoc(teamRef, {
        currentLevel: (team.currentLevel || 1) + 1,
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
