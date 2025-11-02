# Configuration Management

## Overview

Centralized configuration management with validation using Zod. All environment variables are validated at startup, providing type safety and clear error messages.

---

## Features

✅ **Type-safe configuration** - Full TypeScript support  
✅ **Validation at startup** - Catches configuration errors early  
✅ **Sensible defaults** - Works out of the box for development  
✅ **Clear error messages** - Tells you exactly what's wrong  
✅ **Single source of truth** - No more scattered `process.env` calls  

---

## Configuration Schema

### Required Environment Variables

```bash
# Database
MONGODB_URI=mongodb://localhost:27017/rtr

# NextAuth
NEXTAUTH_SECRET=your-secret-key-at-least-32-characters-long

# Encryption
TOKEN_ENCRYPTION_KEY=base64-encoded-32-byte-key
```

### Optional Environment Variables (with defaults)

```bash
# Environment
NODE_ENV=development  # default: development

# NextAuth
NEXTAUTH_URL=http://localhost:3000  # default: http://localhost:3000

# FastTrak API
FASTTRAK_API=http://localhost:3001  # default: http://localhost:3000

# Logging
LOG_LEVEL=info  # default: info (options: error, warn, info, verbose, debug, silly)

# Session Configuration
SESSION_MAX_AGE=3600  # default: 3600 seconds (1 hour)
TOKEN_REFRESH_BUFFER_MS=10000  # default: 10000 milliseconds (10 seconds)

# Rate Limiting (future)
RATE_LIMIT_ENABLED=true  # default: true
RATE_LIMIT_WINDOW_MS=900000  # default: 900000 milliseconds (15 minutes)
RATE_LIMIT_MAX=100  # default: 100 requests per window
```

---

## Usage

### Import and Use

```typescript
import { config } from '@/lib/config';

// Use config values
await mongoose.connect(config.mongodbUri);
const apiUrl = config.fastTrakApi;

// Use helper functions
import { isProduction, isDevelopment, isTest } from '@/lib/config';

if (isProduction) {
  // Production-specific code
}

if (isDevelopment) {
  // Development-specific code
}
```

### Before vs After

#### ❌ Before (Scattered, unvalidated)
```typescript
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/rtr';
if (!MONGODB_URI) {
  throw new Error('MONGODB_URI not set');
}

const logLevel = process.env.LOG_LEVEL || 'info';
const isProduction = process.env.NODE_ENV === 'production';
```

#### ✅ After (Centralized, validated)
```typescript
import { config, isProduction } from '@/lib/config';

await mongoose.connect(config.mongodbUri);  // Validated, guaranteed to exist
const logLevel = config.logLevel;  // Type-safe
if (isProduction) {  // Helper function
  // ...
}
```

---

## Configuration Values

### Database
- **`mongodbUri`** (required): MongoDB connection URI
  - Must be a valid URL
  - Example: `mongodb://localhost:27017/rtr`

### NextAuth
- **`nextAuthSecret`** (required): Secret for JWT encryption
  - Minimum 32 characters
  - Generate: `openssl rand -base64 32`
  
- **`nextAuthUrl`** (optional): Base URL of the application
  - Default: `http://localhost:3000`
  - Used for CORS and callback URLs

### FastTrak API
- **`fastTrakApi`** (optional): FastTrak API base URL
  - Default: `http://localhost:3001`

### Encryption
- **`tokenEncryptionKey`** (required): Base64-encoded encryption key
  - Must be exactly 32 bytes when decoded from base64
  - Generate: `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`

### Logging
- **`logLevel`** (optional): Logging level
  - Default: `info`
  - Options: `error`, `warn`, `info`, `verbose`, `debug`, `silly`

### Session Configuration
- **`sessionMaxAge`** (optional): Session max age in seconds
  - Default: `3600` (1 hour)
  
- **`tokenRefreshBufferMs`** (optional): Buffer time before token expires
  - Default: `10000` (10 seconds)
  - Tokens are refreshed this many milliseconds before expiration

### Rate Limiting (Future)
- **`rateLimitEnabled`** (optional): Enable rate limiting
  - Default: `true`
  
- **`rateLimitWindowMs`** (optional): Rate limit window in milliseconds
  - Default: `900000` (15 minutes)
  
- **`rateLimitMax`** (optional): Maximum requests per window
  - Default: `100`

---

## Validation

### Startup Validation

Configuration is validated when the module is first imported:

```typescript
import { config } from '@/lib/config';
// If validation fails, an error is thrown here
```

### Validation Errors

If validation fails, you'll get a clear error message:

```
Configuration validation failed:
  - mongodbUri: Required
  - nextAuthSecret: String must contain at least 32 character(s)
  - tokenEncryptionKey: Required

Please check your environment variables in .env.local
```

### Special Validation

The encryption key is validated separately to ensure it's exactly 32 bytes:

