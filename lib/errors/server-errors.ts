import { AppError } from './app-error';

/**
 * Internal server error - 500
 * Thrown for unexpected server errors
 */
export class InternalServerError extends AppError {
  statusCode = 500;
  isOperational = false;
  
  constructor(message: string = 'An unexpected error occurred') {
    super(message, 'INTERNAL_SERVER_ERROR');
  }
}

/**
 * Bad gateway error - 502
 * Thrown when external service (e.g., FastTrak API) fails
 */
export class BadGatewayError extends AppError {
  statusCode = 502;
  isOperational = false;
  
  constructor(
    message: string = 'External service unavailable',
    public service?: string
  ) {
    super(message, 'BAD_GATEWAY', service ? { service } : undefined);
  }
}

/**
 * Service unavailable error - 503
 * Thrown when service is temporarily unavailable
 */
export class ServiceUnavailableError extends AppError {
  statusCode = 503;
  isOperational = false;
  
  constructor(message: string = 'Service temporarily unavailable') {
    super(message, 'SERVICE_UNAVAILABLE');
  }
}

