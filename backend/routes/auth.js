const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const validator = require('validator');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const { authenticateToken, enforceVipExpiry } = require('../middleware/auth');
const { sendWelcomeEmail } = require('../services/emailNotifications');

// Validation middleware
const validateRegister = [
  body('username')
    .isLength({ min: 3, max: 30 })
    .withMessage('Username must be between 3 and 30 characters')
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('Username can only contain letters, numbers, and underscores')
    .trim()
    .escape(),
  body('email')
    .isEmail()
    .withMessage('Please provide a valid email')
    .normalizeEmail(),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one lowercase letter, one uppercase letter, and one number')
];

const validateLogin = [
  body('email')
    .isEmail()
    .withMessage('Please provide a valid email')
    .normalizeEmail(),
  body('password')
    .notEmpty()
    .withMessage('Password is required')
];

// Middleware to handle validation errors
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Validation failed',
      details: errors.array()
    });
  }
  next();
};

const router = express.Router();

// Register route
router.post('/register', validateRegister, handleValidationErrors, async (req, res) => {
  try {
    const { username, email, password } = req.body;

    // Check if user exists
    const existingUser = await User.findOne({ $or: [{ email }, { username }] });
    if (existingUser) {
      return res.status(400).json({ error: 'User already exists' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Check if this is the first user (make them admin)
    const userCount = await User.countDocuments();
    const isFirstUser = userCount === 0;

    // Create user
    const user = new User({
      username,
      email,
      password: hashedPassword,
      favoriteTeams: [],
      bets: [],
      role: isFirstUser ? 'admin' : 'user' // First user becomes admin
    });

    await user.save();

    sendWelcomeEmail(user).catch(error => {
      console.error('Failed to queue welcome email:', error.message);
    });

    // Create token
    const token = jwt.sign(
      { id: user._id, username: user.username, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Set httpOnly cookie.
    // Safari ITP strips sameSite:'none' cross-site cookies aggressively,
    // so we use 'lax' and also return the token so the frontend can keep
    // it in localStorage and send it via the Authorization header as a
    // resilient fallback on browsers that block the cookie.
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    res.json({
      user: {
        id: user._id,
        username,
        email,
        favoriteTeams: [],
        role: user.role,
        vipTier: user.vipTier || 'none',
        vipExpiry: user.vipExpiry || null,
        isActive: user.isActive
      },
      token
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Login route
router.post('/login', validateLogin, handleValidationErrors, async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    // Check password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    // Create token
    const token = jwt.sign(
      { id: user._id, username: user.username, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Set httpOnly cookie.
    // Safari ITP aggressively strips sameSite:'none' cross-site cookies,
    // so we use 'lax' (works for top-level navigations like page loads)
    // and also return the token so the frontend can keep it in
    // localStorage and send it via the Authorization header as a
    // resilient fallback on browsers that block the cookie.
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    res.json({
      user: {
        id: user._id,
        username: user.username,
        email,
        favoriteTeams: user.favoriteTeams,
        role: user.role,
        vipTier: user.vipTier || 'none',
        vipExpiry: user.vipExpiry || null,
        isActive: user.isActive
      },
      token
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Profile route
router.get('/profile', authenticateToken, enforceVipExpiry, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// User favorites routes
router.post('/user/favorites', authenticateToken, async (req, res) => {
  try {
    const { teamName } = req.body;
    const user = await User.findById(req.user.id);

    if (!user.favoriteTeams.includes(teamName)) {
      user.favoriteTeams.push(teamName);
      await user.save();
    }

    res.json({ favoriteTeams: user.favoriteTeams });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/user/favorites/:teamName', authenticateToken, async (req, res) => {
  try {
    const { teamName } = req.params;
    const user = await User.findById(req.user.id);

    user.favoriteTeams = user.favoriteTeams.filter(team => team !== teamName);
    await user.save();

    res.json({ favoriteTeams: user.favoriteTeams });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Logout route
router.post('/logout', (req, res) => {
  res.clearCookie('token', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax'
  });
  res.json({ message: 'Logged out successfully' });
});

// Refresh endpoint — returns a fresh token if the current one is still valid,
// so logged-in users stay logged in (Safari-safe even when cookies are blocked).
router.post('/refresh', (req, res) => {
  // Try cookie first, then Authorization header
  let token = req.cookies?.token;
  if (!token) {
    const authHeader = req.headers['authorization'];
    token = authHeader && authHeader.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid token' });
    }

    const refreshedToken = jwt.sign(
      { id: user.id, username: user.username, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.cookie('token', refreshedToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    res.json({ token: refreshedToken, user: user });
  });
});

module.exports = router;
