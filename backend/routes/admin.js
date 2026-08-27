const express = require('express');
const User = require('../models/User');
const Match = require('../models/Match');
const { authenticateToken } = require('../middleware/auth');
const { requireAdmin } = require('../middleware/admin');
const { sendBroadcastEmail } = require('../services/emailNotifications');
const { generateWeeklyPredictions, getWeekRange } = require('../jobs/weeklyPredictionsJob');

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

// Send a broadcast email to all active users
const broadcastEmailToUsers = async (req, res) => {
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
    console.error('Broadcast email error:', err);
    res.status(500).json({ error: err.message });
  }
};

router.post('/email-users', authenticateToken, requireAdmin, broadcastEmailToUsers);
router.post('/broadcast-email', authenticateToken, requireAdmin, broadcastEmailToUsers);

router.broadcastEmailToUsers = broadcastEmailToUsers;

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

// Manually generate semi-AI predictions for the current/upcoming week
router.post('/generate-weekly-predictions', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { from, to, overwrite = false } = req.body || {};
    const range = from && to ? { from, to } : getWeekRange();
    const summary = await generateWeeklyPredictions({ ...range, overwrite });

    res.json({
      success: true,
      message: `Generated ${summary.predictionsGenerated} predictions from ${summary.fixturesFound} fixtures`,
      summary
    });
  } catch (err) {
    console.error('Manual weekly prediction generation error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Delete AI-generated matches/predictions for the current/upcoming week
router.delete('/generated-weekly-predictions', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { from, to } = req.query || {};
    const range = from && to ? { from, to } : getWeekRange();
    const start = new Date(`${range.from}T00:00:00`);
    const end = new Date(`${range.to}T23:59:59.999`);

    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      return res.status(400).json({ error: 'Invalid date range' });
    }

    const deleteResult = await Match.deleteMany({
      date: { $gte: start, $lte: end },
      $or: [
        { predictionBatchId: { $exists: true, $ne: '' } },
        { predictionsGeneratedBy: { $exists: true, $ne: '' } },
        { 'predictions.generatedBy': 'semi-ai-weekly-job' }
      ]
    });

    res.json({
      success: true,
      deleted: deleteResult.deletedCount || 0,
      from: range.from,
      to: range.to,
      message: `Deleted ${deleteResult.deletedCount || 0} generated match${deleteResult.deletedCount === 1 ? '' : 'es'} for ${range.from} to ${range.to}`
    });
  } catch (err) {
    console.error('Delete generated weekly predictions error:', err);
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
