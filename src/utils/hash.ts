/**
 * Generates a SHA-256 hash of a string.
 */
export async function sha256(message: string): Promise<string> {
  const msgUint8 = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
}

/**
 * Normalizes input for comparison.
 */
export function normalizeAnswer(answer: string): string {
  return answer.toLowerCase().trim();
}

const SYNC_KEY = "intra_syntax_secret_2026";

/**
 * Simple XOR-based encryption for prototype security.
 */
export function encryptAnswer(text: string): string {
  return btoa(
    text.split('').map((char, i) => 
      String.fromCharCode(char.charCodeAt(0) ^ SYNC_KEY.charCodeAt(i % SYNC_KEY.length))
    ).join('')
  );
}

/**
 * Decrypts the stored answer string.
 */
export function decryptAnswer(encoded: string): string {
  try {
    const decoded = atob(encoded);
    return decoded.split('').map((char, i) => 
      String.fromCharCode(char.charCodeAt(0) ^ SYNC_KEY.charCodeAt(i % SYNC_KEY.length))
    ).join('');
  } catch (e) {
    return encoded; // Fallback for unencrypted strings
  }
}
