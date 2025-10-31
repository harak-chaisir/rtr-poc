import crypto from 'crypto';

// Encryption constants
const ENCRYPTION_ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // 96 bits for GCM mode
const AUTH_TAG_LENGTH = 16; // 128 bits
const KEY_LENGTH = 32; // 256 bits

const KEY_BASE64 = process.env.TOKEN_ENCRYPTION_KEY!;
if (!KEY_BASE64) {
    throw new Error('Please define the TOKEN_ENCRYPTION_KEY environment variable inside .env.local');
}
const KEY = Buffer.from(KEY_BASE64, 'base64');
if (KEY.length !== KEY_LENGTH) {
    throw new Error(`TOKEN_ENCRYPTION_KEY must be ${KEY_LENGTH} bytes when decoded from base64`);
}

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