# Logging & Observability Implementation

## Overview

Comprehensive logging and observability system implemented using Winston for structured logging, request ID tracking, and request/response logging.

---

## Features Implemented

### 1. **Structured Logging with Winston**
- JSON formatted logs for production
- Human-readable console logs for development
- Multiple log levels (error, warn, info, debug)
- File-based logging with rotation
- Automatic exception and unhandled rejection logging

### 2. **Request ID Tracking**
- Unique request ID for each HTTP request
- Request ID added to response headers
- Request ID included in all log entries
- Supports request ID from upstream (proxies/load balancers)

### 3. **Request/Response Logging**
- Incoming request logging
- Completed request logging with duration
- Slow request detection
- User context (ID, roles) in logs
- Client IP and user agent tracking

### 4. **Error Handler Integration**
- All errors logged with structured format
- Request context included in error logs
- Different log levels for different error types

---

## File Structure

```
lib/logger/
├── logger.ts          # Winston logger configuration
├── request-id.ts      # Request ID generation and management
├── request-logger.ts  # HTTP request/response logging
├── middleware.ts      # Middleware to wrap route handlers
└── index.ts          # Centralized exports
```

---

## Usage

### Basic Usage in API Routes

```typescript
import { withLoggingAndErrorHandling } from '@/lib/logger';

export const GET = withLoggingAndErrorHandling(async (request: NextRequest) => {
  // Your route logic here
  // Automatic request logging, error handling, and response logging
  return NextResponse.json({ data: 'hello' });
});
```

### Direct Logger Usage

```typescript
import { logger } from '@/lib/logger';

// Log info
logger.info('User created', { userId: '123', username: 'john' });

// Log warning
logger.warn('Slow query detected', { duration: 1500, query: 'SELECT * FROM users' });

// Log error
logger.error('Database connection failed', { error: error.message, stack: error.stack });

// Log with request context
logger.info('Operation completed', {
  requestId: 'abc123',
  userId: 'user-456',
  operation: 'updateUser',
});
```

---

## Log Levels

- **error** (0): Error events that might still allow the app to continue
- **warn** (1): Warning messages (e.g., slow requests, deprecation warnings)
- **info** (2): Informational messages (e.g., request logs, business events)
- **http** (3): HTTP request logging (not currently used)
- **verbose** (4): Verbose information
- **debug** (5): Debug messages
- **silly** (6): Silly/fun messages

### Environment-Based Logging

- **Development**: Console output with colors + file logs
- **Production**: JSON formatted file logs + warn+ to console

Set log level via environment variable:
```bash
LOG_LEVEL=debug npm run dev
```

---

## Request ID Tracking

Every request gets a unique ID that:
- Is included in response headers (`X-Request-ID`)
- Is included in all log entries
- Can be used for distributed tracing
- Can be passed from upstream services

### Example Response Header
```
X-Request-ID: V1StGXR8_Z5jdHi6B-myT
```

---

## Log Files

Logs are written to the `logs/` directory:

- **error.log**: Only error-level logs
- **combined.log**: All logs
- **exceptions.log**: Uncaught exceptions
- **rejections.log**: Unhandled promise rejections

### Log Rotation
- Maximum file size: 5MB per file
- Maximum files: 5 files per log type
- Old files are automatically rotated

---

## Log Entry Format

### Development (Console)
```
14:53:12.345 [info]: Request completed successfully
{
  "requestId": "V1StGXR8_Z5jdHi6B-myT",
  "method": "GET",
  "path": "/api/users",
  "statusCode": 200,
  "duration": 45,
  "userId": "user-123"
}
```

### Production (JSON)
```json
{
  "level": "info",
  "message": "Request completed successfully",
  "requestId": "V1StGXR8_Z5jdHi6B-myT",
  "method": "GET",
  "path": "/api/users",
  "statusCode": 200,
  "duration": 45,
  "userId": "user-123",
  "timestamp": "2024-11-02 14:53:12.345",
  "service": "rtr-auth",
  "environment": "production"
}
```

---

## Middleware Functions

### `withRequestLogging`
Wraps a route handler with:
- Request ID generation
- Incoming request logging
- Completed request logging
- Slow request detection

### `withLoggingAndErrorHandling`
Combines request logging with error handling:
- Everything from `withRequestLogging`
- Automatic error catching and logging
- Error response formatting

