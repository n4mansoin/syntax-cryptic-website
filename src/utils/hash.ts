/**
 * Normalizes input for comparison.
 */
export function normalizeAnswer(answer: string): string {
  return answer.toLowerCase().trim();
}

/**
 * Generates a SHA-256 hash of a string using a salt and a secret key.
 * This is used for both answer verification and password security.
 */
export async function sha256(message: string): Promise<string> {
  const msgUint8 = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
}

/**
 * Advanced Cryptic Hash for answers.
 * answerHash = SHA256(salt + SECRET_KEY + correctAnswerLowercase)
 */
export async function generateAnswerHash(input: string, salt: string, secretKey: string): Promise<string> {
  const normalized = normalizeAnswer(input);
  return await sha256(salt + secretKey + normalized);
}
