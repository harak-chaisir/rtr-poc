import { encrypt, decrypt } from '@/lib/crypto';
import { refreshFastTrakToken } from '@/lib/fasttrak';
import { TOKEN_REFRESH_BUFFER_MS } from './constants';
import type { JWT } from 'next-auth/jwt';

/**
 * Token management service
 * Handles encryption, decryption, and refresh logic for tokens
 */

export interface TokenData {
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresAt: number;
  refreshTokenExpiresAt: number;
}

/**
 * Encrypts token data for secure storage in JWT
 * 
 * @param accessToken - Plain text access token
 * @param refreshToken - Plain text refresh token
 * @param accessTokenExpirationSeconds - Access token TTL in seconds
 * @param refreshTokenExpirationSeconds - Refresh token TTL in seconds
 * @returns Encrypted token data with expiration timestamps
 */
export function encryptTokens(
  accessToken: string,
  refreshToken: string,
  accessTokenExpirationSeconds: number,
  refreshTokenExpirationSeconds: number
): TokenData {
  const now = Date.now();

  return {
    accessToken: encrypt(accessToken),
    refreshToken: encrypt(refreshToken),
    accessTokenExpiresAt: now + accessTokenExpirationSeconds * 1000,
    refreshTokenExpiresAt: now + refreshTokenExpirationSeconds * 1000,
  };
}

/**
 * Checks if access token needs refresh
 * Uses buffer time to refresh before actual expiration
 * 
 * @param token - JWT token object
 * @returns true if token needs refresh
 */
export function shouldRefreshToken(token: JWT): boolean {
  const now = Date.now();
  
  // No token or expiration time
  if (!token.accessToken || !token.accessTokenExpiresAt) {
    return true;
  }

  // Check if token is about to expire (within buffer time)
  return now >= token.accessTokenExpiresAt - TOKEN_REFRESH_BUFFER_MS;
}

/**
 * Refreshes an expired or expiring access token
 * 
 * @param fasttrakId - User's FastTrak ID
 * @param encryptedRefreshToken - Encrypted refresh token from JWT
 * @returns New encrypted token data
 * @throws Error if refresh fails
 */
export async function refreshAccessToken(
  fasttrakId: string,
  encryptedRefreshToken: string
): Promise<TokenData> {
  const refreshToken = decrypt(encryptedRefreshToken);
  const refreshed = await refreshFastTrakToken(fasttrakId, refreshToken);

  const now = Date.now();

  return {
    accessToken: encrypt(refreshed.accessToken),
    refreshToken: encrypt(refreshed.refreshToken || refreshToken),
    accessTokenExpiresAt: now + refreshed.accessTokenExpirationSeconds * 1000,
    refreshTokenExpiresAt: now + refreshed.refreshTokenExpirationSeconds * 1000,
  };
}

/**
 * Decrypts access token for use in session
 * 
 * @param encryptedToken - Encrypted access token
 * @returns Decrypted access token
 * @throws Error if decryption fails
 */
export function decryptAccessToken(encryptedToken: string): string {
  return decrypt(encryptedToken);
}
