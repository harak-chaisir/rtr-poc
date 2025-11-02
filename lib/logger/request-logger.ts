import { NextRequest, NextResponse } from 'next/server';
import { logger } from './logger';
import { getOrCreateRequestId, REQUEST_ID_HEADER } from './request-id';

/**
 * Request logging middleware
 * Logs HTTP requests with metadata for observability
 */

interface RequestLogMetadata {
  requestId: string;
  method: string;
  path: string;
  query?: string;
  statusCode?: number;
  duration?: number;
  userAgent?: string | null;
  ip?: string | null;
  userId?: string;
  userRoles?: string[];
  error?: unknown;
}

/**
 * Gets client IP address from request
 * Handles proxies and load balancers
 */
function getClientIp(request: NextRequest): string | null {
  // Check common proxy headers
  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) {
    // x-forwarded-for can contain multiple IPs, take the first one
    return forwardedFor.split(',')[0].trim();
  }

  const realIp = request.headers.get('x-real-ip');
  if (realIp) {
    return realIp;
  }

  // Fallback to connection remote address if available
  return null;
}

/**
 * Logs an incoming HTTP request
 * 
 * @param request - The incoming request
 * @param requestId - Optional request ID (will be generated if not provided)
 */
export function logIncomingRequest(
  request: NextRequest,
  requestId?: string
): string {
  const id = requestId || getOrCreateRequestId(request);
  
  const metadata: RequestLogMetadata = {
    requestId: id,
    method: request.method,
    path: request.nextUrl.pathname,
    query: request.nextUrl.search || undefined,
    userAgent: request.headers.get('user-agent'),
    ip: getClientIp(request),
  };

  logger.info('Incoming request', metadata);
  
  return id;
}

/**
 * Logs a completed HTTP request
 * 
 * @param request - The original request
 * @param response - The response object
 * @param duration - Request duration in milliseconds
 * @param userId - Optional user ID (from session)
 * @param userRoles - Optional user roles
 */
export function logCompletedRequest(
  request: NextRequest,
  response: NextResponse,
  duration: number,
  userId?: string,
  userRoles?: string[]
): void {
  const requestId = request.headers.get(REQUEST_ID_HEADER) || 'unknown';
  const statusCode = response.status;

  const metadata: RequestLogMetadata = {
    requestId,
    method: request.method,
    path: request.nextUrl.pathname,
    query: request.nextUrl.search || undefined,
    statusCode,
    duration,
    userAgent: request.headers.get('user-agent'),
    ip: getClientIp(request),
    userId,
    userRoles,
  };

  // Log level based on status code
  if (statusCode >= 500) {
    logger.error('Request completed with server error', metadata);
  } else if (statusCode >= 400) {
    logger.warn('Request completed with client error', metadata);
  } else {
    logger.info('Request completed successfully', metadata);
  }
}

/**
 * Logs a failed request (before error handler catches it)
 * 
 * @param request - The original request
 * @param error - The error that occurred
 * @param duration - Request duration in milliseconds
 */
export function logFailedRequest(
  request: NextRequest,
  error: unknown,
  duration: number
): void {
  const requestId = request.headers.get(REQUEST_ID_HEADER) || 'unknown';

  const metadata: RequestLogMetadata = {
    requestId,
    method: request.method,
    path: request.nextUrl.pathname,
    query: request.nextUrl.search || undefined,
    duration,
    userAgent: request.headers.get('user-agent'),
    ip: getClientIp(request),
    error: error instanceof Error ? {
      message: error.message,
      name: error.name,
      stack: error.stack,
    } : error,
  };

  logger.error('Request failed', metadata);
}

/**
 * Creates a performance log entry
 * Useful for tracking slow requests
 * 
 * @param request - The original request
 * @param duration - Request duration in milliseconds
 * @param threshold - Threshold in milliseconds (default: 1000ms)
 */
export function logSlowRequest(
  request: NextRequest,
  duration: number,
  threshold: number = 1000
): void {
  if (duration > threshold) {
    const requestId = request.headers.get(REQUEST_ID_HEADER) || 'unknown';
    
    logger.warn('Slow request detected', {
      requestId,
      method: request.method,
      path: request.nextUrl.pathname,
      duration,
      threshold,
    });
  }
}

