import NextAuth, { AuthOptions } from 'next-auth';
import { SESSION_MAX_AGE, fastTrakProvider, jwtCallback, sessionCallback } from '@/lib/auth';
import { config } from '@/lib/config';

/**
 * NextAuth configuration
 * 
 * This file is the entry point for NextAuth.js authentication.
 * All business logic has been extracted to separate service modules for better
 * separation of concerns and testability.
 * 
 * @see /lib/auth/providers.ts - Authentication providers
 * @see /lib/auth/callbacks.ts - JWT and session callbacks
 * @see /lib/auth/token-service.ts - Token management
 * @see /lib/auth/user-service.ts - User database operations
 */

export const authOptions: AuthOptions = {
    providers: [fastTrakProvider],
    session: {
        strategy: 'jwt' as const,
        maxAge: SESSION_MAX_AGE,
    },
    callbacks: {
        jwt: jwtCallback,
        session: sessionCallback,
    },
    secret: config.nextAuthSecret,
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };