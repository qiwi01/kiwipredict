const express = require('express');
const { fetchMatchesByDate, fetchMatchesByDateRange, clearFixturesCache, isApiConfigured } = require('../services/footballApi');
const Match = require('../models/Match');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

const router = express.Router();

/**
 * GET /api/fixtures/today
 * Fetch today's available matches from the football API
 * Public route (no auth needed) for initial data fetch, but admin-only for management
 */
router.get('/today', async (req, res) => {
  try {
    const date = req.query.date || new Date().toISOString().split('T')[0];
    console.log(`[Fixtures] Fetching fixtures for date: ${date}`);

    const fixtures = await fetchMatchesByDate(date);

    // Check which fixtures already exist in our database (by team names + date)
    const dateStart = new Date(date);
    dateStart.setHours(0, 0, 0, 0);
    const dateEnd = new Date(date);
    dateEnd.setHours(23, 59, 59, 999);

    const existingMatches = await Match.find({
      date: { $gte: dateStart, $lte: dateEnd }
    }).select('homeTeam awayTeam date');

    // Mark fixtures that are already imported
    const fixturesWithStatus = fixtures.map(fixture => {
      const isImported = existingMatches.some(match => {
        const matchDate = new Date(match.date);
        const fixtureDate = new Date(fixture.utcDate);
        const sameDay = matchDate.toISOString().split('T')[0] === fixtureDate.toISOString().split('T')[0];
        return sameDay &&
               match.homeTeam.toLowerCase() === fixture.homeTeam.toLowerCase() &&
               match.awayTeam.toLowerCase() === fixture.awayTeam.toLowerCase();
      });

      return {
        ...fixture,
        imported: isImported,
        alreadyExists: isImported
      };
    });

    res.json({
      count: fixturesWithStatus.length,
      date,
      fixtures: fixturesWithStatus,
      apiConfigured: isApiConfigured(),
      usingMockData: !isApiConfigured()
    });
  } catch (error) {
    console.error('[Fixtures] Error fetching fixtures:', error);
    res.status(500).json({ error: 'Failed to fetch fixtures', message: error.message });
  }
});

/**
 * GET /api/fixtures/range
 * Fetch fixtures for a date range
 */
router.get('/range', async (req, res) => {
  try {
    const { from, to } = req.query;
    const fromDate = from || new Date().toISOString().split('T')[0];
    
    // Default to 7 days if no 'to' date specified
    const toDate = to || (() => {
      const d = new Date(fromDate);
      d.setDate(d.getDate() + 7);
      return d.toISOString().split('T')[0];
    })();

    console.log(`[Fixtures] Fetching fixtures from ${fromDate} to ${toDate}`);

    const fixtures = await fetchMatchesByDateRange(fromDate, toDate);

    res.json({
      count: fixtures.length,
      from: fromDate,
      to: toDate,
      fixtures,
      apiConfigured: isApiConfigured(),
      usingMockData: !isApiConfigured()
    });
  } catch (error) {
    console.error('[Fixtures] Error fetching fixtures by range:', error);
    res.status(500).json({ error: 'Failed to fetch fixtures', message: error.message });
  }
});

/**
 * POST /api/fixtures/import
 * Import a fixture from the API as a match in our database
 * Admin only - requires authentication and admin role
 */
