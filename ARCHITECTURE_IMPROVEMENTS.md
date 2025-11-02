# Architectural Improvements for RTR Authentication POC

This document outlines architectural improvements, design patterns, and best practices that can be implemented to enhance the codebase.

## Table of Contents
1. [Error Handling](#1-error-handling)
2. [Logging & Observability](#2-logging--observability)
3. [Configuration Management](#3-configuration-management)
4. [Data Access Layer](#4-data-access-layer)
5. [API Layer](#5-api-layer)
6. [Testing Infrastructure](#6-testing-infrastructure)
7. [Security Enhancements](#7-security-enhancements)
8. [Type Safety](#8-type-safety)
9. [Caching Layer](#9-caching-layer)
10. [Audit Logging](#10-audit-logging)
11. [Middleware & Interceptors](#11-middleware--interceptors)
12. [Dependency Injection](#12-dependency-injection)
13. [Transaction Management](#13-transaction-management)
14. [API Versioning](#14-api-versioning)
15. [Rate Limiting](#15-rate-limiting)

---

## 1. Error Handling

### Current Issues
- Error handling is duplicated across API routes
- No centralized error handling middleware
- Generic error messages exposed to clients
- Inconsistent error response formats
- No error categorization (client vs server errors)

### Proposed Improvements

#### 1.1. Create Custom Error Classes
```typescript
// lib/errors/app-error.ts
export abstract class AppError extends Error {
  abstract statusCode: number;
  abstract isOperational: boolean;
  
  constructor(message: string, public code?: string) {
    super(message);
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

// lib/errors/client-errors.ts
export class ValidationError extends AppError {
  statusCode = 400;
  isOperational = true;
}

export class UnauthorizedError extends AppError {
  statusCode = 401;
  isOperational = true;
}

export class ForbiddenError extends AppError {
  statusCode = 403;
  isOperational = true;
}

export class NotFoundError extends AppError {
  statusCode = 404;
  isOperational = true;
}

export class ConflictError extends AppError {
  statusCode = 409;
  isOperational = true;
}

// lib/errors/server-errors.ts
export class InternalServerError extends AppError {
  statusCode = 500;
  isOperational = false;
}

export class ExternalServiceError extends AppError {
  statusCode = 502;
  isOperational = false;
  
  constructor(message: string, public service: string) {
    super(message, 'EXTERNAL_SERVICE_ERROR');
  }
}
```

#### 1.2. Global Error Handler Middleware
```typescript
// lib/middleware/error-handler.ts
import { NextRequest, NextResponse } from 'next/server';
import { AppError } from '@/lib/errors/app-error';
import { logger } from '@/lib/logger';

export function errorHandler(error: unknown, request: NextRequest) {
  // Log error
  logger.error('API Error', {
    error,
    path: request.nextUrl.pathname,
    method: request.method,
  });

  // Handle known errors
  if (error instanceof AppError) {
    return NextResponse.json(
      {
        error: {
          message: error.message,
          code: error.code,
          statusCode: error.statusCode,
        },
      },
      { status: error.statusCode }
    );
  }

  // Handle Zod validation errors
  if (error instanceof ZodError) {
    return NextResponse.json(
      {
        error: {
          message: 'Validation failed',
          code: 'VALIDATION_ERROR',
          statusCode: 400,
          details: error.errors,
        },
      },
      { status: 400 }
    );
  }

  // Handle unknown errors (don't expose internal details)
  return NextResponse.json(
    {
      error: {
        message: process.env.NODE_ENV === 'production' 
          ? 'An unexpected error occurred' 
          : (error instanceof Error ? error.message : 'Unknown error'),
        code: 'INTERNAL_ERROR',
        statusCode: 500,
      },
    },
    { status: 500 }
  );
}

// Higher-order function to wrap API routes
export function withErrorHandling(
  handler: (req: NextRequest, context: any) => Promise<NextResponse>
) {
  return async (req: NextRequest, context: any) => {
    try {
      return await handler(req, context);
    } catch (error) {
      return errorHandler(error, req);
    }
  };
}
```

#### 1.3. Usage in API Routes
```typescript
// Before
export async function GET(request: NextRequest) {
  try {
    // ... logic
  } catch (error) {
    // Duplicated error handling
  }
}

// After
export const GET = withErrorHandling(async (request: NextRequest) => {
  await requireAdmin();
  const result = await listUsers(validatedQuery);
  return createSuccessResponse(result);
});
```

---

## 2. Logging & Observability

### Current Issues
- Uses `console.log` and `console.error`
- No structured logging
- No log levels
- No request tracing
- No performance metrics
- No distributed tracing

### Proposed Improvements

#### 2.1. Structured Logging Service
```typescript
// lib/logger/index.ts
import winston from 'winston';

const logLevel = process.env.LOG_LEVEL || 'info';
const nodeEnv = process.env.NODE_ENV || 'development';

const logger = winston.createLogger({
  level: logLevel,
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'rtr-auth' },
  transports: [
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' }),
  ],
});

if (nodeEnv !== 'production') {
  logger.add(
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      ),
    })
  );
}

export { logger };

// lib/logger/request-logger.ts
export function logRequest(req: NextRequest, duration: number, status: number) {
  logger.info('HTTP Request', {
    method: req.method,
    path: req.nextUrl.pathname,
    status,
    duration,
    userAgent: req.headers.get('user-agent'),
  });
}
```

#### 2.2. Add Request ID Tracking
```typescript
// lib/middleware/request-id.ts
import { nanoid } from 'nanoid';
import { NextRequest, NextResponse } from 'next/server';

export function addRequestId(req: NextRequest, res: NextResponse) {
  const requestId = nanoid();
  res.headers.set('X-Request-ID', requestId);
  return requestId;
}
```

---

## 3. Configuration Management

### Current Issues
- Environment variables accessed directly throughout codebase
- No validation of environment variables
- No default values in one place
- No type safety for configuration

### Proposed Improvements

#### 3.1. Configuration Service
```typescript
// lib/config/index.ts
import { z } from 'zod';

const configSchema = z.object({
  nodeEnv: z.enum(['development', 'production', 'test']).default('development'),
  
  // Database
  mongodbUri: z.string().url(),
  
  // NextAuth
  nextAuthSecret: z.string().min(32),
  nextAuthUrl: z.string().url(),
  
  // FastTrak API
  fastTrakApi: z.string().url(),
  
  // Encryption
  tokenEncryptionKey: z.string().min(32),
  
  // Logging
  logLevel: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
  
  // Security
  sessionMaxAge: z.number().default(3600),
  tokenRefreshBuffer: z.number().default(10000),
  
  // Rate Limiting
  rateLimitEnabled: z.boolean().default(true),
  rateLimitWindow: z.number().default(15 * 60 * 1000), // 15 minutes
  rateLimitMax: z.number().default(100),
});

function loadConfig() {
  const rawConfig = {
    nodeEnv: process.env.NODE_ENV,
    mongodbUri: process.env.MONGODB_URI,
    nextAuthSecret: process.env.NEXTAUTH_SECRET,
    nextAuthUrl: process.env.NEXTAUTH_URL,
    fastTrakApi: process.env.FASTTRAK_API,
    tokenEncryptionKey: process.env.TOKEN_ENCRYPTION_KEY,
    logLevel: process.env.LOG_LEVEL,
    sessionMaxAge: parseInt(process.env.SESSION_MAX_AGE || '3600'),
    tokenRefreshBuffer: parseInt(process.env.TOKEN_REFRESH_BUFFER_MS || '10000'),
    rateLimitEnabled: process.env.RATE_LIMIT_ENABLED !== 'false',
    rateLimitWindow: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'),
    rateLimitMax: parseInt(process.env.RATE_LIMIT_MAX || '100'),
  };

  return configSchema.parse(rawConfig);
}

export const config = loadConfig();
export type Config = z.infer<typeof configSchema>;
```

#### 3.2. Usage
```typescript
// Before
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/rtr';

// After
import { config } from '@/lib/config';
await mongoose.connect(config.mongodbUri);
```

---

## 4. Data Access Layer

### Current Issues
- Direct Mongoose usage in services
- No repository pattern
- Database connection logic mixed with business logic
- No abstraction for data persistence

### Proposed Improvements

#### 4.1. Repository Pattern
```typescript
// lib/repositories/user.repository.ts
import { RtrUser, IRtrUser, Role } from '@/lib/models/User';
import { connectToDB } from '@/lib/db';

export interface IUserRepository {
  findById(id: string): Promise<IRtrUser | null>;
  findByFasttrakId(fasttrakId: string): Promise<IRtrUser | null>;
  findByUsername(username: string): Promise<IRtrUser | null>;
  create(data: Partial<IRtrUser>): Promise<IRtrUser>;
  update(id: string, data: Partial<IRtrUser>): Promise<IRtrUser | null>;
  delete(id: string): Promise<boolean>;
  findMany(query: UserQuery): Promise<{ users: IRtrUser[]; total: number }>;
}

export class UserRepository implements IUserRepository {
  async findById(id: string): Promise<IRtrUser | null> {
    await connectToDB();
    return await RtrUser.findById(id).lean();
  }

  async findMany(query: UserQuery) {
    await connectToDB();
    const { filter, sort, skip, limit } = this.buildQuery(query);
    
    const [users, total] = await Promise.all([
      RtrUser.find(filter).sort(sort).skip(skip).limit(limit).lean(),
      RtrUser.countDocuments(filter),
    ]);

    return { users, total };
  }

  private buildQuery(query: UserQuery) {
    // Query building logic
  }
}

// Singleton instance
export const userRepository = new UserRepository();
```

#### 4.2. Unit of Work Pattern (for transactions)
```typescript
// lib/repositories/unit-of-work.ts
export class UnitOfWork {
  constructor(private connection: mongoose.Connection) {}

  async startTransaction() {
    const session = await this.connection.startSession();
    session.startTransaction();
    return session;
  }

  async commit(session: mongoose.ClientSession) {
    await session.commitTransaction();
    session.endSession();
  }

  async rollback(session: mongoose.ClientSession) {
    await session.abortTransaction();
    session.endSession();
  }
}
```

---

## 5. API Layer

### Current Issues
- Duplicated error handling in each route
- No request validation middleware
- No response formatting middleware
- No API versioning

### Proposed Improvements

#### 5.1. API Route Builder
```typescript
// lib/api/route-builder.ts
import { NextRequest, NextResponse } from 'next/server';
import { ZodSchema } from 'zod';
import { withErrorHandling } from '@/lib/middleware/error-handler';
import { requireAuth, requireAdmin } from '@/lib/auth/guards';

interface RouteOptions {
  requireAuth?: boolean;
  requireAdmin?: boolean;
  validateBody?: ZodSchema;
  validateQuery?: ZodSchema;
}

export function createApiRoute(
  handler: (req: NextRequest, context: any) => Promise<NextResponse>,
  options: RouteOptions = {}
) {
  return withErrorHandling(async (req: NextRequest, context: any) => {
    // Authentication
    if (options.requireAuth || options.requireAdmin) {
      if (options.requireAdmin) {
        await requireAdmin();
      } else {
        await requireAuth();
      }
    }

    // Validation
    let body, query;
    if (options.validateBody) {
      body = await req.json();
      body = options.validateBody.parse(body);
    }
    if (options.validateQuery) {
      query = Object.fromEntries(req.nextUrl.searchParams);
      query = options.validateQuery.parse(query);
    }

    return handler(req, context, { body, query });
  });
}

// Usage
export const POST = createApiRoute(
  async (req, _, { body }) => {
    const newUser = await registerUser(body, await getCurrentUserId());
    return createSuccessResponse({ user: newUser }, 201);
  },
  {
    requireAdmin: true,
    validateBody: CreateUserSchema,
  }
);
```

#### 5.2. API Versioning
```typescript
// app/api/v1/admin/users/route.ts
// app/api/v2/admin/users/route.ts (future version)
```

---

## 6. Testing Infrastructure

### Current Issues
- No tests present
- No test utilities
- No mocking helpers

### Proposed Improvements

#### 6.1. Test Setup
```typescript
// __tests__/setup.ts
import { config } from '@/lib/config';

// Mock environment
process.env.NODE_ENV = 'test';
process.env.MONGODB_URI = 'mongodb://localhost:27017/rtr-test';
process.env.NEXTAUTH_SECRET = 'test-secret-key-at-least-32-characters-long';
process.env.TOKEN_ENCRYPTION_KEY = 'test-encryption-key-32-characters!!';

// Test utilities
export async function createTestUser(overrides = {}) {
  // Create test user
}

export async function cleanupTestData() {
  // Clean up test data
}
```

#### 6.2. Integration Tests
```typescript
// __tests__/api/admin/users.test.ts
import { POST } from '@/app/api/admin/users/route';
import { createTestUser } from '../setup';

describe('POST /api/admin/users', () => {
  it('should create a new user', async () => {
    // Test implementation
  });
});
```

---

## 7. Security Enhancements

### Current Issues
- No rate limiting
- No CSRF protection for state-changing operations
- No input sanitization beyond Zod validation
- No SQL injection protection (though using Mongoose helps)

### Proposed Improvements

#### 7.1. Rate Limiting
```typescript
// lib/middleware/rate-limit.ts
import { LRUCache } from 'lru-cache';

const rateLimitCache = new LRUCache<string, number[]>({
  max: 500,
  ttl: 15 * 60 * 1000, // 15 minutes
});

export function rateLimit(options: {
  interval: number;
  uniqueTokenPerInterval: number;
}) {
  return async (req: NextRequest): Promise<boolean> => {
    const identifier = getIdentifier(req);
    const tokenCount = rateLimitCache.get(identifier) || [];

    if (tokenCount.length >= options.uniqueTokenPerInterval) {
      return false;
    }

    tokenCount.push(Date.now());
    rateLimitCache.set(identifier, tokenCount);
    return true;
  };
}

function getIdentifier(req: NextRequest): string {
  // Use IP address or user ID
  return req.headers.get('x-forwarded-for') || 'unknown';
}
```

#### 7.2. Input Sanitization
```typescript
// lib/utils/sanitize.ts
import DOMPurify from 'isomorphic-dompurify';

export function sanitizeInput(input: string): string {
  return DOMPurify.sanitize(input, { ALLOWED_TAGS: [] });
}

export function sanitizeObject<T>(obj: T): T {
  // Recursively sanitize object strings
}
```

---

## 8. Type Safety

### Current Issues
- Type assertions (`as unknown as IRtrUser`)
- `any` types in some places
- Loose typing in error handling

### Proposed Improvements

#### 8.1. Better Type Guards
```typescript
// lib/utils/type-guards.ts
import { Types } from 'mongoose';
import { IRtrUser } from '@/lib/models/User';

export function isIRtrUser(obj: unknown): obj is IRtrUser {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'fasttrakId' in obj &&
    'username' in obj &&
    'roles' in obj
  );
}

export function isValidObjectId(id: string): boolean {
  return Types.ObjectId.isValid(id);
}
```

#### 8.2. Remove Type Assertions
```typescript
// Before
const user = userDoc as unknown as IRtrUser & { _id: { toString: () => string } };

// After
if (!isIRtrUser(userDoc)) {
  throw new Error('Invalid user data');
}
const user = userDoc;
```

---

## 9. Caching Layer

### Current Issues
- No caching for frequently accessed data
- Every request hits database
- No cache invalidation strategy

### Proposed Improvements

#### 9.1. Redis Cache
```typescript
// lib/cache/index.ts
import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL);

export const cache = {
  async get<T>(key: string): Promise<T | null> {
    const value = await redis.get(key);
    return value ? JSON.parse(value) : null;
  },

  async set(key: string, value: any, ttl?: number): Promise<void> {
    const serialized = JSON.stringify(value);
    if (ttl) {
      await redis.setex(key, ttl, serialized);
    } else {
      await redis.set(key, serialized);
    }
  },

  async invalidate(pattern: string): Promise<void> {
    const keys = await redis.keys(pattern);
    if (keys.length > 0) {
      await redis.del(...keys);
    }
  },
};

// Usage in services
export async function getUserById(id: string) {
  const cacheKey = `user:${id}`;
  const cached = await cache.get(cacheKey);
  if (cached) return cached;

  const user = await userRepository.findById(id);
  if (user) {
    await cache.set(cacheKey, user, 300); // 5 minutes TTL
  }
  return user;
}
```

---

## 10. Audit Logging

### Current Issues
- No audit trail for user operations
- Console.log mentioned but not implemented
- No tracking of who changed what and when

### Proposed Improvements

#### 10.1. Audit Service
```typescript
// lib/services/audit.service.ts
import { AuditLog } from '@/lib/models/AuditLog';

export interface AuditEntry {
  userId: string;
  action: string;
  resource: string;
  resourceId: string;
  performedBy: string;
  changes?: Record<string, { old: any; new: any }>;
  ipAddress?: string;
  userAgent?: string;
}

export class AuditService {
  async log(entry: AuditEntry) {
    await AuditLog.create({
      ...entry,
      timestamp: new Date(),
    });
  }

  async getLogs(query: AuditLogQuery) {
    // Retrieve audit logs
  }
}
```

---

## 11. Middleware & Interceptors

### Current Issues
- Limited middleware usage
- No request/response interceptors
- No request validation pipeline

### Proposed Improvements

#### 11.1. Middleware Pipeline
```typescript
// lib/middleware/pipeline.ts
type Middleware = (req: NextRequest, res: NextResponse, next: () => Promise<void>) => Promise<void>;

export class MiddlewarePipeline {
  private middlewares: Middleware[] = [];

  use(middleware: Middleware) {
    this.middlewares.push(middleware);
    return this;
  }

  async execute(req: NextRequest, res: NextResponse) {
    let index = 0;
    
    const next = async () => {
      if (index < this.middlewares.length) {
        await this.middlewares[index++](req, res, next);
      }
    };

    await next();
    return res;
  }
}

// Usage
const pipeline = new MiddlewarePipeline()
  .use(addRequestId)
  .use(logRequest)
  .use(rateLimit)
  .use(validateAuth);
```

---

## 12. Dependency Injection

### Current Issues
- Hard-coded dependencies
- Difficult to test
- Tight coupling

### Proposed Improvements

#### 12.1. Service Container
```typescript
// lib/container.ts
class Container {
  private services = new Map<string, any>();

  register<T>(key: string, factory: () => T) {
    this.services.set(key, factory);
  }

  resolve<T>(key: string): T {
    const factory = this.services.get(key);
    if (!factory) throw new Error(`Service ${key} not found`);
    return factory();
  }
}

export const container = new Container();

// Registration
container.register('userRepository', () => new UserRepository());
container.register('userService', () => new UserService(
  container.resolve('userRepository')
));
```

---

## 13. Transaction Management

### Current Issues
- No transaction support for multi-step operations
- If FastTrak registration succeeds but MongoDB fails, inconsistent state

### Proposed Improvements

#### 13.1. Transaction Wrapper
```typescript
// lib/db/transaction.ts
export async function withTransaction<T>(
  callback: (session: mongoose.ClientSession) => Promise<T>
): Promise<T> {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const result = await callback(session);
    await session.commitTransaction();
    return result;
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
}

// Usage
await withTransaction(async (session) => {
  const user = await RtrUser.create([userData], { session });
  await AuditLog.create([auditEntry], { session });
});
```

---

## 14. API Versioning

### Current Issues
- No versioning strategy
- Breaking changes would affect all clients

### Proposed Improvements

```typescript
// app/api/v1/admin/users/route.ts
// app/api/v2/admin/users/route.ts

// Middleware to handle versioning
export function withVersioning(handler: Handler) {
  return async (req: NextRequest) => {
    const version = req.nextUrl.pathname.split('/')[2]; // Extract v1, v2, etc.
    // Version-specific logic
    return handler(req);
  };
}
```

---

## 15. Rate Limiting

### Current Issues
- No rate limiting implemented
- Vulnerable to abuse

### Proposed Improvements

See Section 7.1 for rate limiting implementation.

---

## Priority Ranking

### High Priority (Immediate)
1. ✅ Error Handling (Section 1)
2. ✅ Logging & Observability (Section 2)
3. ✅ Configuration Management (Section 3)
4. ✅ Security Enhancements (Section 7)

### Medium Priority (Next Sprint)
5. ⚠️ Data Access Layer (Section 4)
6. ⚠️ API Layer Improvements (Section 5)
7. ⚠️ Testing Infrastructure (Section 6)
8. ⚠️ Type Safety (Section 8)

### Low Priority (Future)
9. 🔵 Caching Layer (Section 9)
10. 🔵 Audit Logging (Section 10)
11. 🔵 Middleware Pipeline (Section 11)
12. 🔵 Dependency Injection (Section 12)
13. 🔵 Transaction Management (Section 13)
14. 🔵 API Versioning (Section 14)

---

## Migration Strategy

1. **Phase 1**: Implement error handling and logging (foundation)
2. **Phase 2**: Refactor configuration and security
3. **Phase 3**: Add repository pattern and improve data access
4. **Phase 4**: Enhance API layer with middleware
5. **Phase 5**: Add caching and audit logging
6. **Phase 6**: Advanced features (DI, transactions, versioning)

---

## Notes

- All improvements should be implemented incrementally
- Maintain backward compatibility during migrations
- Write tests before refactoring
- Document breaking changes
- Consider performance implications

