import { NextRequest, NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { AppError } from '@/lib/errors/app-error';
import { logger } from '@/lib/logger';
import { getOrCreateRequestId, REQUEST_ID_HEADER } from '@/lib/logger/request-id';
import { isProduction } from '@/lib/config';

/**
 * Global error handler middleware
 * Handles all errors and converts them to appropriate HTTP responses
 */

interface ErrorResponse {
  error: {
    message: string;
    code: string;
    statusCode: number;
    details?: unknown;
  };
}

/**
 * Handles errors and converts them to HTTP responses
 * 
 * @param error - The error to handle
 * @param request - The incoming request
 * @returns NextResponse with error details
 */
export function errorHandler(
  error: unknown,
  request: NextRequest
): NextResponse<ErrorResponse> {
  // Get request ID for context
  const requestId = request.headers.get(REQUEST_ID_HEADER) || getOrCreateRequestId(request);

  // Handle known AppError instances
  if (error instanceof AppError) {
    // Log operational errors (but not client errors like validation)
    if (!error.isOperational) {
      logger.error('Non-operational error', {
        requestId,
        error: {
          name: error.name,
          message: error.message,
          code: error.code,
          stack: error.stack,
        },
        path: request.nextUrl.pathname,
        method: request.method,
        statusCode: error.statusCode,
      });
    } else {
      // Log operational errors at info level (expected errors)
      logger.info('Operational error handled', {
        requestId,
        error: {
          name: error.name,
          message: error.message,
          code: error.code,
        },
        path: request.nextUrl.pathname,
        method: request.method,
        statusCode: error.statusCode,
      });
    }

    const errorResponse: ErrorResponse = {
      error: {
        message: error.message,
        code: error.code || 'APP_ERROR',
        statusCode: error.statusCode,
      },
    };

    if (error.details) {
      errorResponse.error.details = error.details;
    }

    const response = NextResponse.json(errorResponse, { status: error.statusCode });
    response.headers.set(REQUEST_ID_HEADER, requestId);
    return response;
  }

  // Handle Zod validation errors
  if (error instanceof ZodError) {
    const details = error.issues.map((err) => ({
      path: err.path.join('.'),
      message: err.message,
      code: err.code,
    }));

    // Log validation errors at info level (expected client errors)
    logger.info('Validation error', {
      requestId,
      path: request.nextUrl.pathname,
      method: request.method,
      validationErrors: details,
    });

    const response = NextResponse.json(
      {
        error: {
          message: 'Validation failed',
          code: 'VALIDATION_ERROR',
          statusCode: 400,
          details,
        },
      },
      { status: 400 }
    );
    response.headers.set(REQUEST_ID_HEADER, requestId);
    return response;
  }

  // Handle standard Error instances
  if (error instanceof Error) {
    // Log all unexpected errors
    logger.error('Unexpected error', {
      requestId,
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack,
      },
      path: request.nextUrl.pathname,
      method: request.method,
    });

    // In production, don't expose error details
    const message = isProduction
      ? 'An unexpected error occurred'
      : error.message;

    const errorResponse: ErrorResponse = {
      error: {
        message,
        code: 'INTERNAL_ERROR',
        statusCode: 500,
      },
    };

    if (!isProduction) {
      errorResponse.error.details = {
        message: error.message,
        stack: error.stack,
      };
    }

    const response = NextResponse.json(errorResponse, { status: 500 });
    response.headers.set(REQUEST_ID_HEADER, requestId);
    return response;
  }

  // Handle unknown error types
  logger.error('Unknown error type', {
    requestId,
    error,
    errorType: typeof error,
    path: request.nextUrl.pathname,
    method: request.method,
  });

  const response = NextResponse.json(
    {
      error: {
        message: 'An unexpected error occurred',
        code: 'UNKNOWN_ERROR',
        statusCode: 500,
      },
    },
    { status: 500 }
  );
  response.headers.set(REQUEST_ID_HEADER, requestId);
  return response;
}

/**
 * Higher-order function to wrap API route handlers with error handling
 * 
 * @param handler - The API route handler function
 * @returns Wrapped handler with automatic error handling
 * 
 * @example
 * ```typescript
 * export const GET = withErrorHandling(async (request: NextRequest) => {
 *   const users = await listUsers();
 *   return NextResponse.json({ users });
 * });
 * ```
 */
export function withErrorHandling<T extends unknown[]>(
  handler: (
    ...args: T
  ) => Promise<NextResponse> | NextResponse
): (...args: T) => Promise<NextResponse> {
  return async (...args: T): Promise<NextResponse> => {
    try {
      const result = await handler(...args);
      return result;
    } catch (error) {
      // Extract NextRequest from args (it's usually the first argument)
      const request = args.find(
        (arg): arg is NextRequest => arg instanceof Request
      ) as NextRequest | undefined;

      if (request) {
        return errorHandler(error, request);
      }

      // Fallback if we can't find a request object
      // This should rarely happen, but provides a safety net
      logger.error('Error without request context', {
        error: error instanceof Error ? {
          name: error.name,
          message: error.message,
          stack: error.stack,
        } : error,
      });
      return NextResponse.json(
        {
          error: {
            message: 'An unexpected error occurred',
            code: 'INTERNAL_ERROR',
            statusCode: 500,
          },
        },
        { status: 500 }
      );
    }
  };
}