**Recommended**: Use this for all API routes.

---

## Request Logging Metadata

Every request log includes:
- **requestId**: Unique request identifier
- **method**: HTTP method (GET, POST, etc.)
- **path**: Request path
- **query**: Query string (if present)
- **statusCode**: HTTP status code
- **duration**: Request duration in milliseconds
- **userAgent**: Client user agent
- **ip**: Client IP address
- **userId**: Authenticated user ID (if available)
- **userRoles**: User roles (if available)

---

## Error Logging

### Operational Errors (Expected)
Logged at **info** level:
- ValidationError
- NotFoundError
- UnauthorizedError
- ForbiddenError
- ConflictError

### Non-Operational Errors (Unexpected)
Logged at **error** level:
- InternalServerError
- BadGatewayError
- Standard Error instances
- Unknown error types

All error logs include:
- Error name, message, stack
- Request context (path, method, requestId)
- HTTP status code

---

## Slow Request Detection

Requests taking longer than 1000ms (1 second) are automatically logged as warnings:

```
[warn]: Slow request detected
{
  "requestId": "abc123",
  "method": "GET",
  "path": "/api/users",
  "duration": 1523,
  "threshold": 1000
}
```

Configure threshold by modifying `logSlowRequest()` call in middleware.

---

## Environment Variables

```bash
# Log level (error, warn, info, verbose, debug, silly)
LOG_LEVEL=info

# Node environment (development, production, test)
NODE_ENV=development
```

---

## Best Practices

### 1. Use Structured Logging
```typescript
// ✅ Good
logger.info('User created', { userId: '123', username: 'john' });

// ❌ Bad
logger.info('User created: 123, john');
```

### 2. Include Request ID in Service Logs
```typescript
// ✅ Good
logger.info('Database query completed', { 
  requestId: getRequestIdFromContext(),
  query: 'SELECT * FROM users',
  duration: 45 
});

// ❌ Bad
logger.info('Database query completed');
```

### 3. Use Appropriate Log Levels
- **error**: Errors that need attention
- **warn**: Warnings that should be monitored
- **info**: Normal operation logs
- **debug**: Debug information (disable in production)

### 4. Don't Log Sensitive Information
```typescript
// ❌ Bad
logger.info('User login', { password: user.password, token: jwt });

// ✅ Good
logger.info('User login', { userId: user.id, username: user.username });
```

---

## Integration with Error Handler

The error handler automatically:
- Extracts request ID from request headers
- Includes request ID in error responses
- Logs errors with full context
- Uses appropriate log levels based on error type

---

## Monitoring & Observability

### What You Can Monitor

1. **Request Patterns**
   - Most frequent endpoints
   - Average response times
   - Error rates by endpoint

2. **Error Tracking**
   - Error frequency by type
   - Error trends over time
   - Most common errors

3. **Performance**
   - Slow request identification
   - Response time percentiles
   - Request duration trends

4. **User Activity**
   - Most active users
   - Failed authentication attempts
   - Role-based access patterns

### Example Queries (if using log aggregation)

```bash
# Count errors by type
grep '"level":"error"' logs/combined.log | jq -r '.error.code' | sort | uniq -c

# Find slow requests
grep '"duration"' logs/combined.log | jq 'select(.duration > 1000)'

# Track request IDs for debugging
grep 'requestId.*V1StGXR8_Z5jdHi6B-myT' logs/combined.log
```

---

## Future Enhancements

Potential improvements:
1. **Log Aggregation**: Integrate with Datadog, CloudWatch, or ELK stack
2. **Metrics Collection**: Track metrics (request rate, error rate, latency)
3. **Distributed Tracing**: Add OpenTelemetry for distributed systems
4. **Alerting**: Set up alerts for critical errors or slow requests
5. **Log Sampling**: Sample debug logs in high-traffic scenarios

---

## Summary

The logging system provides:
✅ **Structured logging** for easy parsing and analysis
✅ **Request tracing** with unique request IDs
✅ **Performance monitoring** with slow request detection
✅ **Error tracking** with context and categorization
✅ **Environment-aware** logging (dev vs production)
✅ **Easy integration** with one-line middleware wrapper

This makes debugging production issues, monitoring system health, and understanding user behavior much easier.

