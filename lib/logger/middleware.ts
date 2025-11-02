import { NextRequest, NextResponse } from 'next/server';
import { logger } from './logger';
import {
  attachRequestId,
  REQUEST_ID_HEADER,
} from './request-id';
import {
  logIncomingRequest,
  logCompletedRequest,
  logSlowRequest,
} from './request-logger';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

/**
 * Middleware to add request logging and request ID tracking
 * 
 * This middleware should be used to wrap route handlers to automatically:
 * - Generate and attach request IDs
 * - Log incoming requests
 * - Log completed requests with duration
 * - Detect and log slow requests
 */

/**
 * Wraps a route handler with request logging and request ID tracking
 * 
 * @param handler - The route handler function
 * @returns Wrapped handler with logging
 * 
 * @example
 * ```typescript
 * export const GET = withRequestLogging(async (request: NextRequest) => {
 *   return NextResponse.json({ data: 'hello' });
 * });
 * ```
 */
export function withRequestLogging<T extends unknown[]>(
  handler: (...args: T) => Promise<NextResponse> | NextResponse
): (...args: T) => Promise<NextResponse> {
  return async (...args: T): Promise<NextResponse> => {
    const startTime = Date.now();
    const request = args.find(
      (arg): arg is NextRequest => arg instanceof Request
    ) as NextRequest | undefined;

    if (!request) {
      // Fallback if no request found
      return handler(...args);
    }

    // Attach request ID
    const requestId = attachRequestId(request, new NextResponse());
    
    // Log incoming request
    logIncomingRequest(request, requestId);

    try {
      // Execute the handler
      const response = await handler(...args);
      
      // Calculate duration
      const duration = Date.now() - startTime;
      
      // Get user context if available
      let userId: string | undefined;
      let userRoles: string[] | undefined;
      
      try {
        const session = await getServerSession(authOptions);
        if (session?.user) {
          userId = session.user.id;
          userRoles = session.user.roles;
        }
      } catch {
        // Session lookup failed, continue without user context
      }

      // Ensure request ID is in response
      response.headers.set(REQUEST_ID_HEADER, requestId);

      // Log completed request
      logCompletedRequest(request, response, duration, userId, userRoles);
      
      // Log slow requests
      logSlowRequest(request, duration);

      return response;
    } catch (error) {
      const duration = Date.now() - startTime;
      
      // Log failed request
      logger.error('Request handler error', {
        requestId,
        method: request.method,
        path: request.nextUrl.pathname,
        duration,
        error: error instanceof Error ? {
          message: error.message,
          name: error.name,
          stack: error.stack,
        } : error,
      });

      // Re-throw to let error handler catch it
      throw error;
    }
  };
}

/**
 * Combines request logging with error handling
 * Use this for the most complete middleware stack
 * 
 * @param handler - The route handler function
 * @returns Wrapped handler with logging and error handling
 * 
 * @example
 * ```typescript
 * export const GET = withLoggingAndErrorHandling(async (request: NextRequest) => {
 *   const users = await listUsers();
 *   return NextResponse.json({ users });
 * });
 * ```
 */
export function withLoggingAndErrorHandling<T extends unknown[]>(
  handler: (...args: T) => Promise<NextResponse> | NextResponse
): (...args: T) => Promise<NextResponse> {
  // First wrap with request logging
  const loggedHandler = withRequestLogging(handler);
  
  // Then wrap with error handling
  // Import error handler at function call time to avoid circular dependencies
  return async (...args: T): Promise<NextResponse> => {
    try {
      return await loggedHandler(...args);
    } catch (error) {
      // Import error handler dynamically
      const { errorHandler } = await import('../middleware/error-handler');
      const request = args.find(
        (arg): arg is NextRequest => arg instanceof Request
      ) as NextRequest | undefined;
      
      if (request) {
        return errorHandler(error, request);
      }
      
      // Fallback
      logger.error('Error without request context in combined middleware', {
        error: error instanceof Error ? {
          name: error.name,
          message: error.message,
          stack: error.stack,
        } : error,
      });
      
      return NextResponse.json(
        { error: { message: 'An unexpected error occurred', code: 'INTERNAL_ERROR', statusCode: 500 } },
        { status: 500 }
      );
    }
  };
}

