/**
 * Base application error class
 * All custom errors should extend this class
 */
export abstract class AppError extends Error {
  abstract statusCode: number;
  abstract isOperational: boolean;
  
  constructor(
    message: string,
    public code?: string,
    public details?: unknown
  ) {
    super(message);
    this.name = this.constructor.name;
    
    // Maintains proper stack trace for where error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
    
    Object.setPrototypeOf(this, AppError.prototype);
  }
  
  /**
   * Convert error to JSON format for API responses
   */
  toJSON() {
    const json: Record<string, unknown> = {
      name: this.name,
      message: this.message,
      code: this.code,
      statusCode: this.statusCode,
    };
    
    if (this.details) {
      json.details = this.details;
    }
    
    return json;
  }
}

