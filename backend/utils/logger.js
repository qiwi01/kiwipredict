const winston = require('winston');
const path = require('path');

// Define log levels
const logLevels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4
};

// Define log colors
const logColors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'blue'
};

winston.addColors(logColors);

// Create logs directory if it doesn't exist
const logsDir = path.join(__dirname, '../logs');

// Define log format
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.json(),
  winston.format.colorize({ all: true })
);

// Console format for development
const consoleFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.colorize({ all: true }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    let metaStr = Object.keys(meta).length ? `\n${JSON.stringify(meta, null, 2)}` : '';
    return `${timestamp} [${level}]: ${message}${metaStr}`;
  })
);

// Create winston logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  levels: logLevels,
  format: logFormat,
  transports: [
    // Error log file
    new winston.transports.File({
      filename: path.join(logsDir, 'error.log'),
      level: 'error',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json()
      )
    }),

    // Combined log file
    new winston.transports.File({
      filename: path.join(logsDir, 'combined.log'),
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json()
      )
    }),

    // Security events log
    new winston.transports.File({
      filename: path.join(logsDir, 'security.log'),
      level: 'warn',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      )
    })
  ]
});

// Add console transport for development
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: consoleFormat
  }));
}

// Security event logger
const securityLogger = {
  // Log authentication events
  authAttempt: (event, details) => {
    logger.warn('AUTH_ATTEMPT', {
      event,
      ...details,
      category: 'authentication'
    });
  },

  // Log security violations
  securityViolation: (event, details) => {
    logger.error('SECURITY_VIOLATION', {
      event,
      ...details,
      category: 'security'
    });
  },

  // Log suspicious activities
  suspiciousActivity: (event, details) => {
    logger.warn('SUSPICIOUS_ACTIVITY', {
      event,
      ...details,
      category: 'suspicious'
    });
  }
};

// Performance logger
const performanceLogger = {
  // Log API response times
  apiResponse: (method, url, statusCode, responseTime, userId = null) => {
    logger.http('API_RESPONSE', {
      method,
      url,
      statusCode,
      responseTime: `${responseTime}ms`,
      userId,
      category: 'performance'
    });
  },

  // Log database query performance
  dbQuery: (operation, collection, duration, success = true) => {
    const level = success ? 'debug' : 'warn';
    logger.log(level, 'DB_QUERY', {
      operation,
      collection,
      duration: `${duration}ms`,
      success,
      category: 'database'
    });
  }
};

// Error logger
const errorLogger = {
  // Log application errors
  appError: (error, context = {}) => {
    logger.error('APP_ERROR', {
      error: error.message,
      stack: error.stack,
      ...context,
      category: 'application'
    });
  },

  // Log validation errors
  validationError: (errors, context = {}) => {
    logger.warn('VALIDATION_ERROR', {
      errors,
      ...context,
      category: 'validation'
    });
  }
};

module.exports = {
  logger,
  securityLogger,
  performanceLogger,
  errorLogger
};