router.post('/import', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { fixture } = req.body;

    if (!fixture || !fixture.homeTeam || !fixture.awayTeam) {
      return res.status(400).json({ error: 'Invalid fixture data' });
    }

    // Check if this fixture already exists in our database
    const matchDate = new Date(fixture.utcDate);
    const dateStart = new Date(matchDate);
    dateStart.setHours(0, 0, 0, 0);
    const dateEnd = new Date(matchDate);
    dateEnd.setHours(23, 59, 59, 999);

    const existingMatch = await Match.findOne({
      homeTeam: { $regex: new RegExp(`^${fixture.homeTeam.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
      awayTeam: { $regex: new RegExp(`^${fixture.awayTeam.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
      date: { $gte: dateStart, $lte: dateEnd }
    });

    if (existingMatch) {
      return res.status(409).json({
        error: 'This fixture already exists in the database',
        existingMatchId: existingMatch._id
      });
    }

    // Create a new match from the fixture (no predictions yet)
    const newMatch = new Match({
      homeTeam: fixture.homeTeam,
      awayTeam: fixture.awayTeam,
      date: matchDate,
      league: fixture.competition || 'Unknown League',
      predictions: [],
      gameTier: 'none'
    });

    await newMatch.save();

    console.log(`[Fixtures] Imported fixture: ${fixture.homeTeam} vs ${fixture.awayTeam} (${fixture.competition})`);

    res.status(201).json({
      success: true,
      message: `Match "${fixture.homeTeam} vs ${fixture.awayTeam}" imported successfully`,
      match: {
        id: newMatch._id,
        homeTeam: newMatch.homeTeam,
        awayTeam: newMatch.awayTeam,
        date: newMatch.date,
        league: newMatch.league
      }
    });
  } catch (error) {
    console.error('[Fixtures] Error importing fixture:', error);
    res.status(500).json({ error: 'Failed to import fixture', message: error.message });
  }
});

/**
 * POST /api/fixtures/import-batch
 * Import multiple fixtures at once
 * Admin only
 */
router.post('/import-batch', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { fixtures } = req.body;

    if (!fixtures || !Array.isArray(fixtures) || fixtures.length === 0) {
      return res.status(400).json({ error: 'No fixtures provided' });
    }

    const results = {
      imported: 0,
      skipped: 0,
      errors: 0,
      details: []
    };

    for (const fixture of fixtures) {
      try {
        const matchDate = new Date(fixture.utcDate);
        const dateStart = new Date(matchDate);
        dateStart.setHours(0, 0, 0, 0);
        const dateEnd = new Date(matchDate);
        dateEnd.setHours(23, 59, 59, 999);

        // Check if exists
        const existingMatch = await Match.findOne({
          homeTeam: { $regex: new RegExp(`^${fixture.homeTeam.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
          awayTeam: { $regex: new RegExp(`^${fixture.awayTeam.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
          date: { $gte: dateStart, $lte: dateEnd }
        });

        if (existingMatch) {
          results.skipped++;
          results.details.push({
            fixture: `${fixture.homeTeam} vs ${fixture.awayTeam}`,
            status: 'skipped',
            reason: 'Already exists'
          });
          continue;
        }

        // Create match
        const newMatch = new Match({
          homeTeam: fixture.homeTeam,
          awayTeam: fixture.awayTeam,
          date: matchDate,
          league: fixture.competition || 'Unknown League',
          predictions: [],
          gameTier: 'none'
        });

        await newMatch.save();

        results.imported++;
        results.details.push({
          fixture: `${fixture.homeTeam} vs ${fixture.awayTeam}`,
          status: 'imported',
          matchId: newMatch._id
        });
      } catch (err) {
        results.errors++;
        results.details.push({
          fixture: `${fixture.homeTeam} vs ${fixture.awayTeam}`,
          status: 'error',
          error: err.message
        });
      }
    }

    console.log(`[Fixtures] Batch import: ${results.imported} imported, ${results.skipped} skipped, ${results.errors} errors`);

    res.json({
      success: true,
      message: `Imported ${results.imported} matches (${results.skipped} skipped, ${results.errors} errors)`,
      ...results
    });
  } catch (error) {
    console.error('[Fixtures] Error in batch import:', error);
    res.status(500).json({ error: 'Failed to import fixtures', message: error.message });
  }
});

/**
 * POST /api/fixtures/refresh-cache
 * Clear the API fixtures cache
 * Admin only
 */
router.post('/refresh-cache', authenticateToken, requireAdmin, async (req, res) => {
  try {
    clearFixturesCache();
    res.json({ success: true, message: 'Fixtures cache cleared' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to clear cache' });
  }
});

/**
 * GET /api/fixtures/status
 * Check API configuration status
 */
router.get('/status', (req, res) => {
  res.json({
    apiConfigured: isApiConfigured(),
    usingMockData: !isApiConfigured()
  });
});

module.exports = router;