/**
 * Client-side encryption utilities for password items.
 * Uses Web Crypto API: PBKDF2 for key derivation, AES-256-GCM for encryption.
 */

const ENCRYPTION_PREFIX = "enc:v1:";
const PBKDF2_ITERATIONS = 600_000;
const SALT_LENGTH = 16;
const IV_LENGTH = 12;

export function generateSalt(): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
}

export async function deriveKey(
  masterPassword: string,
  salt: Uint8Array
): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    encoder.encode(masterPassword),
    "PBKDF2",
    false,
    ["deriveKey"]
  );

  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: salt.buffer as ArrayBuffer,
      iterations: PBKDF2_ITERATIONS,
      hash: "SHA-256",
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

export async function encrypt(
  plaintext: string,
  key: CryptoKey
): Promise<string> {
  const encoder = new TextEncoder();
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));

  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    encoder.encode(plaintext)
  );

  // Concatenate IV + ciphertext, encode as base64
  const combined = new Uint8Array(iv.length + ciphertext.byteLength);
  combined.set(iv);
  combined.set(new Uint8Array(ciphertext), iv.length);

  const base64 = btoa(Array.from(combined, (b) => String.fromCharCode(b)).join(""));
  return `${ENCRYPTION_PREFIX}${base64}`;
}

export async function decrypt(
  encrypted: string,
  key: CryptoKey
): Promise<string> {
  if (!isEncrypted(encrypted)) {
    return encrypted;
  }

  const base64 = encrypted.slice(ENCRYPTION_PREFIX.length);
  const combined = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));

  const iv = combined.slice(0, IV_LENGTH);
  const ciphertext = combined.slice(IV_LENGTH);

  const plaintext = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv },
    key,
    ciphertext
  );

  return new TextDecoder().decode(plaintext);
}

export function isEncrypted(value: string): boolean {
  return value.startsWith(ENCRYPTION_PREFIX);
}

/** Encode salt to base64 for storage */
export function encodeSalt(salt: Uint8Array): string {
  return btoa(Array.from(salt, (b) => String.fromCharCode(b)).join(""));
}

/** Decode base64 salt */
export function decodeSalt(base64: string): Uint8Array {
  return Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
}
