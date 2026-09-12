const express = require('express');
const {
  fetchMatchById,
  fetchHeadToHead,
  fetchTeamRecent,
  fetchStandings,
  fetchScorers
} = require('../services/footballApi');

const router = express.Router();

// Parse a fixture id from the request and guard against non-integer input.
const parseFixtureId = (req, res, next) => {
  const fixtureId = parseInt(req.params.fixtureId, 10);
  if (!Number.isInteger(fixtureId) || fixtureId <= 0) {
    return res.status(400).json({ error: 'Invalid fixture id' });
  }
  req.fixtureId = fixtureId;
  next();
};

/**
 * GET /api/matches/:fixtureId
 * Full live match detail: score, minute, lineups, bench, goals, bookings,
 * substitutions, referees, odds and venue.
 * Public route so the live scoreboards and match pages work logged-out too.
 */
router.get('/:fixtureId', parseFixtureId, async (req, res) => {
  try {
    const match = await fetchMatchById(req.fixtureId);
    if (!match) {
      return res.status(404).json({ error: 'Match not found or unavailable from the data provider' });
    }
    res.json(match);
  } catch (err) {
    console.error('[MatchDetails] Error fetching match detail:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/matches/:fixtureId/history
 * Pre-match research bundle: the fixture itself, head-to-head, each team's last
 * 5 finished matches, league standings and top scorers.
 * Public route.
 */
router.get('/:fixtureId/history', parseFixtureId, async (req, res) => {
  try {
    const match = await fetchMatchById(req.fixtureId);
    if (!match) {
      return res.status(404).json({ error: 'Match not found or unavailable from the data provider' });
    }

    const homeTeamId = match.homeTeam?.id ?? null;
    const awayTeamId = match.awayTeam?.id ?? null;
    const competitionCode = match.competition?.code;

    const [head2head, homeRecent, awayRecent, standings, scorers] = await Promise.all([
      fetchHeadToHead(req.fixtureId, 10),
      homeTeamId ? fetchTeamRecent(homeTeamId, 5) : Promise.resolve({ matches: [] }),
      awayTeamId ? fetchTeamRecent(awayTeamId, 5) : Promise.resolve({ matches: [] }),
      competitionCode ? fetchStandings(competitionCode) : Promise.resolve(null),
      competitionCode ? fetchScorers(competitionCode, 10) : Promise.resolve(null)
    ]);

    res.json({
      match,
      head2head: {
        matches: head2head?.matches || [],
        aggregates: head2head?.aggregates || {}
      },
      homeRecent: homeRecent?.matches || [],
      awayRecent: awayRecent?.matches || [],
      standings: standings?.standings || [],
      scorers: scorers?.scorers || []
    });
  } catch (err) {
    console.error('[MatchDetails] Error fetching match history:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;