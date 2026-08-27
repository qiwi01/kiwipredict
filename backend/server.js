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
const fixtureRoutes = require('./routes/fixtures');
const siteSettingsRoutes = require('./routes/siteSettings');
const User = require('./models/User');
const { authenticateToken } = require('./middleware/auth');
const { requireAdmin } = require('./middleware/admin');
const { sendBroadcastEmail } = require('./services/emailNotifications');

// Import monitoring middleware
const {
  requestMonitoring,
  securityMonitoring,
  errorMonitoring,
  healthCheck,
  metrics
} = require('./middleware/monitoring');

// Import keep-alive mechanism
const { startKeepAlive, wakeUpHandler } = require('./keepalive');
const { startWeeklyPredictionCron } = require('./jobs/weeklyPredictionsJob');

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
app.get('/wakeup', wakeUpHandler); // Quick wake-up endpoint for cold starts

const directBroadcastEmailToUsers = async (req, res) => {
  try {
    const { subject, message } = req.body;

    if (!subject || !message) {
      return res.status(400).json({ error: 'Subject and message are required' });
    }

    const users = await User.find({ isActive: true, email: { $exists: true, $ne: '' } }).select('email username').lean();
    const result = await sendBroadcastEmail({ users, subject, message });

    if (result.skipped) {
      return res.status(500).json({ error: 'SMTP email is not configured. Check SMTP_HOST, SMTP_USER, and SMTP_PASS.' });
    }

    if (result.failed > 0 && result.sent === 0) {
      return res.status(502).json({ error: `Email failed for all ${result.total || users.length} users. Check SMTP credentials/provider logs.` });
    }

    res.json({
      success: true,
      sent: result.sent,
      failed: result.failed,
      total: result.total,
      message: result.failed > 0
        ? `Email sent to ${result.sent} users. ${result.failed} failed.`
        : `Email sent to ${result.sent} users`
    });
  } catch (err) {
    console.error('Direct broadcast email error:', err);
    res.status(500).json({ error: err.message });
  }
};

// Direct admin email endpoints. Kept outside the admin router so Render exposes
// them unambiguously after deploy, even if old legacy route mounting changes.
app.post('/api/admin/email-users', authenticateToken, requireAdmin, directBroadcastEmailToUsers);
app.post('/api/admin/broadcast-email', authenticateToken, requireAdmin, directBroadcastEmailToUsers);

// Mount routes
app.use('/api/auth', authRoutes);
app.use('/api/matches', matchRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/outcomes', outcomeRoutes);
app.use('/api/vip', vipRoutes);
app.use('/api/leagues', leagueRoutes);
app.use('/api/fixtures', fixtureRoutes);
app.use('/api/site-settings', siteSettingsRoutes);

// Legacy routes for backward compatibility
app.use('/api', authRoutes);
app.use('/api', matchRoutes);
app.use('/api', adminRoutes);
app.use('/api', outcomeRoutes);
app.use('/api', vipRoutes);
app.use('/api', fixtureRoutes);
app.use('/api', siteSettingsRoutes);

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
  
  // Start keep-alive mechanism for Render free tier
  startKeepAlive();
  startWeeklyPredictionCron();
});
