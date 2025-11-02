import { z } from 'zod';

/**
 * Configuration Service
 * Centralized, validated configuration management
 * 
 * All environment variables are validated at startup
 * Provides type-safe access to configuration values
 */

/**
 * Configuration schema with validation rules
 */
const configSchema = z.object({
  // Environment
  nodeEnv: z
    .enum(['development', 'production', 'test'])
    .default('development')
    .describe('Node environment'),

  // Database
  mongodbUri: z
    .string()
    .url('MONGODB_URI must be a valid URL')
    .describe('MongoDB connection URI'),

  // NextAuth
  nextAuthSecret: z
    .string()
    .min(32, 'NEXTAUTH_SECRET must be at least 32 characters')
    .describe('NextAuth.js secret for JWT encryption'),
  
  nextAuthUrl: z
    .string()
    .url('NEXTAUTH_URL must be a valid URL')
    .default('http://localhost:3000')
    .describe('Base URL of the application'),

  // FastTrak API
  fastTrakApi: z
    .string()
    .url('FASTTRAK_API must be a valid URL')
    .default('http://localhost:3001')
    .describe('FastTrak API base URL'),

  // Encryption
  tokenEncryptionKey: z
    .string()
    .min(32, 'TOKEN_ENCRYPTION_KEY must be at least 32 characters')
    .describe('Base64-encoded encryption key for token encryption (32 bytes when decoded)'),

  // Logging
  logLevel: z
    .enum(['error', 'warn', 'info', 'verbose', 'debug', 'silly'])
    .default('info')
    .describe('Logging level'),

  // Security & Session
  sessionMaxAge: z
    .coerce
    .number()
    .int()
    .positive()
    .default(3600)
    .describe('Session max age in seconds (default: 3600 = 1 hour)'),
  
  tokenRefreshBufferMs: z
    .coerce
    .number()
    .int()
    .nonnegative()
    .default(10000)
    .describe('Token refresh buffer time in milliseconds (default: 10000 = 10 seconds)'),

  // Rate Limiting (for future implementation)
  rateLimitEnabled: z
    .string()
    .transform((val) => val !== 'false')
    .pipe(z.boolean())
    .default(true)
    .describe('Enable rate limiting'),
  
  rateLimitWindowMs: z
    .coerce
    .number()
    .int()
    .positive()
    .default(900000)
    .describe('Rate limit window in milliseconds (default: 900000 = 15 minutes)'),
  
  rateLimitMax: z
    .coerce
    .number()
    .int()
    .positive()
    .default(100)
    .describe('Maximum requests per rate limit window (default: 100)'),
});

/**
 * Raw configuration from environment variables
 */
function getRawConfig() {
  return {
    nodeEnv: process.env.NODE_ENV,
    mongodbUri: process.env.MONGODB_URI,
    nextAuthSecret: process.env.NEXTAUTH_SECRET,
    nextAuthUrl: process.env.NEXTAUTH_URL,
    fastTrakApi: process.env.FASTTRAK_API,
    tokenEncryptionKey: process.env.TOKEN_ENCRYPTION_KEY,
    logLevel: process.env.LOG_LEVEL,
    sessionMaxAge: process.env.SESSION_MAX_AGE,
    tokenRefreshBufferMs: process.env.TOKEN_REFRESH_BUFFER_MS,
    rateLimitEnabled: process.env.RATE_LIMIT_ENABLED,
    rateLimitWindowMs: process.env.RATE_LIMIT_WINDOW_MS,
    rateLimitMax: process.env.RATE_LIMIT_MAX,
  };
}

/**
 * Validates and loads configuration
 * Throws descriptive errors if validation fails
 */
function loadConfig() {
  const rawConfig = getRawConfig();

  try {
    return configSchema.parse(rawConfig);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errorMessages = error.issues.map((err) => {
        const path = err.path.join('.');
        return `  - ${path}: ${err.message}`;
      }).join('\n');

      throw new Error(
        `Configuration validation failed:\n${errorMessages}\n\n` +
        'Please check your environment variables in .env.local'
      );
    }
    throw error;
  }
}

/**
 * Validated configuration object
 * Throws error on import if configuration is invalid
 */
export const config = loadConfig();

/**
 * TypeScript type for configuration
 */
export type Config = z.infer<typeof configSchema>;

/**
 * Helper to check if running in production
 */
export const isProduction = config.nodeEnv === 'production';

/**
 * Helper to check if running in development
 */
export const isDevelopment = config.nodeEnv === 'development';

/**
 * Helper to check if running in test
 */
export const isTest = config.nodeEnv === 'test';

/**
 * Helper to validate encryption key length
 * Called separately as it requires decoding the base64 key
 */
export function validateEncryptionKey(): void {
  try {
    const key = Buffer.from(config.tokenEncryptionKey, 'base64');
    if (key.length !== 32) {
      throw new Error(
        `TOKEN_ENCRYPTION_KEY must be exactly 32 bytes when decoded from base64. ` +
        `Current length: ${key.length} bytes`
      );
    }
  } catch (error) {
    if (error instanceof Error && error.message.includes('Invalid base64')) {
      throw new Error(
        'TOKEN_ENCRYPTION_KEY must be a valid base64-encoded string'
      );
    }
    throw error;
  }
}

