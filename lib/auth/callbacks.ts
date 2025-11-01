import type { User as NextAuthUser } from 'next-auth';
import type { JWT } from 'next-auth/jwt';
import type { Session } from 'next-auth';
import { 
  encryptTokens, 
  shouldRefreshToken, 
  refreshAccessToken,
  decryptAccessToken 
} from './token-service';

/**
 * NextAuth callbacks
 * Extracted for better separation of concerns
 */

/**
 * JWT callback - handles token persistence and refresh
 * Called whenever a JWT is created or updated
 * 
 * @param token - Existing JWT token
 * @param user - User object (only on sign in)
 * @returns Updated JWT token
 */
export async function jwtCallback({ 
  token, 
  user 
}: { 
  token: JWT; 
  user?: NextAuthUser;
}): Promise<JWT> {
  // Initial sign in - store user data and encrypted tokens
  if (user) {
    token.rtrUserId = user.id;
    token.roles = user.roles;
    token.fasttrakId = user.fasttrakId;

    // Encrypt and store tokens
    const encryptedTokens = encryptTokens(
      user._accessToken,
      user._refreshToken,
      Math.floor((user._accessTokenExpiresAt - Date.now()) / 1000),
      Math.floor((user._refreshTokenExpiresAt - Date.now()) / 1000)
    );

    token.accessToken = encryptedTokens.accessToken;
    token.refreshToken = encryptedTokens.refreshToken;
    token.accessTokenExpiresAt = encryptedTokens.accessTokenExpiresAt;
    token.refreshTokenExpiresAt = encryptedTokens.refreshTokenExpiresAt;

    return token;
  }

  // Check if token needs refresh
  if (!shouldRefreshToken(token)) {
    return token;
  }

  // Refresh token logic
  try {
    if (!token.refreshToken || !token.fasttrakId) {
      throw new Error('No refresh token or FastTrak ID available');
    }

    const newTokens = await refreshAccessToken(
      token.fasttrakId as string,
      token.refreshToken
    );

    token.accessToken = newTokens.accessToken;
    token.refreshToken = newTokens.refreshToken;
    token.accessTokenExpiresAt = newTokens.accessTokenExpiresAt;
    token.refreshTokenExpiresAt = newTokens.refreshTokenExpiresAt;

    return token;
  } catch (error) {
    // Log error for debugging (in production, use proper logging service)
    if (process.env.NODE_ENV === 'development') {
      console.error('[NextAuth] Token refresh failed:', error);
    }

    // Clear tokens and set error state
    delete token.accessToken;
    delete token.refreshToken;
    delete token.accessTokenExpiresAt;
    delete token.refreshTokenExpiresAt;
    token.error = 'RefreshAccessTokenError';

    return token;
  }
}

/**
 * Session callback - prepares session data for client
 * Called whenever a session is accessed
 * 
 * @param session - Session object
 * @param token - JWT token
 * @returns Updated session with user data and decrypted access token
 */
export async function sessionCallback({ 
  session, 
  token 
}: { 
  session: Session; 
  token: JWT;
}): Promise<Session> {
  session.user = session.user || {};
  session.user.id = token.rtrUserId || '';
  session.user.roles = token.roles || [];

  // Decrypt access token for session (only if valid)
  if (token.accessToken && !token.error) {
    try {
      session.accessToken = decryptAccessToken(token.accessToken);
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('[NextAuth] Failed to decrypt access token:', error);
      }
      session.error = 'TokenDecryptionError';
    }
  }

  session.error = token.error;
  return session;
}
