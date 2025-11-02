import winston from 'winston';
import path from 'path';

/**
 * Logging levels (from most to least severe)
 * error: 0, warn: 1, info: 2, http: 3, verbose: 4, debug: 5, silly: 6
 */

import { config } from '@/lib/config';

const logLevel = config.logLevel;
const nodeEnv = config.nodeEnv;

// Define log format
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.json()
);

// Console format for development (more readable)
const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'HH:mm:ss.SSS' }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    let msg = `${timestamp} [${level}]: ${message}`;
    
    // Add metadata if present
    const metaKeys = Object.keys(meta);
    if (metaKeys.length > 0) {
      // Filter out common keys that are already displayed
      const filteredMeta = Object.fromEntries(
        Object.entries(meta).filter(([key]) => 
          !['timestamp', 'level', 'message', 'service'].includes(key)
        )
      );
      
      if (Object.keys(filteredMeta).length > 0) {
        msg += ` ${JSON.stringify(filteredMeta, null, 2)}`;
      }
    }
    
    return msg;
  })
);

// Create logs directory if it doesn't exist
const logsDir = path.join(process.cwd(), 'logs');

// Create Winston logger instance
export const logger = winston.createLogger({
  level: logLevel,
  format: logFormat,
  defaultMeta: { 
    service: 'rtr-auth',
    environment: nodeEnv,
  },
  transports: [
    // Write all logs with level 'error' and below to error.log
    new winston.transports.File({
      filename: path.join(logsDir, 'error.log'),
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
      format: logFormat,
    }),
    // Write all logs to combined.log
    new winston.transports.File({
      filename: path.join(logsDir, 'combined.log'),
      maxsize: 5242880, // 5MB
      maxFiles: 5,
      format: logFormat,
    }),
  ],
  // Handle exceptions and rejections
  exceptionHandlers: [
    new winston.transports.File({
      filename: path.join(logsDir, 'exceptions.log'),
      format: logFormat,
    }),
  ],
  rejectionHandlers: [
    new winston.transports.File({
      filename: path.join(logsDir, 'rejections.log'),
      format: logFormat,
    }),
  ],
});

// Add console transport for non-production environments
if (nodeEnv !== 'production') {
  logger.add(
    new winston.transports.Console({
      format: consoleFormat,
      level: logLevel,
    })
  );
} else {
  // In production, also log to console (for containerized deployments)
  logger.add(
    new winston.transports.Console({
      format: logFormat,
      level: 'warn', // Only warn and above in production console
    })
  );
}

// Export logger interface
export default logger;