```typescript
import { validateEncryptionKey } from '@/lib/config';

// This is called automatically in crypto.ts
validateEncryptionKey();  // Throws if invalid
```

---

## Type Safety

Full TypeScript support with autocomplete:

```typescript
import { config, Config } from '@/lib/config';

// Autocomplete works!
config.mongodbUri
config.nextAuthSecret
config.fastTrakApi

// Type checking
const myConfig: Config = {
  mongodbUri: '...',
  // TypeScript will error if missing required fields
};
```

---

## Environment Files

### Development (.env.local)
```bash
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/rtr
NEXTAUTH_SECRET=development-secret-key-at-least-32-characters-long
NEXTAUTH_URL=http://localhost:3000
FASTTRAK_API=http://localhost:3001
TOKEN_ENCRYPTION_KEY=development-key-32-bytes-base64-encoded==
LOG_LEVEL=debug
```

### Production (.env.production)
```bash
NODE_ENV=production
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/rtr
NEXTAUTH_SECRET=production-secret-key-min-32-chars-from-secure-source
NEXTAUTH_URL=https://yourdomain.com
FASTTRAK_API=https://fasttrak-api.yourdomain.com
TOKEN_ENCRYPTION_KEY=production-key-32-bytes-base64-encoded==
LOG_LEVEL=info
SESSION_MAX_AGE=7200
```

---

## Helper Functions

### Environment Checks
```typescript
import { isProduction, isDevelopment, isTest } from '@/lib/config';

if (isProduction) {
  // Production code
}

if (isDevelopment) {
  // Development code
}

if (isTest) {
  // Test code
}
```

### Encryption Key Validation
```typescript
import { validateEncryptionKey } from '@/lib/config';

try {
  validateEncryptionKey();
  console.log('Encryption key is valid');
} catch (error) {
  console.error('Invalid encryption key:', error.message);
}
```

---

## Best Practices

### 1. **Never Access process.env Directly**
```typescript
// ❌ Bad
const uri = process.env.MONGODB_URI;

// ✅ Good
import { config } from '@/lib/config';
const uri = config.mongodbUri;
```

### 2. **Use Helper Functions**
```typescript
// ❌ Bad
if (process.env.NODE_ENV === 'production') { }

// ✅ Good
import { isProduction } from '@/lib/config';
if (isProduction) { }
```

### 3. **Validate Secrets at Startup**
Configuration validation happens automatically, but you can add additional checks:

```typescript
// In your startup code
import { config, validateEncryptionKey } from '@/lib/config';

validateEncryptionKey();  // Ensures key length is correct
```

### 4. **Document Required Variables**
Add a `.env.example` file to your repository:

```bash
# .env.example
MONGODB_URI=
NEXTAUTH_SECRET=
TOKEN_ENCRYPTION_KEY=
```

### 5. **Never Commit Secrets**
Add to `.gitignore`:
```
.env
.env.local
.env.*.local
```

---

## Generating Secrets

### NextAuth Secret
```bash
openssl rand -base64 32
```

### Encryption Key
```bash
# Generate 32 random bytes and encode to base64
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

---

## Troubleshooting

### "Configuration validation failed"
- Check that all required variables are set
- Verify URLs are valid
- Ensure secrets meet minimum length requirements

### "TOKEN_ENCRYPTION_KEY must be exactly 32 bytes"
- The key must decode to exactly 32 bytes from base64
- Generate a new key using the command above

### "NEXTAUTH_SECRET must be at least 32 characters"
- Use `openssl rand -base64 32` to generate a secure secret
- Or any random string of at least 32 characters

---

## Files Updated

All files now use centralized config:
- ✅ `lib/db.ts` - MongoDB URI
- ✅ `lib/crypto.ts` - Encryption key
- ✅ `lib/fasttrak.ts` - FastTrak API URL
- ✅ `lib/logger/logger.ts` - Log level, node env
- ✅ `lib/auth/constants.ts` - Session config
- ✅ `lib/middleware/error-handler.ts` - Production checks
- ✅ `lib/auth/providers.ts` - Development checks
- ✅ `lib/auth/callbacks.ts` - Development checks
- ✅ `lib/services/user-registration-service.ts` - Development checks
- ✅ `app/api/auth/[...nextauth]/route.ts` - NextAuth secret
- ✅ `app/api/fasttrak/[...path]/route.ts` - FastTrak API, NextAuth secret

---

## Summary

The centralized configuration system provides:
✅ **Type safety** - Full TypeScript support  
✅ **Validation** - Catches errors early with clear messages  
✅ **Single source of truth** - All config in one place  
✅ **Default values** - Sensible defaults for development  
✅ **Helper functions** - Convenient environment checks  
✅ **Better DX** - Autocomplete and type checking  

No more scattered `process.env` calls or missing environment variable bugs!

