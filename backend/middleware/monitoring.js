const { performanceLogger, securityLogger, errorLogger } = require('../utils/logger');
const alertSystem = require('../utils/alerts');

// Request monitoring middleware
const requestMonitoring = (req, res, next) => {
  const startTime = Date.now();
  const originalSend = res.send;
  let responseSent = false;

  // Override res.send to capture response
  res.send = function(data) {
    if (!responseSent) {
      responseSent = true;
      const responseTime = Date.now() - startTime;

      // Log API response
      performanceLogger.apiResponse(
        req.method,
        req.originalUrl,
        res.statusCode,
        responseTime,
        req.user?.id
      );

      // Log slow requests (over 1 second)
      if (responseTime > 1000) {
        performanceLogger.apiResponse(
          req.method,
          req.originalUrl,
          res.statusCode,
          responseTime,
          req.user?.id
        ); // This will log as warning due to slow response
      }
    }
    return originalSend.call(this, data);
  };

  // Log security events
  if (req.method !== 'GET' && req.method !== 'OPTIONS') {
    securityLogger.suspiciousActivity('API_ACCESS', {
      method: req.method,
      url: req.originalUrl,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      userId: req.user?.id
    });
  }

  next();
};

// Security monitoring middleware
const securityMonitoring = (req, res, next) => {
  // Log failed authentication attempts
  if (req.path.includes('/login') || req.path.includes('/register')) {
    const originalJson = res.json;
    res.json = function(data) {
      if (res.statusCode === 400 || res.statusCode === 401 || res.statusCode === 403) {
        securityLogger.authAttempt('FAILED', {
          endpoint: req.path,
          ip: req.ip,
          userAgent: req.get('User-Agent'),
          email: req.body?.email,
          reason: data.error
        });
      } else if (req.path.includes('/login') && res.statusCode === 200) {
        securityLogger.authAttempt('SUCCESS', {
          endpoint: req.path,
          ip: req.ip,
          userId: data.user?.id
        });
      }
      return originalJson.call(this, data);
    };
  }

  // Detect suspicious patterns
  const suspiciousPatterns = [
    /\.\./,  // Directory traversal
    /<script/i,  // XSS attempts
    /union.*select/i,  // SQL injection
    /eval\(/i,  // Code injection
    /base64/i  // Potential encoded attacks
  ];

  const requestData = JSON.stringify({
    url: req.url,
    body: req.body,
    query: req.query,
    headers: req.headers
  });

  for (const pattern of suspiciousPatterns) {
    if (pattern.test(requestData)) {
      securityLogger.securityViolation('SUSPICIOUS_PATTERN', {
        pattern: pattern.toString(),
        url: req.url,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        userId: req.user?.id
      });
      break;
    }
  }

  // Rate limiting violations (this would be enhanced with actual rate limit data)
  if (res.statusCode === 429) {
    securityLogger.securityViolation('RATE_LIMIT_EXCEEDED', {
      url: req.url,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });
  }

  next();
};

// Error monitoring middleware
const errorMonitoring = (err, req, res, next) => {
  errorLogger.appError(err, {
    url: req.url,
    method: req.method,
    ip: req.ip,
    userId: req.user?.id,
    userAgent: req.get('User-Agent'),
    body: req.body,
    query: req.query
  });

  next(err); // Continue to error handler
};

// Health check endpoint
const healthCheck = async (req, res) => {
  const mongoose = require('mongoose');

  const checks = {
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    version: process.version,
    environment: process.env.NODE_ENV || 'development',
    memory: process.memoryUsage(),
    services: {}
  };

  // Database health check
  try {
    await mongoose.connection.db.admin().ping();
    checks.services.database = {
      status: 'healthy',
      responseTime: 'OK'
    };
  } catch (error) {
    checks.services.database = {
      status: 'unhealthy',
      error: error.message
    };
  }

  // External API health checks (basic)
  try {
    const axios = require('axios');
    await axios.get('https://api.sportmonks.com/v3/football', {
      timeout: 5000,
      headers: {
        'Authorization': `Bearer ${process.env.SPORTMONKS_API_KEY || 'test'}`
      }
    });
    checks.services.sportmonks = { status: 'healthy' };
  } catch (error) {
    checks.services.sportmonks = {
      status: 'unhealthy',
      error: 'API check failed'
    };
  }

  const overallStatus = Object.values(checks.services).every(service =>
    service.status === 'healthy'
  ) ? 'healthy' : 'degraded';

  res.status(overallStatus === 'healthy' ? 200 : 503).json({
    status: overallStatus,
    ...checks
  });
};

// Metrics endpoint for monitoring systems
const metrics = (req, res) => {
  const metrics = {
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    cpu: process.cpuUsage(),
    environment: process.env.NODE_ENV || 'development',
    version: process.version,
    nodeVersion: process.version
  };

  res.json(metrics);
};

// Critical system monitoring
const systemMonitor = {
  // Monitor database connections
  async monitorDatabase() {
    const mongoose = require('mongoose');
    try {
      // Check if database is connected
      if (mongoose.connection.readyState !== 1) {
        return; // Skip monitoring if not connected
      }

      const db = mongoose.connection.db;
      if (db) {
        // Simple ping check - most reliable for MongoDB Atlas
        await db.admin().ping();

        // Note: Connection stats monitoring disabled for MongoDB Atlas compatibility
        // In production with dedicated MongoDB instances, you could monitor:
        // - Connection pool size, active connections, wait queue, etc.
      }
    } catch (error) {
      // Only alert on actual connectivity issues
      if (error.message.includes('ECONNREFUSED') ||
          error.message.includes('authentication failed') ||
          error.message.includes('connection timed out') ||
          error.message.includes('ping command failed')) {
        await alertSystem.critical('Database Connectivity Issue', { error: error.message });
      }
      // Silently ignore other monitoring issues
    }
  },

  // Monitor memory usage
  async monitorMemory() {
    const memUsage = process.memoryUsage();
    const memUsageMB = {
      rss: Math.round(memUsage.rss / 1024 / 1024),
      heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024),
      heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024),
      external: Math.round(memUsage.external / 1024 / 1024)
    };

    // Alert if heap usage is over 80%
    const heapUsagePercent = (memUsage.heapUsed / memUsage.heapTotal) * 100;
    if (heapUsagePercent > 80) {
      await alertSystem.warning('High Memory Usage', {
        ...memUsageMB,
        percentage: Math.round(heapUsagePercent)
      });
    }

    // Critical alert if heap usage is over 90%
    if (heapUsagePercent > 90) {
      await alertSystem.critical('Critical Memory Usage', {
        ...memUsageMB,
        percentage: Math.round(heapUsagePercent)
      });
    }
  },

  // Monitor error rates (this would be enhanced with actual error tracking)
  async monitorErrors() {
    // This is a placeholder - in production you'd track error rates over time
    // and alert if error rate exceeds thresholds
  }
};

// Periodic health checks
setInterval(async () => {
  try {
    await systemMonitor.monitorDatabase();
    await systemMonitor.monitorMemory();
    await systemMonitor.monitorErrors();
  } catch (error) {
    console.error('System monitoring error:', error);
  }
}, 5 * 60 * 1000); // Check every 5 minutes

module.exports = {
  requestMonitoring,
  securityMonitoring,
  errorMonitoring,
  healthCheck,
  metrics,
  alertSystem
};
