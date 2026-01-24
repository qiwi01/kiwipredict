const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const cookieParser = require('cookie-parser');
require('dotenv').config();

// Import configurations and models
const connectDB = require('./config/database');

// Import routes
const authRoutes = require('./routes/auth');
const matchRoutes = require('./routes/matches');
const adminRoutes = require('./routes/admin');
const outcomeRoutes = require('./routes/outcomes');
const vipRoutes = require('./routes/vip');
const leagueRoutes = require('./routes/leagues');

// Import monitoring middleware
const {
  requestMonitoring,
  securityMonitoring,
  errorMonitoring,
  healthCheck,
  metrics
} = require('./middleware/monitoring');

const app = express();

// Trust proxy for rate limiting (required for hosting platforms like Render)
app.set('trust proxy', 1);

// Connect to database
connectDB();

// Middleware
app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps, Postman, or curl requests)
    if (!origin) return callback(null, true);

    const allowedOrigins = process.env.CORS_ALLOWED_ORIGINS
      ? process.env.CORS_ALLOWED_ORIGINS.split(',')
      : [
          'https://kiwipredict.com',
          'https://www.kiwipredict.com',
          'https://kiwipredict.onrender.com'
        ];

    // Always allow localhost in development
    if (process.env.NODE_ENV !== 'production' && origin && (origin.includes('localhost') || origin.includes('127.0.0.1'))) {
      return callback(null, true);
    }

    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    } else {
      console.log(`CORS blocked origin: ${origin}`);
      console.log(`Allowed origins: ${allowedOrigins.join(', ')}`);
      return callback(new Error(`CORS policy violation: ${origin} not allowed`));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "https://api.sportmonks.com", "https://api.paystack.co"]
    }
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100, // limit each IP to 100 requests per windowMs
  message: {
    error: 'Too many requests from this IP, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Stricter rate limiting for auth routes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 requests per windowMs for auth routes
  message: {
    error: 'Too many authentication attempts, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(limiter);
app.use('/api/auth', authLimiter);

app.use(cookieParser());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Monitoring middleware
app.use(requestMonitoring);
app.use(securityMonitoring);

// Health check and monitoring routes (before auth middleware)
app.get('/health', healthCheck);
app.get('/metrics', metrics);

// Mount routes
app.use('/api/auth', authRoutes);
app.use('/api/matches', matchRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/outcomes', outcomeRoutes);
app.use('/api/vip', vipRoutes);
app.use('/api/leagues', leagueRoutes);

// Legacy routes for backward compatibility
app.use('/api', authRoutes);
app.use('/api', matchRoutes);
app.use('/api', adminRoutes);
app.use('/api', outcomeRoutes);
app.use('/api', vipRoutes);

// Error monitoring middleware
app.use(errorMonitoring);

// Global error handler
app.use((err, req, res, next) => {
  // Don't leak error details in production
  const isDevelopment = process.env.NODE_ENV !== 'production';

  res.status(err.status || 500).json({
    error: isDevelopment ? err.message : 'Internal server error',
    ...(isDevelopment && { stack: err.stack })
  });
});

// 404 handler - Express 5.x compatible
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📱 Frontend: http://localhost:3000`);
  console.log(`🔧 API: http://localhost:${PORT}/api`);
  console.log(`🔒 Security: Helmet, Rate Limiting, CORS enabled`);
  console.log(`🍪 Auth: httpOnly cookies enabled`);
  console.log(`📊 Monitoring: Health check at /health, Metrics at /metrics`);
  console.log(`📝 Logging: Winston logging enabled`);
});
