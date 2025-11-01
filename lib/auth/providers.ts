import CredentialsProvider from 'next-auth/providers/credentials';
import { authenticateFastTrak } from '@/lib/fasttrak';
import { upsertUser } from './user-service';

/**
 * FastTrak credentials provider
 * Handles authentication with FastTrak API
 */

export const fastTrakProvider = CredentialsProvider({
  id: 'fasttrak',
  name: 'FastTrak',
  credentials: {
    username: { label: "Username", type: "text" },
    password: { label: "Password", type: "password" }
  },
  async authorize(credentials) {
    if (!credentials) return null;

    try {
      // Authenticate with FastTrak API
      const fasttrak = await authenticateFastTrak(
        credentials.username,
        credentials.password
      );

      // Create or update user in database
      const user = await upsertUser(fasttrak.id, fasttrak.roles);

      // Calculate expiration timestamps
      const now = Date.now();
      const accessTokenExpiresAt = now + fasttrak.accessTokenExpirationSeconds * 1000;
      // Note: FastTrak API has typo in field name "refreshTokenExpiratinSeconds"
      const refreshTokenExpiresAt = now + fasttrak.refreshTokenExpiratinSeconds * 1000;

      // Return user with tokens for JWT callback
      return {
        id: user.id,
        fasttrakId: user.fasttrakId,
        roles: user.roles,
        name: user.name,
        email: user.email,
        _accessToken: fasttrak.accessToken,
        _refreshToken: fasttrak.refreshToken,
        _accessTokenExpiresAt: accessTokenExpiresAt,
        _refreshTokenExpiresAt: refreshTokenExpiresAt,
      };
    } catch (error) {
      // Log authentication errors in development
      if (process.env.NODE_ENV === 'development') {
        console.error('[NextAuth] Authentication failed:', error);
      }
      return null;
    }
  },
});
