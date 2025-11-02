# Error Handler Middleware Explained

## Overview

The `error-handler.ts` middleware provides **centralized error handling** for all API routes in the application. It ensures consistent error responses, proper logging, and security best practices.

---

## Why is This Required?

### Problems It Solves

#### 1. **Code Duplication (DRY Principle Violation)**
**Before:**
```typescript
// Every route handler had this duplicated code
export async function GET(request: NextRequest) {
  try {
    // Business logic
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: 'Validation failed' }, { status: 400 });
    }
    if (error.message.includes('Unauthorized')) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    // ... more error handling
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}
```

**After:**
```typescript
export const GET = withErrorHandling(async (request: NextRequest) => {
  // Just business logic - errors handled automatically
  const users = await listUsers();
  return NextResponse.json({ users });
});
```

#### 2. **Inconsistent Error Responses**
Without centralized handling:
- Different routes return different error formats
- Some expose sensitive information
- Hard for frontend to handle errors consistently

#### 3. **Security Issues**
- Stack traces exposed in production
- Internal error messages revealed to clients
- No standardized error codes for client handling

#### 4. **Poor Observability**
- Errors not logged consistently
- Missing context (request path, method, etc.)
- Hard to debug production issues

---

## How It Works

### Architecture Pattern: **Higher-Order Function (HOF)**

```typescript
export function withErrorHandling<T extends unknown[]>(
  handler: (...args: T) => Promise<NextResponse> | NextResponse
): (...args: T) => Promise<NextResponse>
```

This is a **wrapper function** that:
1. Takes your route handler as input
2. Returns a new function that wraps it in try-catch
3. Automatically handles all errors

### Error Handling Flow

```
Request → Route Handler → Error Occurs
                          ↓
                    withErrorHandling catches it
                          ↓
                    errorHandler() processes it
                          ↓
                    Returns consistent error response
```

### Error Processing Steps

The `errorHandler()` function processes errors in **priority order**:

#### 1. **Custom AppErrors** (Lines 31-54)
```typescript
if (error instanceof AppError) {
  // Handle custom business logic errors
  // - ValidationError, NotFoundError, UnauthorizedError, etc.
  // - Returns appropriate HTTP status code
  // - Includes error code for client-side handling
}
```

**Why:** Your application's domain errors (business logic)

#### 2. **Zod Validation Errors** (Lines 57-75)
```typescript
if (error instanceof ZodError) {
  // Transforms Zod errors into user-friendly format
  // Maps field paths to readable errors
}
```

**Why:** Validation is a common operation; needs special formatting

#### 3. **Standard Errors** (Lines 78-110)
```typescript
if (error instanceof Error) {
  // Catches unexpected errors
  // Logs for debugging
  // Hides details in production
}
```

**Why:** Catch-all for unexpected errors (bugs, external API failures, etc.)

#### 4. **Unknown Error Types** (Lines 113-130)
```typescript
// Last resort - handles truly unexpected error types
// (like thrown strings, numbers, etc.)
```

**Why:** Safety net for edge cases

---

## Key Features

### 1. **Consistent Error Response Format**

All errors return this structure:
```json
{
  "error": {
    "message": "Human-readable message",
    "code": "ERROR_CODE",
    "statusCode": 400,
    "details": { /* optional additional context */ }
  }
}
```

**Benefits:**
- Frontend can handle all errors uniformly
- Error codes enable programmatic handling
- Details provide context for debugging

### 2. **Environment-Aware Responses**

```typescript
const isProduction = process.env.NODE_ENV === 'production';
const message = isProduction
  ? 'An unexpected error occurred'  // Generic
  : error.message;                   // Detailed (dev)
```

**Security Best Practice:**
- **Production:** Generic messages (prevents information leakage)
- **Development:** Detailed messages + stack traces (helps debugging)

### 3. **Intelligent Logging**

```typescript
// Only logs non-operational errors in development
if (!error.isOperational && process.env.NODE_ENV === 'development') {
  console.error('[ErrorHandler] Non-operational error:', {
    error,
    path: request.nextUrl.pathname,
    method: request.method,
    stack: error.stack,
  });
}
```

**Logic:**
- **Operational errors** (ValidationError, NotFoundError): Expected, don't log
- **Non-operational errors** (InternalServerError): Unexpected, always log
- Includes request context for debugging

### 4. **Request Context Extraction**

```typescript
const request = args.find(
  (arg): arg is NextRequest => arg instanceof Request
) as NextRequest | undefined;
```

**Why:** Next.js route handlers have variable signatures:
- `GET(request)` 
- `PATCH(request, { params })`
- `DELETE(request, { params })`

The handler intelligently finds the request object.

---

## Best Practices Implemented

### ✅ 1. **Single Responsibility Principle**
- **One job:** Handle errors consistently
- Doesn't mix with business logic

### ✅ 2. **DRY (Don't Repeat Yourself)**
- Error handling code written once
- Reused across all routes

### ✅ 3. **Separation of Concerns**
- Business logic in routes
- Error handling in middleware
- Easy to test independently

### ✅ 4. **Fail-Safe Design**
- Multiple fallback mechanisms
- Handles unknown error types
- Never crashes, always returns a response

### ✅ 5. **Type Safety**
```typescript
export function withErrorHandling<T extends unknown[]>(
  handler: (...args: T) => Promise<NextResponse> | NextResponse
): (...args: T) => Promise<NextResponse>
```
- Preserves TypeScript types
- Maintains handler signature

