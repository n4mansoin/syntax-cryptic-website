
'use client';

import { ATTEMPT_LIMIT_PER_MINUTE } from '@/utils/constants';
import { StoreState } from '@/lib/local-store';
import { doc, setDoc, updateDoc, collection, Firestore, getDoc, addDoc } from 'firebase/firestore';
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

    if (team.penaltyUntil && new Date(team.penaltyUntil) > now) {
      return { success: false, message: "Terminal Signal Suppressed." };
    }

    const oneMinuteAgo = new Date(now.getTime() - 60000);
    const recentAttempts = state.attempts.filter(a => a.teamId === teamId && new Date(a.timestamp) > oneMinuteAgo);

    if (recentAttempts.length >= ATTEMPT_LIMIT_PER_MINUTE) {
      await localApi.flagTeam(db, teamId, "Rate Limit Breach: Signal Flood");
      return { success: false, message: "Protocol Violation: Signal Flood Detected.", flagged: true };
    }

    const normalizedInput = userInput.trim().toLowerCase();
    const validAnswers = (level.correctAnswer || "")
      .toLowerCase()
      .split('|')
      .map((a: string) => a.trim())
      .filter((a: string) => a.length > 0);

    const isCorrect = validAnswers.includes(normalizedInput);

    const attemptsCol = collection(db, 'teams', teamId, 'attempts');
    const attemptData = {
      teamId,
      levelId,
      timestamp: now.toISOString(),
      isCorrect,
      ip: 'remote'
    };

    try {
      await addDoc(attemptsCol, attemptData);
    } catch (err) {
      errorEmitter.emit('permission-error', new FirestorePermissionError({
        path: attemptsCol.path,
        operation: 'create',
        requestResourceData: attemptData
      }));
    }

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

  async flagTeam(db: Firestore, teamId: string, reason: string) {
    const now = new Date();
    const flagsCol = collection(db, 'flags');
    const flagData = {
      teamId,
      reason,
      timestamp: now.toISOString()
    };

    try {
      await addDoc(flagsCol, flagData);
      const teamRef = doc(db, 'teams', teamId);
      const teamSnap = await getDoc(teamRef);
      if (teamSnap.exists()) {
        const currentCount = teamSnap.data().flagCount || 0;
        await updateDoc(teamRef, { flagCount: currentCount + 1 });
      }
    } catch (err) {
      errorEmitter.emit('permission-error', new FirestorePermissionError({
        path: flagsCol.path,
        operation: 'create',
        requestResourceData: flagData
      }));
    }
  },

  async applyPenalty(db: Firestore, teamId: string, mins: number) {
    const now = new Date();
    const teamRef = doc(db, 'teams', teamId);
    try {
      await updateDoc(teamRef, {
        penaltyUntil: new Date(now.getTime() + mins * 60000).toISOString()
      });
    } catch (err) {
      errorEmitter.emit('permission-error', new FirestorePermissionError({
        path: teamRef.path,
        operation: 'update'
      }));
    }
  },

  async removePenalty(db: Firestore, teamId: string) {
    const teamRef = doc(db, 'teams', teamId);
    try {
      await updateDoc(teamRef, {
        penaltyUntil: null
      });
    } catch (err) {
      errorEmitter.emit('permission-error', new FirestorePermissionError({
        path: teamRef.path,
        operation: 'update'
      }));
    }
  },

  async releaseHint(db: Firestore, levelId: string, hintText: string) {
    const hintsCol = collection(db, 'levels', levelId, 'hints');
    const hintData = {
      levelId,
      hintText,
      isReleased: true,
      releasedAt: new Date().toISOString()
    };

    try {
      await addDoc(hintsCol, hintData);
    } catch (err) {
      errorEmitter.emit('permission-error', new FirestorePermissionError({
        path: hintsCol.path,
        operation: 'create',
        requestResourceData: hintData
      }));
    }
  }
};
