const express = require('express');
const { fetchLiveMatches, fetchMatchesByDate } = require('../services/footballApi');

const router = express.Router();

const LIVE_STATUSES = ['LIVE', 'IN_PLAY', 'PAUSED'];

/**
 * GET /api/livescore
 * Live matches plus today's finished results and upcoming kickoffs.
 * Public route; only football facts are exposed (no locked predictions).
 */
router.get('/', async (req, res) => {
  try {
    const [liveMatches, todaysMatches] = await Promise.all([
      fetchLiveMatches(),
      fetchMatchesByDate()
    ]);

    const liveFromToday = todaysMatches.filter(m => LIVE_STATUSES.includes(m.status));
    const liveIds = new Set(liveMatches.map(m => m.id));
    const allLive = [
      ...liveMatches,
      ...liveFromToday.filter(m => !liveIds.has(m.id))
    ].sort((a, b) => new Date(a.utcDate) - new Date(b.utcDate));

    const finished = todaysMatches
      .filter(m => m.status === 'FINISHED')
      .sort((a, b) => new Date(b.utcDate) - new Date(a.utcDate));

    const scheduled = todaysMatches
      .filter(m => !LIVE_STATUSES.includes(m.status) && m.status !== 'FINISHED')
      .sort((a, b) => new Date(a.utcDate) - new Date(b.utcDate));

    res.json({
      live: allLive,
      finished,
      scheduled,
      count: allLive.length + finished.length + scheduled.length,
      lastUpdated: new Date().toISOString()
    });
  } catch (error) {
    console.error('[LiveScore] Error fetching live scores:', error);
    res.status(500).json({ error: 'Failed to fetch live scores' });
  }
});

module.exports = router;