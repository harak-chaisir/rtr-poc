import crypto from 'crypto';
import { config, validateEncryptionKey } from '@/lib/config';

// Encryption constants
const ENCRYPTION_ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // 96 bits for GCM mode
const AUTH_TAG_LENGTH = 16; // 128 bits
const KEY_LENGTH = 32; // 256 bits

// Validate encryption key on module load
validateEncryptionKey();

// Get encryption key from config
const KEY = Buffer.from(config.tokenEncryptionKey, 'base64');

/**
 * Encrypts text using AES-256-GCM
 * @param text - Plain text to encrypt
 * @returns Base64 encoded encrypted data (IV + Auth Tag + Ciphertext)
 */
export function encrypt(text: string) {
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ENCRYPTION_ALGORITHM, KEY, iv)
    const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    return Buffer.concat([iv, tag, encrypted]).toString('base64');
}

/**
 * Decrypts data encrypted with the encrypt function
 * @param data - Base64 encoded encrypted data
 * @returns Decrypted plain text
 */
export function decrypt(data: string) {
    const b = Buffer.from(data, 'base64');
    const iv = b.slice(0, IV_LENGTH);
    const tag = b.slice(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
    const encrypted = b.slice(IV_LENGTH + AUTH_TAG_LENGTH);
    const decipher = crypto.createDecipheriv(ENCRYPTION_ALGORITHM, KEY, iv);
decipher.setAuthTag(tag);
const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
return decrypted.toString('utf8');
}