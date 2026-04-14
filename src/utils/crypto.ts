
'use client';

import CryptoJS from 'crypto-js';
import { SECRET_KEY } from './constants';

/**
 * Encrypts an answer with a salt using AES.
 */
export function encryptAnswer(answer: string, salt: string): string {
  if (!answer) return '';
  const normalized = answer.toLowerCase().trim();
  // We prefix with salt to ensure unique ciphertexts even for same answers
  return CryptoJS.AES.encrypt(salt + normalized, SECRET_KEY).toString();
}

/**
 * Decrypts a stored ciphertext and extracts the original answer.
 */
export function decryptAnswer(encryptedAnswer: string, salt: string): string {
  if (!encryptedAnswer) return '';
  try {
    const bytes = CryptoJS.AES.decrypt(encryptedAnswer, SECRET_KEY);
    const decrypted = bytes.toString(CryptoJS.enc.Utf8);
    
    if (!decrypted) return '';
    
    // Remove the salt prefix to get the actual answer
    return decrypted.startsWith(salt) ? decrypted.slice(salt.length) : decrypted;
  } catch (error) {
    return '';
  }
}
