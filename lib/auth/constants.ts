/**
 * Authentication constants
 * Centralized configuration for NextAuth
 */

import { config } from '@/lib/config';

export const SESSION_MAX_AGE = config.sessionMaxAge; // in seconds
export const TOKEN_REFRESH_BUFFER_MS = config.tokenRefreshBufferMs; // in milliseconds
