const jwt = require('jsonwebtoken');
const User = require('../models/User');

const authenticateToken = (req, res, next) => {
  // Try to get token from httpOnly cookie first (secure method)
  let token = req.cookies?.token;

  // Fallback to Authorization header for backward compatibility
  if (!token) {
    const authHeader = req.headers['authorization'];
    token = authHeader && authHeader.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      // Clear the invalid cookie
      res.clearCookie('token');
      return res.status(403).json({ error: 'Invalid token' });
    }
    req.user = user;
    next();
  });
};

// Enforce VIP expiry on every authenticated request: if a user's
// vipExpiry date has passed, downgrade them to 'none' immediately.
const enforceVipExpiry = async (req, res, next) => {
  try {
    if (!req.user?.id) return next();

    const user = await User.findById(req.user.id).select('vipTier vipExpiry');
    if (!user) return next();

    if (user.vipTier && user.vipTier !== 'none' && user.vipExpiry && new Date(user.vipExpiry) < new Date()) {
      user.vipTier = 'none';
      user.vipExpiry = null;
      await user.save();
    }

    next();
  } catch (error) {
    next();
  }
};

const requireAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};

module.exports = { authenticateToken, enforceVipExpiry, requireAdmin };
