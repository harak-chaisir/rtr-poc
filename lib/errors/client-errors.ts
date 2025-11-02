import { AppError } from './app-error';

/**
 * Validation error - 400
 * Thrown when request data fails validation
 */
export class ValidationError extends AppError {
  statusCode = 400;
  isOperational = true;
  
  constructor(message: string = 'Validation failed', details?: unknown) {
    super(message, 'VALIDATION_ERROR', details);
  }
}

/**
 * Unauthorized error - 401
 * Thrown when authentication is required but missing or invalid
 */
export class UnauthorizedError extends AppError {
  statusCode = 401;
  isOperational = true;
  
  constructor(message: string = 'Unauthorized: Authentication required') {
    super(message, 'UNAUTHORIZED');
  }
}

/**
 * Forbidden error - 403
 * Thrown when user is authenticated but lacks required permissions
 */
export class ForbiddenError extends AppError {
  statusCode = 403;
  isOperational = true;
  
  constructor(message: string = 'Forbidden: Insufficient permissions') {
    super(message, 'FORBIDDEN');
  }
}

/**
 * Not found error - 404
 * Thrown when requested resource doesn't exist
 */
export class NotFoundError extends AppError {
  statusCode = 404;
  isOperational = true;
  
  constructor(message: string = 'Resource not found', resource?: string) {
    super(message, 'NOT_FOUND', resource ? { resource } : undefined);
  }
}

/**
 * Conflict error - 409
 * Thrown when request conflicts with current state (e.g., duplicate username)
 */
export class ConflictError extends AppError {
  statusCode = 409;
  isOperational = true;
  
  constructor(message: string = 'Resource conflict', details?: unknown) {
    super(message, 'CONFLICT', details);
  }
}

/**
 * Too many requests error - 429
 * Thrown when rate limit is exceeded
 */
export class TooManyRequestsError extends AppError {
  statusCode = 429;
  isOperational = true;
  
  constructor(message: string = 'Too many requests', retryAfter?: number) {
    super(message, 'TOO_MANY_REQUESTS', retryAfter ? { retryAfter } : undefined);
  }
}

