import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;
const SALT_LENGTH = 16;

function getKey(secret: string, salt: Buffer): Buffer {
  return scryptSync(secret, salt, 32) as Buffer;
}

/**
 * Encrypt a plaintext string using AES-256-GCM.
 * Returns a base64 string: salt(16) + iv(12) + authTag(16) + ciphertext
 */
export function encrypt(plaintext: string, secret: string): string {
  const salt = randomBytes(SALT_LENGTH);
  const key = getKey(secret, salt);
  const iv = randomBytes(IV_LENGTH);

  const cipher = createCipheriv(ALGORITHM, key, iv, { authTagLength: AUTH_TAG_LENGTH });
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();

  const packed = Buffer.concat([salt, iv, authTag, encrypted]);
  return packed.toString("base64");
}

/**
 * Decrypt a base64 string encrypted with encrypt().
 */
export function decrypt(encryptedBase64: string, secret: string): string {
  const packed = Buffer.from(encryptedBase64, "base64");

  const salt = packed.subarray(0, SALT_LENGTH);
  const iv = packed.subarray(SALT_LENGTH, SALT_LENGTH + IV_LENGTH);
  const authTag = packed.subarray(SALT_LENGTH + IV_LENGTH, SALT_LENGTH + IV_LENGTH + AUTH_TAG_LENGTH);
  const ciphertext = packed.subarray(SALT_LENGTH + IV_LENGTH + AUTH_TAG_LENGTH);

  const key = getKey(secret, salt);
  const decipher = createDecipheriv(ALGORITHM, key, iv, { authTagLength: AUTH_TAG_LENGTH });
  decipher.setAuthTag(authTag);

  const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return decrypted.toString("utf8");
}