### ✅ 6. **Security First**
- No stack traces in production
- No internal error details exposed
- Generic messages for unexpected errors

### ✅ 7. **Observability**
- Logs include request context
- Error codes for monitoring
- Development-friendly debugging info

### ✅ 8. **Error Categorization**
- **Operational errors:** Expected (validation, not found, etc.)
- **Non-operational errors:** Unexpected (bugs, system failures)

**Purpose:** Different handling strategies for each type

---

## Usage Examples

### Basic Route Handler
```typescript
import { withErrorHandling } from '@/lib/middleware/error-handler';

export const GET = withErrorHandling(async (request: NextRequest) => {
  await requireAdmin();  // Throws UnauthorizedError or ForbiddenError
  
  const users = await listUsers();  // May throw NotFoundError
  return NextResponse.json({ users });
});
```

### Route with Parameters
```typescript
export const PATCH = withErrorHandling(async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  await requireAdmin();
  
  const { id } = await params;
  const body = await request.json();
  const validatedData = UpdateUserSchema.parse(body);  // May throw ZodError
  
  const user = await updateUser(id, validatedData);  // May throw NotFoundError
  return NextResponse.json({ user });
});
```

### Error Response Examples

**ValidationError (400):**
```json
{
  "error": {
    "message": "Validation failed",
    "code": "VALIDATION_ERROR",
    "statusCode": 400,
    "details": [
      { "path": "email", "message": "Invalid email format", "code": "invalid_string" }
    ]
  }
}
```

**UnauthorizedError (401):**
```json
{
  "error": {
    "message": "Unauthorized: Authentication required",
    "code": "UNAUTHORIZED",
    "statusCode": 401
  }
}
```

**NotFoundError (404):**
```json
{
  "error": {
    "message": "User not found",
    "code": "NOT_FOUND",
    "statusCode": 404,
    "details": { "resource": "User" }
  }
}
```

**InternalServerError (500) - Production:**
```json
{
  "error": {
    "message": "An unexpected error occurred",
    "code": "INTERNAL_ERROR",
    "statusCode": 500
  }
}
```

**InternalServerError (500) - Development:**
```json
{
  "error": {
    "message": "Database connection failed",
    "code": "INTERNAL_ERROR",
    "statusCode": 500,
    "details": {
      "message": "Database connection failed",
      "stack": "Error: Database connection failed\n    at connect..."
    }
  }
}
```

---

## Benefits

### 1. **Developer Experience**
- Write less boilerplate
- Focus on business logic
- Consistent patterns

### 2. **Maintainability**
- Change error handling in one place
- Easy to add new error types
- Clear separation of concerns

### 3. **Reliability**
- Never crashes from unhandled errors
- Always returns valid HTTP response
- Proper error codes for monitoring

### 4. **Security**
- No information leakage
- Production-safe defaults
- Prevents stack trace exposure

### 5. **Client Experience**
- Consistent error format
- Actionable error codes
- User-friendly messages

---

## Common Patterns & Anti-Patterns

### ✅ **DO: Throw Custom Errors**
```typescript
if (!user) {
  throw new NotFoundError('User not found', 'User');
}
```

### ❌ **DON'T: Return Error Responses Manually**
```typescript
// Don't do this - let the error handler do it
if (!user) {
  return NextResponse.json({ error: 'Not found' }, { status: 404 });
}
```

### ✅ **DO: Let Zod Validation Errors Propagate**
```typescript
const data = CreateUserSchema.parse(body);  // Throws ZodError automatically
```

### ❌ **DON'T: Catch and Transform Errors Manually**
```typescript
// Don't do this
try {
  const data = CreateUserSchema.parse(body);
} catch (error) {
  if (error instanceof ZodError) {
    return NextResponse.json({ error: 'Validation failed' }, { status: 400 });
  }
}
```

---

## Testing the Error Handler

### Unit Testing Example
```typescript
describe('errorHandler', () => {
  it('should handle AppError correctly', () => {
    const error = new NotFoundError('User not found');
    const request = new NextRequest(new URL('http://localhost/api/users'));
    const response = errorHandler(error, request);
    
    expect(response.status).toBe(404);
    const json = await response.json();
    expect(json.error.code).toBe('NOT_FOUND');
  });

  it('should hide stack traces in production', () => {
    process.env.NODE_ENV = 'production';
    const error = new Error('Database error');
    const response = errorHandler(error, request);
    const json = await response.json();
    
    expect(json.error.message).toBe('An unexpected error occurred');
    expect(json.error.details).toBeUndefined();
  });
});
```

---

## Future Enhancements

Potential improvements (from architecture document):

1. **Structured Logging**
   - Replace `console.error` with Winston/Pino
   - Send to logging service (Datadog, CloudWatch)

2. **Error Tracking**
   - Integration with Sentry/Rollbar
   - Track error frequency
   - Alert on critical errors

3. **Request ID Tracking**
   - Add request ID to all error logs
   - Enable request tracing across services

4. **Metrics Collection**
   - Count errors by type
   - Track error rates
   - Monitor system health

---

## Summary

The error handler middleware is **essential infrastructure** that provides:

1. ✅ **Consistency** - All errors handled uniformly
2. ✅ **Security** - Production-safe error responses
3. ✅ **Maintainability** - DRY principle, single source of truth
4. ✅ **Developer Experience** - Less boilerplate, more focus on logic
5. ✅ **Observability** - Proper logging and error tracking

It follows enterprise-grade best practices and makes the codebase more robust, secure, and maintainable.

