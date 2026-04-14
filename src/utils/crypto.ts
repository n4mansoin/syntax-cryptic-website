
'use client';

import CryptoJS from 'crypto-js';
import { SECRET_KEY } from './constants';

/**
 * Encrypts an answer with a salt using AES.
 * Note: This is intended for pre-encrypting JSON data.
 */
export function encryptAnswer(answer: string, salt: string): string {
  const normalized = answer.toLowerCase().trim();
  return CryptoJS.AES.encrypt(salt + normalized, SECRET_KEY).toString();
}

/**
 * Decrypts a stored ciphertext and extracts the original answer.
 * Now handles empty/null inputs gracefully.
 */
export function decryptAnswer(encryptedAnswer: string, salt: string): string {
  if (!encryptedAnswer) return '';
  try {
    const bytes = CryptoJS.AES.decrypt(encryptedAnswer, SECRET_KEY);
    const decrypted = bytes.toString(CryptoJS.enc.Utf8);
    
    if (!decrypted) {
      // Fallback for non-encrypted legacy data during development
      return encryptedAnswer;
    }
    
    // Remove the salt prefix
    return decrypted.startsWith(salt) ? decrypted.slice(salt.length) : decrypted;
  } catch (error) {
    // Return original if decryption fails (safeguard for development state)
    return encryptedAnswer;
  }
}
