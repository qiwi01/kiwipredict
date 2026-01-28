const express = require('express');
const User = require('../models/User');
const { authenticateToken } = require('../middleware/auth');
const { requireAdmin } = require('../middleware/admin');

const router = express.Router();

// Get all users
router.get('/users', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const users = await User.find({}).select('-password').sort({ createdAt: -1 });
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update user
router.put('/users/:userId', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { userId } = req.params;
    const { role, isActive } = req.body;

    const user = await User.findByIdAndUpdate(
      userId,
      { role, isActive },
      { new: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete user
router.delete('/users/:userId', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { userId } = req.params;
    await User.findByIdAndDelete(userId);
    res.json({ message: 'User deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get admin statistics
router.get('/stats', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const activeUsers = await User.countDocuments({ isActive: true });
    const adminUsers = await User.countDocuments({ role: 'admin' });

    // Get outcome statistics from Match model
    const matches = await require('../models/Match').find({});
    let totalOutcomes = 0;
    let correctOutcomes = 0;
    let lossOutcomes = 0;

    matches.forEach(match => {
      if (match.outcomes && match.outcomes.length > 0) {
        match.outcomes.forEach(outcome => {
          if (outcome.actualResult) {
            totalOutcomes++;
            if (outcome.actualResult === 'win') {
              correctOutcomes++;
            } else if (outcome.actualResult === 'loss') {
              lossOutcomes++;
            }
          }
        });
      }
    });

    res.json({
      totalUsers,
      activeUsers,
      adminUsers,
      totalOutcomes,
      correctOutcomes,
      lossOutcomes,
      totalBets: 0, // TODO: implement when bets are added
      totalStaked: 0, // TODO: implement when bets are added
      totalProfit: 0, // TODO: implement when bets are added
      averageROI: 0 // TODO: implement when bets are added
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});



// Get all bets (placeholder for now)
router.get('/bets', authenticateToken, requireAdmin, async (req, res) => {
  try {
    // TODO: implement when Bet model is created
    res.json([]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update bet result (placeholder for now)
router.put('/bets/:userId/:betId', authenticateToken, requireAdmin, async (req, res) => {
  try {
    // TODO: implement when Bet model is created
    res.json({ message: 'Bet result updated (placeholder)' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
